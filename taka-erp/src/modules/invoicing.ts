import { getDb } from '../db/client.js';
import { getQuote, updateQuoteStatus, type QuoteRecord } from './quotes.js';
import { getSalesOrder } from './orders.js';
import { recordInvoiceLedgerEntry } from './ledger.js';

export interface InvoiceLineInput {
  item_id?: string;
  description: string;
  quantity: number;
  unit_price: number;
  discount_percent?: number;
  vat_rate?: number;
}

export interface CreateInvoiceInput {
  customer_id: string;
  sales_order_id?: string;
  quotation_id?: string;
  date?: string;
  credit_days?: number;
  items: InvoiceLineInput[];
  notes?: string;
}

export interface InvoiceRecord {
  id: string;
  invoice_number: string;
  customer_id: string;
  customer_name?: string;
  customer_company?: string;
  customer_email?: string;
  customer_trn?: string;
  billing_address?: string;
  shipping_address?: string;
  sales_order_id?: string;
  quotation_id?: string;
  date: string;
  due_date: string;
  subtotal: number;
  vat_amount: number;
  total_amount: number;
  paid_amount: number;
  balance_due: number;
  currency: string;
  status: string;
  notes?: string;
  items?: any[];
}

export async function generateInvoiceNumber(): Promise<string> {
  const db = getDb();
  const year = new Date().getFullYear();
  const rs = await db.execute({
    sql: `SELECT COUNT(*) as count FROM invoices WHERE invoice_number LIKE ?`,
    args: [`TK-INV-${year}-%`]
  });
  const count = Number(rs.rows[0].count) + 1;
  const seq = String(count).padStart(4, '0');
  return `TK-INV-${year}-${seq}`;
}

