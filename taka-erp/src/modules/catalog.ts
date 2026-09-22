import { getDb } from '../db/client.js';

export interface CatalogItem {
  id: string;
  sku: string;
  brand: string;
  model: string;
  name: string;
  description?: string;
  category?: string;
  unit: string;
  cost_price: number;
  cost_currency: string;
  selling_price: number;
  vat_rate: number;
  stock_quantity: number;
  is_active: number;
}

export async function searchCatalog(query: string, brand?: string, limit = 10): Promise<CatalogItem[]> {
  const db = getDb();
  const pattern = `%${query.trim()}%`;
  let sql = `SELECT * FROM items WHERE (name LIKE ? OR model LIKE ? OR description LIKE ? OR sku LIKE ?)`;
  const args: any[] = [pattern, pattern, pattern, pattern];

  if (brand) {
    sql += ` AND brand LIKE ?`;
    args.push(`%${brand.trim()}%`);
  }
  sql += ` AND is_active = 1 LIMIT ?`;
  args.push(limit);

  const rs = await db.execute({ sql, args });
  return rs.rows as unknown as CatalogItem[];
}

export async function getItemById(id: string): Promise<CatalogItem | null> {
  const db = getDb();
  const rs = await db.execute({
    sql: `SELECT * FROM items WHERE id = ?`,
    args: [id]
  });
  if (rs.rows.length === 0) return null;
  return rs.rows[0] as unknown as CatalogItem;
}

export async function getItemBySku(sku: string): Promise<CatalogItem | null> {
  const db = getDb();
  const rs = await db.execute({
    sql: `SELECT * FROM items WHERE sku = ?`,
    args: [sku]
  });
  if (rs.rows.length === 0) return null;
  return rs.rows[0] as unknown as CatalogItem;
}

export async function listCatalogItems(limit = 140): Promise<CatalogItem[]> {
  const db = getDb();
  const rs = await db.execute({
    sql: `SELECT * FROM items WHERE is_active = 1 ORDER BY brand, model LIMIT ?`,
    args: [limit]
  });
  return rs.rows as unknown as CatalogItem[];
}

