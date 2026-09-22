import { getDb } from '../db/client.js';
import { getQuote, updateQuoteStatus } from './quotes.js';

export interface SalesOrderRecord {
  id: string;
  so_number: string;
  quote_id?: string;
  customer_id: string;
  customer_name?: string;
  customer_company?: string;
  customer_po_ref?: string;
  date: string;
  delivery_date?: string;
  total_amount: number;
  currency: string;
  status: string;
  items?: any[];
}

export async function generateSoNumber(): Promise<string> {
  const db = getDb();
  const year = new Date().getFullYear();
  const rs = await db.execute({
    sql: `SELECT COUNT(*) as count FROM sales_orders WHERE so_number LIKE ?`,
    args: [`TK-SO-${year}-%`]
  });
  const count = Number(rs.rows[0].count) + 1;
  const seq = String(count).padStart(4, '0');
  return `TK-SO-${year}-${seq}`;
}

export async function createSalesOrderFromQuote(quoteIdOrNumber: string, customerPoRef?: string): Promise<SalesOrderRecord> {
  const db = getDb();
  const quote = await getQuote(quoteIdOrNumber);
  if (!quote) throw new Error(`Quotation ${quoteIdOrNumber} not found.`);

  const soId = `so_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const soNumber = await generateSoNumber();
  const date = new Date().toISOString().split('T')[0];

  const deliveryDateObj = new Date();
  deliveryDateObj.setDate(deliveryDateObj.getDate() + 30);
  const deliveryDate = deliveryDateObj.toISOString().split('T')[0];

  await db.execute({
    sql: `INSERT INTO sales_orders (id, so_number, quote_id, customer_id, customer_po_ref, date, delivery_date, total_amount, currency, status)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'confirmed')`,
    args: [
      soId,
      soNumber,
      quote.id,
      quote.customer_id,
      customerPoRef || null,
      date,
      deliveryDate,
      quote.total_amount,
      quote.currency
    ]
  });

  if (quote.items) {
    for (const item of quote.items) {
      const soItemId = `soitem_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      await db.execute({
        sql: `INSERT INTO sales_order_items (id, sales_order_id, item_id, description, quantity, unit_price, total)
              VALUES (?, ?, ?, ?, ?, ?, ?)`,
        args: [
          soItemId,
          soId,
          item.item_id,
          item.description,
          item.quantity,
          item.unit_price,
          item.total
        ]
      });
    }
  }

  // Update quote status to accepted
  await updateQuoteStatus(quote.id, 'accepted');

  return (await getSalesOrder(soId)) as SalesOrderRecord;
}

export async function getSalesOrder(idOrNumber: string): Promise<SalesOrderRecord | null> {
  const db = getDb();
  const rs = await db.execute({
    sql: `SELECT s.*, c.name as customer_name, c.company_name as customer_company, c.trn as customer_trn, c.billing_address, c.shipping_address
          FROM sales_orders s
          LEFT JOIN contacts c ON s.customer_id = c.id
          WHERE s.id = ? OR s.so_number = ?`,
    args: [idOrNumber, idOrNumber]
  });
  if (rs.rows.length === 0) return null;
  const order = rs.rows[0] as unknown as SalesOrderRecord;

  const itemRs = await db.execute({
    sql: `SELECT * FROM sales_order_items WHERE sales_order_id = ?`,
    args: [order.id]
  });
  order.items = itemRs.rows as any[];
  return order;
}
