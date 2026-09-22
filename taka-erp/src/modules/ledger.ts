import { getDb } from '../db/client.js';

export interface JournalLine {
  account_code: string;
  debit: number;
  credit: number;
  description?: string;
}

export interface CreateJournalEntryInput {
  entry_number?: string;
  date: string;
  reference_type: string;
  reference_id: string;
  memo: string;
  lines: JournalLine[];
}

export async function generateEntryNumber(): Promise<string> {
  const db = getDb();
  const year = new Date().getFullYear();
  const rs = await db.execute({
    sql: `SELECT COUNT(*) as count FROM journal_entries WHERE entry_number LIKE ?`,
    args: [`JE-${year}-%`]
  });
  const count = Number(rs.rows[0].count) + 1;
  const seq = String(count).padStart(4, '0');
  return `JE-${year}-${seq}`;
}

export async function createJournalEntry(input: CreateJournalEntryInput): Promise<string> {
  const db = getDb();
  const entryId = `je_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const entryNumber = input.entry_number || (await generateEntryNumber());

  // Balance verification: Total Debits MUST equal Total Credits
  let totalDebit = 0;
  let totalCredit = 0;
  for (const line of input.lines) {
    totalDebit += line.debit;
    totalCredit += line.credit;
  }

  const diff = Math.abs(totalDebit - totalCredit);
  if (diff > 0.01) {
    throw new Error(`Double-entry balance mismatch! Debits (${totalDebit.toFixed(2)}) != Credits (${totalCredit.toFixed(2)})`);
  }

  await db.execute({
    sql: `INSERT INTO journal_entries (id, entry_number, date, reference_type, reference_id, memo)
          VALUES (?, ?, ?, ?, ?, ?)`,
    args: [
      entryId,
      entryNumber,
      input.date,
      input.reference_type,
      input.reference_id,
      input.memo
    ]
  });

  for (const line of input.lines) {
    const lineId = `jline_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    await db.execute({
      sql: `INSERT INTO journal_lines (id, entry_id, account_code, debit, credit, description)
            VALUES (?, ?, ?, ?, ?, ?)`,
      args: [
        lineId,
        entryId,
        line.account_code,
        Math.round(line.debit * 100) / 100,
        Math.round(line.credit * 100) / 100,
        line.description || null
      ]
    });
  }

  return entryId;
}

// 1. Invoicing Entry:
// Debit: Accounts Receivable (1200) [Total Invoice]
// Credit: Sales Revenue (4000) [Subtotal]
// Credit: UAE VAT Output (2100) [5% VAT]
export async function recordInvoiceLedgerEntry(params: {
  invoiceId: string;
  invoiceNumber: string;
  customerName: string;
  subtotal: number;
  vatAmount: number;
  totalAmount: number;
  date: string;
}) {
  await createJournalEntry({
    date: params.date,
    reference_type: 'invoice',
    reference_id: params.invoiceId,
    memo: `Tax Invoice ${params.invoiceNumber} to ${params.customerName}`,
    lines: [
      {
        account_code: '1200', // Accounts Receivable
        debit: params.totalAmount,
        credit: 0,
        description: `Customer receivable for ${params.invoiceNumber}`
      },
      {
        account_code: '4000', // Sales Revenue
        debit: 0,
        credit: params.subtotal,
        description: `Revenue from ${params.invoiceNumber}`
      },
      {
        account_code: '2100', // UAE VAT Output (5%)
        debit: 0,
        credit: params.vatAmount,
        description: `5% Output VAT on ${params.invoiceNumber}`
      }
    ]
  });
}

// 2. Customer Payment Receipt Entry:
// Debit: Bank Account (1000)
// Credit: Accounts Receivable (1200)
export async function recordCustomerPaymentLedgerEntry(params: {
  paymentId: string;
  paymentNumber: string;
  customerName: string;
  invoiceNumber: string;
  amount: number;
  date: string;
}) {
  await createJournalEntry({
    date: params.date,
    reference_type: 'customer_receipt',
    reference_id: params.paymentId,
    memo: `Payment receipt ${params.paymentNumber} from ${params.customerName} for ${params.invoiceNumber}`,
    lines: [
      {
        account_code: '1000', // Bank
        debit: params.amount,
        credit: 0,
        description: `Bank deposit for ${params.invoiceNumber}`
      },
      {
        account_code: '1200', // Accounts Receivable
        debit: 0,
        credit: params.amount,
        description: `Clear AR for ${params.customerName}`
      }
    ]
  });
}

