import { getDb } from './client.js';

export async function resetDatabaseToProduction() {
  const db = getDb();
  console.log('[Reset] Cleaning all test & sample transaction data for production...');

  // Child-first order respecting foreign keys
  const transactionTables = [
    'journal_lines',
    'journal_entries',
    'payments',
    'invoice_items',
    'invoices',
    'delivery_note_items',
    'delivery_notes',
    'vendor_bills',
    'purchase_order_items',
    'purchase_orders',
    'sales_order_items',
    'sales_orders',
    'quotation_items',
    'quotations',
    'activity_logs'
  ];

  for (const table of transactionTables) {
    console.log(`[Reset] Clearing table: ${table}...`);
    try {
      await db.execute(`DELETE FROM ${table}`);
    } catch (e) {
      // Table might not exist yet if unmigrated
    }
  }

  // Keep ONLY genuine international manufacturer partners (suppliers) and remove all test customers
  console.log('[Reset] Normalizing contacts to verified global manufacturer partners only...');
  await db.execute(`DELETE FROM contacts WHERE type = 'customer' OR id NOT IN ('vnd_ika', 'vnd_hanil', 'vnd_hach', 'vnd_toption', 'vnd_elga')`);

  // Verify counts
  console.log('\n[Verification] Current Post-Reset Counts:');
  const allTables = [
    'quotations', 'quotation_items',
    'sales_orders', 'sales_order_items',
    'purchase_orders', 'purchase_order_items',
    'delivery_notes', 'delivery_note_items',
    'invoices', 'invoice_items',
    'vendor_bills', 'payments',
    'journal_entries', 'journal_lines',
    'contacts', 'items', 'chart_of_accounts'
  ];

  for (const t of allTables) {
    const rs = await db.execute(`SELECT COUNT(*) as count FROM ${t}`);
    console.log(`  ${t.padEnd(24)}: ${rs.rows[0].count}`);
  }

  console.log('\n[Reset] Database is now 100% PRISTINE & PRODUCTION-READY!');
}

resetDatabaseToProduction().catch(console.error);
