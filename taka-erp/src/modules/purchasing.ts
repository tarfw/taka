import { getDb } from '../db/client.js';
import { recordVendorBillLedgerEntry } from './ledger.js';

export interface POLineInput {
  item_id?: string;
  description: string;
  quantity: number;
  unit_cost: number;
}

export interface CreatePOInput {
  vendor_id: string;
  sales_order_id?: string;
  currency?: string;
  exchange_rate?: number;
  shipping_terms?: string;
  items: POLineInput[];
  notes?: string;
}

export interface PurchaseOrderRecord {
  id: string;
  po_number: string;
  vendor_id: string;
  vendor_name?: string;
  vendor_company?: string;
  vendor_email?: string;
  vendor_trn?: string;
  vendor_address?: string;
  sales_order_id?: string;
  date: string;
  expected_delivery_date?: string;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  currency: string;
  exchange_rate: number;
  shipping_terms: string;
  status: string;
  notes?: string;
  items?: any[];
}

export async function generatePoNumber(): Promise<string> {
  const db = getDb();
  const year = new Date().getFullYear();
  const rs = await db.execute({
    sql: `SELECT COUNT(*) as count FROM purchase_orders WHERE po_number LIKE ?`,
    args: [`TK-PO-${year}-%`]
  });
  const count = Number(rs.rows[0].count) + 1;
  const seq = String(count).padStart(4, '0');
  return `TK-PO-${year}-${seq}`;
}

export async function createPurchaseOrder(input: CreatePOInput): Promise<PurchaseOrderRecord> {
  const db = getDb();
  const id = `po_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const po_number = await generatePoNumber();
  const date = new Date().toISOString().split('T')[0];

  const deliveryDateObj = new Date();
  deliveryDateObj.setDate(deliveryDateObj.getDate() + 28);
  const expected_delivery_date = deliveryDateObj.toISOString().split('T')[0];

  let subtotal = 0;
  const processedItems = input.items.map(item => {
    const lineId = `poline_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const lineTotal = item.unit_cost * item.quantity;
    subtotal += lineTotal;
    return {
      id: lineId,
      purchase_order_id: id,
      item_id: item.item_id || null,
      description: item.description,
      quantity: item.quantity,
      unit_cost: item.unit_cost,
      total: Math.round(lineTotal * 100) / 100
    };
  });

  const total_amount = Math.round(subtotal * 100) / 100;

  await db.execute({
    sql: `INSERT INTO purchase_orders (id, po_number, vendor_id, sales_order_id, date, expected_delivery_date, subtotal, tax_amount, total_amount, currency, exchange_rate, shipping_terms, status, notes)
          VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, 'draft', ?)`,
    args: [
      id,
      po_number,
      input.vendor_id,
      input.sales_order_id || null,
      date,
      expected_delivery_date,
      total_amount,
      total_amount,
      input.currency || 'EUR',
      input.exchange_rate || 4.0, // default EUR to AED ~ 4.0
      input.shipping_terms || 'Ex-Works',
      input.notes || null
    ]
  });

  for (const it of processedItems) {
    await db.execute({
      sql: `INSERT INTO purchase_order_items (id, purchase_order_id, item_id, description, quantity, unit_cost, total)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [
        it.id,
        it.purchase_order_id,
        it.item_id,
        it.description,
        it.quantity,
        it.unit_cost,
        it.total
      ]
    });
  }

  return (await getPurchaseOrder(id)) as PurchaseOrderRecord;
}

export async function getPurchaseOrder(idOrNumber: string): Promise<PurchaseOrderRecord | null> {
  const db = getDb();
  const clean = idOrNumber.trim();
  const rs = await db.execute({
    sql: `SELECT p.*, c.name as vendor_name, c.company_name as vendor_company, c.email as vendor_email, c.trn as vendor_trn, c.billing_address as vendor_address
          FROM purchase_orders p
          LEFT JOIN contacts c ON p.vendor_id = c.id
          WHERE p.id = ? OR p.po_number = ? OR p.po_number LIKE ?
          ORDER BY p.created_at DESC LIMIT 1`,
    args: [clean, clean, `%${clean}%`]
  });

  if (rs.rows.length === 0) return null;
  const po = rs.rows[0] as unknown as PurchaseOrderRecord;

  const itemRs = await db.execute({
    sql: `SELECT * FROM purchase_order_items WHERE purchase_order_id = ?`,
    args: [po.id]
  });
  po.items = itemRs.rows as any[];
  return po;
}

export async function createVendorBill(poIdOrNumber: string, billNumber: string, amount?: number): Promise<any> {
  const db = getDb();
  const po = await getPurchaseOrder(poIdOrNumber);
  if (!po) throw new Error(`Purchase Order ${poIdOrNumber} not found.`);

  const billId = `vbill_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const date = new Date().toISOString().split('T')[0];
  const dueDateObj = new Date();
  dueDateObj.setDate(dueDateObj.getDate() + 30);
  const dueDate = dueDateObj.toISOString().split('T')[0];

  const totalAmount = amount || po.total_amount;
  const exchangeRate = po.exchange_rate || 4.0;
  const totalAmountAed = Math.round(totalAmount * exchangeRate * 100) / 100;

  await db.execute({
    sql: `INSERT INTO vendor_bills (id, bill_number, vendor_id, purchase_order_id, date, due_date, total_amount, paid_amount, balance_due, currency, exchange_rate, total_amount_aed, status)
          VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, 'pending')`,
    args: [
      billId,
      billNumber,
      po.vendor_id,
      po.id,
      date,
      dueDate,
      totalAmount,
      totalAmount,
      po.currency,
      exchangeRate,
      totalAmountAed
    ]
  });

  // Update PO status to billed
  await db.execute({
    sql: `UPDATE purchase_orders SET status = 'billed' WHERE id = ?`,
    args: [po.id]
  });

  // Record in double-entry ledger: Debit COGS/Inventory, Credit Accounts Payable
  await recordVendorBillLedgerEntry({
    billId,
    billNumber,
    vendorName: po.vendor_company || po.vendor_name || 'Vendor',
    amountAed: totalAmountAed,
    date
  });

  return {
    id: billId,
    bill_number: billNumber,
    po_number: po.po_number,
    vendor_id: po.vendor_id,
    total_amount: totalAmount,
    currency: po.currency,
    total_amount_aed: totalAmountAed,
    due_date: dueDate
  };
}

export async function listPurchaseOrders(limit = 50): Promise<PurchaseOrderRecord[]> {
  const db = getDb();
  const rs = await db.execute({
    sql: `SELECT p.*, c.name as vendor_name, c.company_name as vendor_company
          FROM purchase_orders p
          LEFT JOIN contacts c ON p.vendor_id = c.id
          ORDER BY p.created_at DESC LIMIT ?`,
    args: [limit]
  });
  return rs.rows as unknown as PurchaseOrderRecord[];
}
