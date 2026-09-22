import { getDb } from '../db/client.js';

export async function getArAgingReport() {
  const db = getDb();
  const today = new Date().toISOString().split('T')[0];

  const rs = await db.execute({
    sql: `SELECT inv.id, inv.invoice_number, inv.date, inv.due_date, inv.total_amount, inv.paid_amount, inv.balance_due,
                 c.name as customer_name, c.company_name as customer_company
          FROM invoices inv
          JOIN contacts c ON inv.customer_id = c.id
          WHERE inv.balance_due > 0 AND inv.status != 'void'
          ORDER BY inv.due_date ASC`,
    args: []
  });

  const buckets = {
    current: 0,
    days_1_30: 0,
    days_31_60: 0,
    days_60_plus: 0,
    total_receivable: 0,
    invoices: [] as any[]
  };

  const todayMs = new Date(today).getTime();

  for (const row of rs.rows) {
    const dueMs = new Date(String(row.due_date)).getTime();
    const diffDays = Math.floor((todayMs - dueMs) / (1000 * 60 * 60 * 24));
    const balance = Number(row.balance_due);

    buckets.total_receivable += balance;

    let bucketName = 'Current';
    if (diffDays <= 0) {
      buckets.current += balance;
    } else if (diffDays <= 30) {
      buckets.days_1_30 += balance;
      bucketName = '1-30 Days Overdue';
    } else if (diffDays <= 60) {
      buckets.days_31_60 += balance;
      bucketName = '31-60 Days Overdue';
    } else {
      buckets.days_60_plus += balance;
      bucketName = '60+ Days Overdue';
    }

    buckets.invoices.push({
      invoice_number: row.invoice_number,
      customer: row.customer_company || row.customer_name,
      due_date: row.due_date,
      days_overdue: Math.max(0, diffDays),
      balance_due: balance,
      bucket: bucketName
    });
  }

  buckets.total_receivable = Math.round(buckets.total_receivable * 100) / 100;
  buckets.current = Math.round(buckets.current * 100) / 100;
  buckets.days_1_30 = Math.round(buckets.days_1_30 * 100) / 100;
  buckets.days_31_60 = Math.round(buckets.days_31_60 * 100) / 100;
  buckets.days_60_plus = Math.round(buckets.days_60_plus * 100) / 100;

  return buckets;
}

export async function getApAgingReport() {
  const db = getDb();
  const rs = await db.execute({
    sql: `SELECT b.id, b.bill_number, b.date, b.due_date, b.total_amount, b.balance_due, b.currency, b.total_amount_aed,
                 c.company_name as vendor_company, c.name as vendor_name
          FROM vendor_bills b
          JOIN contacts c ON b.vendor_id = c.id
          WHERE b.balance_due > 0
          ORDER BY b.due_date ASC`,
    args: []
  });

  let totalPayableAed = 0;
  const bills = rs.rows.map(r => {
    const balAed = Number(r.balance_due) * (Number(r.total_amount_aed) / Number(r.total_amount));
    totalPayableAed += balAed;
    return {
      bill_number: r.bill_number,
      vendor: r.vendor_company || r.vendor_name,
      due_date: r.due_date,
      balance_due: Number(r.balance_due),
      currency: r.currency,
      balance_aed: Math.round(balAed * 100) / 100
    };
  });

  return {
    total_payable_aed: Math.round(totalPayableAed * 100) / 100,
    bills
  };
}

export async function getProfitAndLossReport(startDate?: string, endDate?: string) {
  const db = getDb();
  const start = startDate || '2026-01-01';
  const end = endDate || '2026-12-31';

  // Revenue (Account 4000 & 4100)
  const revRs = await db.execute({
    sql: `SELECT SUM(jl.credit - jl.debit) as revenue
          FROM journal_lines jl
          JOIN journal_entries je ON jl.entry_id = je.id
          WHERE (jl.account_code = '4000' OR jl.account_code = '4100')
            AND je.date >= ? AND je.date <= ?`,
    args: [start, end]
  });
  const revenue = Number(revRs.rows[0]?.revenue || 0);

  // COGS (Account 5000)
  const cogsRs = await db.execute({
    sql: `SELECT SUM(jl.debit - jl.credit) as cogs
          FROM journal_lines jl
          JOIN journal_entries je ON jl.entry_id = je.id
          WHERE jl.account_code = '5000'
            AND je.date >= ? AND je.date <= ?`,
    args: [start, end]
  });
  const cogs = Number(cogsRs.rows[0]?.cogs || 0);

  // Operating Expenses (Account 6000, 6100)
  const opexRs = await db.execute({
    sql: `SELECT SUM(jl.debit - jl.credit) as opex
          FROM journal_lines jl
          JOIN journal_entries je ON jl.entry_id = je.id
          WHERE (jl.account_code = '6000' OR jl.account_code = '6100')
            AND je.date >= ? AND je.date <= ?`,
    args: [start, end]
  });
  const opex = Number(opexRs.rows[0]?.opex || 0);

  const grossProfit = revenue - cogs;
  const netProfit = grossProfit - opex;
  const grossMarginPercent = revenue > 0 ? (grossProfit / revenue) * 100 : 0;

  return {
    period: { start, end },
    currency: 'AED',
    revenue: Math.round(revenue * 100) / 100,
    cost_of_goods_sold: Math.round(cogs * 100) / 100,
    gross_profit: Math.round(grossProfit * 100) / 100,
    gross_margin_percent: Math.round(grossMarginPercent * 10) / 10,
    operating_expenses: Math.round(opex * 100) / 100,
    net_profit: Math.round(netProfit * 100) / 100
  };
}

export async function getUaeVatReturnReport(startDate?: string, endDate?: string) {
  const db = getDb();
  const start = startDate || '2026-01-01';
  const end = endDate || '2026-12-31';

  // Standard Rated Supplies (5%) - Box 1a
  const outputRs = await db.execute({
    sql: `SELECT SUM(jl.credit - jl.debit) as vat_output
          FROM journal_lines jl
          JOIN journal_entries je ON jl.entry_id = je.id
          WHERE jl.account_code = '2100'
            AND je.date >= ? AND je.date <= ?`,
    args: [start, end]
  });
  const vatOutput = Number(outputRs.rows[0]?.vat_output || 0);
  const taxableSales = vatOutput * 20; // 5% = 1/20

  // Recoverable VAT on Expenses - Box 9
  const inputRs = await db.execute({
    sql: `SELECT SUM(jl.debit - jl.credit) as vat_input
          FROM journal_lines jl
          JOIN journal_entries je ON jl.entry_id = je.id
          WHERE jl.account_code = '2110'
            AND je.date >= ? AND je.date <= ?`,
    args: [start, end]
  });
  const vatInput = Number(inputRs.rows[0]?.vat_input || 0);
  const taxablePurchases = vatInput * 20;

  const netVatPayable = vatOutput - vatInput;

  return {
    jurisdiction: 'United Arab Emirates - Federal Tax Authority (FTA)',
    trn: '100482910400003',
    period: { start, end },
    box_1a_standard_supplies_amount: Math.round(taxableSales * 100) / 100,
    box_1a_output_vat_due: Math.round(vatOutput * 100) / 100,
    box_9_standard_expenses_amount: Math.round(taxablePurchases * 100) / 100,
    box_9_recoverable_vat: Math.round(vatInput * 100) / 100,
    net_vat_payable_to_fta: Math.round(netVatPayable * 100) / 100
  };
}
