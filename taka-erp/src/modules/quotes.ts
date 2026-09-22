import { getDb } from '../db/client.js';

export interface QuoteLineInput {
  item_id?: string;
  description: string;
  quantity: number;
  unit_price: number;
  discount_percent?: number;
  tax_rate?: number;
}

export interface CreateQuoteInput {
  customer_id: string;
  date?: string;
  expiry_days?: number;
  items: QuoteLineInput[];
  notes?: string;
  terms?: string;
  currency?: string;
}

export interface QuoteRecord {
  id: string;
  quote_number: string;
  customer_id: string;
  customer_name?: string;
  customer_company?: string;
  customer_email?: string;
  customer_trn?: string;
  billing_address?: string;
  date: string;
  expiry_date: string;
  subtotal: number;
  vat_amount: number;
  total_amount: number;
  currency: string;
  status: string;
  notes?: string;
  terms?: string;
  sent_at?: string;
  accepted_at?: string;
  items?: any[];
}

export async function generateQuoteNumber(): Promise<string> {
  const db = getDb();
  const year = new Date().getFullYear();
  const rs = await db.execute({
    sql: `SELECT COUNT(*) as count FROM quotations WHERE quote_number LIKE ?`,
    args: [`TAKA-UAE/${year}/QTN-%`]
  });
  const count = Number(rs.rows[0].count) + 1;
  const seq = String(count).padStart(4, '0');
  return `TAKA-UAE/${year}/QTN-${seq}`;
}

export async function createQuote(input: CreateQuoteInput): Promise<QuoteRecord> {
  const db = getDb();
  const id = `qtn_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const quote_number = await generateQuoteNumber();
  const date = input.date || new Date().toISOString().split('T')[0];
  
  const expiryDateObj = new Date();
  expiryDateObj.setDate(expiryDateObj.getDate() + (input.expiry_days || 30));
  const expiry_date = expiryDateObj.toISOString().split('T')[0];

  let subtotal = 0;
  let vat_amount = 0;

  const processedItems = input.items.map(item => {
    const lineId = `qline_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const discount = item.discount_percent || 0;
    const discountedPrice = item.unit_price * (1 - discount / 100);
    const lineSubtotal = discountedPrice * item.quantity;
    const taxRate = item.tax_rate !== undefined ? item.tax_rate : 0.05;
    const lineTax = lineSubtotal * taxRate;
    const lineTotal = lineSubtotal + lineTax;

    subtotal += lineSubtotal;
    vat_amount += lineTax;

    return {
      id: lineId,
      quotation_id: id,
      item_id: item.item_id || null,
      description: item.description || 'Laboratory Scientific Instrument',
      quantity: item.quantity,
      unit_price: item.unit_price,
      discount_percent: discount,
      tax_rate: taxRate,
      tax_amount: Math.round(lineTax * 100) / 100,
      total: Math.round(lineTotal * 100) / 100
    };
  });

  const total_amount = Math.round((subtotal + vat_amount) * 100) / 100;
  subtotal = Math.round(subtotal * 100) / 100;
  vat_amount = Math.round(vat_amount * 100) / 100;

  const terms = input.terms || `1. Validity: 30 days from date of quotation.
2. Payment Terms: 100% advance or 30 days credit upon approved LPO.
3. Delivery: 4-6 weeks from confirmation of order.
4. Warranty: Standard 12-24 months manufacturer warranty against manufacturing defects.
5. All prices are in AED and subject to 5% UAE VAT.`;

  await db.execute({
    sql: `INSERT INTO quotations (id, quote_number, customer_id, date, expiry_date, subtotal, vat_amount, total_amount, currency, status, notes, terms)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?, ?)`,
    args: [
      id,
      quote_number,
      input.customer_id || null,
      date,
      expiry_date,
      subtotal,
      vat_amount,
      total_amount,
      input.currency || 'AED',
      input.notes || null,
      terms
    ]
  });

  for (const it of processedItems) {
    let validItemId = it.item_id;
    if (validItemId) {
      const chk = await db.execute({ sql: `SELECT id FROM items WHERE id = ?`, args: [validItemId] });
      if (chk.rows.length === 0) validItemId = null;
    }
    await db.execute({
      sql: `INSERT INTO quotation_items (id, quotation_id, item_id, description, quantity, unit_price, discount_percent, tax_rate, tax_amount, total)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        it.id,
        it.quotation_id,
        validItemId,
        it.description,
        it.quantity,
        it.unit_price,
        it.discount_percent,
        it.tax_rate,
        it.tax_amount,
        it.total
      ]
    });
  }

  return await getQuote(id) as QuoteRecord;
}

export async function getQuote(idOrNumber: string): Promise<QuoteRecord | null> {
  const db = getDb();
  const clean = idOrNumber.trim();
  const rs = await db.execute({
    sql: `SELECT q.*, c.name as customer_name, c.company_name as customer_company, c.email as customer_email, c.trn as customer_trn, c.billing_address, c.shipping_address
          FROM quotations q
          LEFT JOIN contacts c ON q.customer_id = c.id
          WHERE q.id = ? OR q.quote_number = ? OR q.quote_number LIKE ?
          ORDER BY q.created_at DESC LIMIT 1`,
    args: [clean, clean, `%${clean}%`]
  });

  if (rs.rows.length === 0) return null;
  const quote = rs.rows[0] as unknown as QuoteRecord;

  const itemRs = await db.execute({
    sql: `SELECT * FROM quotation_items WHERE quotation_id = ?`,
    args: [quote.id]
  });
  quote.items = itemRs.rows as any[];

  return quote;
}

export async function updateQuoteStatus(idOrNumber: string, status: string): Promise<void> {
  const db = getDb();
  let sql = `UPDATE quotations SET status = ?, updated_at = CURRENT_TIMESTAMP`;
  const args: any[] = [status];

  if (status === 'sent') {
    sql += `, sent_at = CURRENT_TIMESTAMP`;
  } else if (status === 'accepted') {
    sql += `, accepted_at = CURRENT_TIMESTAMP`;
  }

  sql += ` WHERE id = ? OR quote_number = ?`;
  args.push(idOrNumber, idOrNumber);

  await db.execute({ sql, args });
}

export async function listQuotes(status?: string, limit = 20): Promise<QuoteRecord[]> {
  const db = getDb();
  let sql = `SELECT q.*, c.company_name as customer_company, c.name as customer_name
             FROM quotations q
             LEFT JOIN contacts c ON q.customer_id = c.id`;
  const args: any[] = [];
  if (status) {
    sql += ` WHERE q.status = ?`;
    args.push(status);
  }
  sql += ` ORDER BY q.created_at DESC LIMIT ?`;
  args.push(limit);

  const rs = await db.execute({ sql, args });
  return rs.rows as unknown as QuoteRecord[];
}
