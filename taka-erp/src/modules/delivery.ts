import { getDb } from '../db/client.js';

export interface DeliveryNoteItemInput {
  item_id?: string;
  description: string;
  quantity: number;
}

export interface CreateDeliveryNoteInput {
  customer_id: string;
  source_type?: 'quote' | 'invoice' | 'sales_order';
  source_id?: string;
  customer_po_ref?: string;
  delivery_date?: string;
  received_by?: string;
  vehicle?: string;
  notes?: string;
  items?: DeliveryNoteItemInput[];
}

export async function generateDnNumber(): Promise<string> {
  const db = getDb();
  const year = new Date().getFullYear();
  const rs = await db.execute({
    sql: `SELECT COUNT(*) as count FROM delivery_notes WHERE dn_number LIKE ?`,
    args: [`TK-DN-${year}-%`]
  });
  const count = Number(rs.rows[0].count) + 1;
  const seq = String(count).padStart(4, '0');
  return `TK-DN-${year}-${seq}`;
}

// Items copied from the source quotation / invoice when not supplied explicitly.
async function itemsFromSource(sourceType: string, sourceId: string): Promise<DeliveryNoteItemInput[]> {
  const db = getDb();
  const table = sourceType === 'invoice' ? 'invoice_items' : 'quotation_items';
  const fk = sourceType === 'invoice' ? 'invoice_id' : 'quotation_id';
  const rs = await db.execute({
    sql: `SELECT item_id, description, quantity FROM ${table} WHERE ${fk} = ?`,
    args: [sourceId]
  });
  return rs.rows as unknown as DeliveryNoteItemInput[];
}

export async function createDeliveryNote(input: CreateDeliveryNoteInput): Promise<any> {
  const db = getDb();
  if (!input.customer_id) throw new Error('customer_id is required');

  const sourceType = input.source_type || 'quote';
  let items = input.items && input.items.length > 0 ? input.items : [];
  if (items.length === 0 && input.source_id) {
    items = await itemsFromSource(sourceType, input.source_id);
  }
  if (items.length === 0) throw new Error('Delivery note needs at least one line item');

  const id = `dn_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const dn_number = await generateDnNumber();
  const delivery_date = input.delivery_date || new Date().toISOString().split('T')[0];

  await db.execute({
    sql: `INSERT INTO delivery_notes (id, dn_number, customer_id, source_type, source_id, customer_po_ref, delivery_date, received_by, vehicle, status, notes)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'prepared', ?)`,
    args: [
      id,
      dn_number,
      input.customer_id,
      sourceType,
      input.source_id || null,
      input.customer_po_ref || null,
      delivery_date,
      input.received_by || null,
      input.vehicle || null,
      input.notes || null
    ]
  });

  for (const it of items) {
    await db.execute({
      sql: `INSERT INTO delivery_note_items (id, delivery_note_id, item_id, description, quantity)
            VALUES (?, ?, ?, ?, ?)`,
      args: [
        `dnline_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        id,
        it.item_id || null,
        it.description,
        it.quantity
      ]
    });
  }

  return await getDeliveryNote(id);
}

// Mark delivered: decrements catalog stock for linked catalog items.
// No journal entry: delivery is not an accounting event (the tax invoice
// creates the VAT point per UAE FTA rules).
export async function markDelivered(dnIdOrNumber: string, params?: { received_by?: string }): Promise<any> {
  const db = getDb();
  const dn = await getDeliveryNote(dnIdOrNumber);
  if (!dn) throw new Error(`Delivery note ${dnIdOrNumber} not found.`);
  if (dn.status !== 'prepared') throw new Error(`Delivery note ${dn.dn_number} is already ${dn.status}.`);

  const receivedBy = params?.received_by || dn.received_by;
  await db.execute({
    sql: `UPDATE delivery_notes SET status = 'delivered', received_by = COALESCE(?, received_by) WHERE id = ?`,
    args: [receivedBy || null, dn.id]
  });

  // Decrement stock for linked catalog items
  for (const it of dn.items || []) {
    if (it.item_id) {
      await db.execute({
        sql: `UPDATE items SET stock_quantity = MAX(0, stock_quantity - ?) WHERE id = ?`,
        args: [it.quantity, it.item_id]
      });
    }
  }

  return await getDeliveryNote(dn.id);
}

export async function markInvoiced(dnId: string): Promise<void> {
  const db = getDb();
  await db.execute({
    sql: `UPDATE delivery_notes SET status = 'invoiced' WHERE id = ?`,
    args: [dnId]
  });
}

export async function getDeliveryNote(idOrNumber: string): Promise<any | null> {
  const db = getDb();
  const clean = idOrNumber.trim();
  const rs = await db.execute({
    sql: `SELECT dn.*, c.name as customer_name, c.company_name as customer_company,
                 c.billing_address, c.shipping_address, c.trn as customer_trn
          FROM delivery_notes dn
          LEFT JOIN contacts c ON dn.customer_id = c.id
          WHERE dn.id = ? OR dn.dn_number = ?
          LIMIT 1`,
    args: [clean, clean]
  });
  if (rs.rows.length === 0) return null;
  const dn = rs.rows[0] as unknown as any;

  const itemRs = await db.execute({
    sql: `SELECT dni.*, i.sku, i.brand, i.model
          FROM delivery_note_items dni
          LEFT JOIN items i ON dni.item_id = i.id
          WHERE dni.delivery_note_id = ?`,
    args: [dn.id]
  });
  dn.items = itemRs.rows;
  return dn;
}

export async function listDeliveryNotes(limit = 20): Promise<any[]> {
  const db = getDb();
  const rs = await db.execute({
    sql: `SELECT dn.*, c.name as customer_name, c.company_name as customer_company,
                 (SELECT COUNT(*) FROM delivery_note_items x WHERE x.delivery_note_id = dn.id) as line_count,
                 (SELECT COALESCE(SUM(x.quantity), 0) FROM delivery_note_items x WHERE x.delivery_note_id = dn.id) as total_qty
          FROM delivery_notes dn
          LEFT JOIN contacts c ON dn.customer_id = c.id
          ORDER BY dn.created_at DESC
          LIMIT ?`,
    args: [limit]
  });
  return rs.rows;
}