// 3. Vendor Bill Entry:
// Debit: COGS / Inventory (5000)
// Credit: Accounts Payable (2000)
export async function recordVendorBillLedgerEntry(params: {
  billId: string;
  billNumber: string;
  vendorName: string;
  amountAed: number;
  date: string;
}) {
  await createJournalEntry({
    date: params.date,
    reference_type: 'vendor_bill',
    reference_id: params.billId,
    memo: `Vendor Bill ${params.billNumber} from ${params.vendorName}`,
    lines: [
      {
        account_code: '5000', // Cost of Goods Sold
        debit: params.amountAed,
        credit: 0,
        description: `COGS for ${params.billNumber}`
      },
      {
        account_code: '2000', // Accounts Payable
        debit: 0,
        credit: params.amountAed,
        description: `Payable to ${params.vendorName}`
      }
    ]
  });
}

// 4. Vendor Payment Entry:
// Debit: Accounts Payable (2000)
// Credit: Bank Account (1000)
export async function recordVendorPaymentLedgerEntry(params: {
  paymentId: string;
  paymentNumber: string;
  vendorName: string;
  billNumber: string;
  amountAed: number;
  date: string;
}) {
  await createJournalEntry({
    date: params.date,
    reference_type: 'vendor_payment',
    reference_id: params.paymentId,
    memo: `Vendor Payment ${params.paymentNumber} to ${params.vendorName} for ${params.billNumber}`,
    lines: [
      {
        account_code: '2000', // Accounts Payable
        debit: params.amountAed,
        credit: 0,
        description: `Settle payable for ${params.billNumber}`
      },
      {
        account_code: '1000', // Bank
        debit: 0,
        credit: params.amountAed,
        description: `Bank wire transfer out`
      }
    ]
  });
}

export async function getGeneralLedgerEntries(limit = 50): Promise<any[]> {
  const db = getDb();
  const rs = await db.execute({
    sql: `SELECT je.entry_number, je.date, je.reference_type, je.memo,
                 jl.account_code, coa.name as account_name, jl.debit, jl.credit, jl.description
          FROM journal_lines jl
          JOIN journal_entries je ON jl.entry_id = je.id
          LEFT JOIN chart_of_accounts coa ON jl.account_code = coa.code
          ORDER BY je.date DESC, je.created_at DESC, jl.id ASC
          LIMIT ?`,
    args: [limit]
  });
  return rs.rows;
}

export async function getBankAccountsSummary(): Promise<any> {
  const db = getDb();
  const rs = await db.execute({
    sql: `SELECT account_code, SUM(debit - credit) as balance
          FROM journal_lines
          WHERE account_code IN ('1000', '1010')
          GROUP BY account_code`,
    args: []
  });

  let wioBalance = 0;
  let cashBalance = 0;
  for (const row of rs.rows) {
    if (row.account_code === '1000') wioBalance = Number(row.balance || 0);
    if (row.account_code === '1010') cashBalance = Number(row.balance || 0);
  }

  const txRs = await db.execute({
    sql: `SELECT je.entry_number, je.date, je.memo, jl.account_code, jl.debit, jl.credit
          FROM journal_lines jl
          JOIN journal_entries je ON jl.entry_id = je.id
          WHERE jl.account_code IN ('1000', '1010')
          ORDER BY je.date DESC, je.created_at DESC
          LIMIT 25`,
    args: []
  });

  return {
    accounts: [
      {
        code: '1000',
        name: 'WIO Bank Business Current (AED)',
        bank_name: 'WIO Bank PJSC, Abu Dhabi',
        iban: 'AE840860000001004829104',
        currency: 'AED',
        balance: Math.round(wioBalance * 100) / 100,
        status: 'active',
        type: 'bank'
      },
      {
        code: '1010',
        name: 'Operating Petty Cash (AED)',
        bank_name: 'TAKA Scientific Treasury Safe',
        iban: 'N/A (Cash on Hand)',
        currency: 'AED',
        balance: Math.round(cashBalance * 100) / 100,
        status: 'active',
        type: 'cash'
      }
    ],
    recent_transactions: txRs.rows
  };
}

