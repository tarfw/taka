import dotenv from 'dotenv';
import { getDb } from './client.js';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

dotenv.config();

const __dirname = dirname(fileURLToPath(import.meta.url));

async function columnExists(table: string, column: string): Promise<boolean> {
  const db = getDb();
  const rs = await db.execute({ sql: `PRAGMA table_info(${table})`, args: [] });
  return rs.rows.some((r: any) => r.name === column);
}

async function main() {
  const db = getDb();

  // 1. New tables
  const ddl = readFileSync(join(__dirname, 'schema_trading.sql'), 'utf-8');
  for (const stmt of ddl.split(';').map(s => s.trim()).filter(s => s.length > 0)) {
    await db.execute({ sql: stmt, args: [] });
  }

  // 2. New columns on payments (idempotent)
  if (!(await columnExists('payments', 'category'))) {
    await db.execute({ sql: `ALTER TABLE payments ADD COLUMN category TEXT DEFAULT 'invoice_payment'`, args: [] });
    console.log('[migrate] payments.category added');
  }
  if (!(await columnExists('payments', 'fee_amount'))) {
    await db.execute({ sql: `ALTER TABLE payments ADD COLUMN fee_amount REAL DEFAULT 0`, args: [] });
    console.log('[migrate] payments.fee_amount added');
  }

  // 3. Sanity report
  const coa = await db.execute({ sql: `SELECT code FROM chart_of_accounts WHERE code IN ('2300','5100')`, args: [] });
  const dn = await db.execute({ sql: `SELECT COUNT(*) as c FROM delivery_notes`, args: [] });
  console.log(`[migrate] done. COA rows: ${coa.rows.map((r: any) => r.code).join(', ')} | delivery_notes: ${dn.rows[0].c}`);
}

main().then(
  () => process.exit(0),
  (err) => { console.error('[migrate] FAILED:', err); process.exit(1); }
);