export async function createInvoice(input: CreateInvoiceInput): Promise<InvoiceRecord> {
  const db = getDb();

  // Source quotation integrity: a quotation may only ever be invoiced once.
  let sourceQuote: QuoteRecord | null = null;
  if (input.quotation_id) {
    sourceQuote = await getQuote(input.quotation_id);
    if (!sourceQuote) throw new Error(`Quote ${input.quotation_id} not found.`);
    if (sourceQuote.status === 'invoiced') {
      throw new Error(`Quote ${sourceQuote.quote_number} has already been invoiced.`);
    }
  }

  const id = `inv_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const invoice_number = await generateInvoiceNumber();
  const date = input.date || new Date().toISOString().split('T')[0];

  const dueDateObj = new Date();
  dueDateObj.setDate(dueDateObj.getDate() + (input.credit_days !== undefined ? input.credit_days : 30));
  const due_date = dueDateObj.toISOString().split('T')[0];

  let subtotal = 0;
  let vat_amount = 0;

  const processedItems = input.items.map(item => {
    const lineId = `invline_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const discount = item.discount_percent || 0;
    const discountedPrice = item.unit_price * (1 - discount / 100);
    const lineSubtotal = discountedPrice * item.quantity;
    const vatRate = item.vat_rate !== undefined ? item.vat_rate : 0.05;
    const lineTax = lineSubtotal * vatRate;
    const lineTotal = lineSubtotal + lineTax;

    subtotal += lineSubtotal;
    vat_amount += lineTax;

    return {
      id: lineId,
      invoice_id: id,
      item_id: item.item_id || null,
      description: item.description || 'Laboratory Scientific Instrument',
      quantity: item.quantity,
      unit_price: item.unit_price,
      discount_percent: discount,
      vat_rate: vatRate,
      vat_amount: Math.round(lineTax * 100) / 100,
      total: Math.round(lineTotal * 100) / 100
    };
  });

  const total_amount = Math.round((subtotal + vat_amount) * 100) / 100;
  subtotal = Math.round(subtotal * 100) / 100;
  vat_amount = Math.round(vat_amount * 100) / 100;

  await db.execute({
    sql: `INSERT INTO invoices (id, invoice_number, customer_id, sales_order_id, quotation_id, date, due_date, subtotal, vat_amount, total_amount, paid_amount, balance_due, currency, status, notes)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, 'AED', 'draft', ?)`,
    args: [
      id,
      invoice_number,
      input.customer_id,
      input.sales_order_id || null,
      sourceQuote?.id || null,
      date,
      due_date,
      subtotal,
      vat_amount,
      total_amount,
      total_amount,
      input.notes || null
    ]
  });

  for (const it of processedItems) {
    let validItemId = it.item_id;
    if (validItemId) {
      const chk = await db.execute({ sql: `SELECT id FROM items WHERE id = ?`, args: [validItemId] });
      if (chk.rows.length === 0) validItemId = null;
    }
    await db.execute({
      sql: `INSERT INTO invoice_items (id, invoice_id, item_id, description, quantity, unit_price, discount_percent, vat_rate, vat_amount, total)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        it.id,
        it.invoice_id,
        validItemId,
        it.description,
        it.quantity,
        it.unit_price,
        it.discount_percent,
        it.vat_rate,
        it.vat_amount,
        it.total
      ]
    });
  }

  const invoice = (await getInvoice(id)) as InvoiceRecord;

  // Record in double-entry general ledger
  await recordInvoiceLedgerEntry({
    invoiceId: id,
    invoiceNumber: invoice_number,
    customerName: invoice.customer_company || invoice.customer_name || 'Customer',
    subtotal,
    vatAmount: vat_amount,
    totalAmount: total_amount,
    date
  });

  // Mark the source quotation as invoiced so it can never be invoiced again
  if (sourceQuote) {
    await updateQuoteStatus(sourceQuote.id, 'invoiced');
  }

  return invoice;
}

export async function createInvoiceFromQuote(quoteIdOrNumber: string): Promise<InvoiceRecord> {
  const quote = await getQuote(quoteIdOrNumber);
  if (!quote) throw new Error(`Quote ${quoteIdOrNumber} not found.`);

  const items: InvoiceLineInput[] = (quote.items || []).map(i => ({
    item_id: i.item_id,
    description: i.description,
    quantity: i.quantity,
    unit_price: i.unit_price,
    discount_percent: i.discount_percent,
    vat_rate: i.tax_rate
  }));

  return await createInvoice({
    customer_id: quote.customer_id,
    quotation_id: quote.id,
    items,
    notes: quote.notes
  });
}

export async function getInvoice(idOrNumber: string): Promise<InvoiceRecord | null> {
  const db = getDb();
  const clean = idOrNumber.trim();
  const rs = await db.execute({
    sql: `SELECT inv.*, c.name as customer_name, c.company_name as customer_company, c.email as customer_email, c.trn as customer_trn, c.billing_address, c.shipping_address
          FROM invoices inv
          LEFT JOIN contacts c ON inv.customer_id = c.id
          WHERE inv.id = ? OR inv.invoice_number = ? OR inv.invoice_number LIKE ?
          ORDER BY inv.created_at DESC LIMIT 1`,
    args: [clean, clean, `%${clean}%`]
  });

  if (rs.rows.length === 0) return null;
  const invoice = rs.rows[0] as unknown as InvoiceRecord;

  const itemRs = await db.execute({
    sql: `SELECT * FROM invoice_items WHERE invoice_id = ?`,
    args: [invoice.id]
  });
  invoice.items = itemRs.rows as any[];
  return invoice;
}

export async function listInvoices(status?: string, limit = 20): Promise<InvoiceRecord[]> {
  const db = getDb();
  let sql = `SELECT inv.*, c.company_name as customer_company, c.name as customer_name
             FROM invoices inv
             LEFT JOIN contacts c ON inv.customer_id = c.id`;
  const args: any[] = [];
  if (status) {
    sql += ` WHERE inv.status = ?`;
    args.push(status);
  }
  sql += ` ORDER BY inv.created_at DESC LIMIT ?`;
  args.push(limit);

  const rs = await db.execute({ sql, args });
  return rs.rows as unknown as InvoiceRecord[];
}

export async function updateInvoiceStatus(idOrNumber: string, status: string): Promise<void> {
  const db = getDb();
  const inv = await getInvoice(idOrNumber);
  if (!inv) throw new Error(`Invoice ${idOrNumber} not found.`);
  await db.execute({
    sql: `UPDATE invoices SET status = ?, sent_at = CASE WHEN ? = 'sent' THEN CURRENT_TIMESTAMP ELSE sent_at END WHERE id = ?`,
    args: [status, status, inv.id]
  });
}
