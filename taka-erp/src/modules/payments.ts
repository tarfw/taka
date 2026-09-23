import { getDb } from '../db/client.js';
import { getInvoice } from './invoicing.js';
import { recordCustomerPaymentLedgerEntry, recordVendorPaymentLedgerEntry, recordDepositLedgerEntry, recordDepositAppliedLedgerEntry } from './ledger.js';

export interface RecordCustomerPaymentInput {
  invoice_id_or_number?: string;
  invoice_id?: string;
  invoice_number?: string;
  amount: number;
  date?: string;
  payment_mode?: string; // bank_transfer, cash, card, cheque
  reference?: string;
  notes?: string;
  category?: 'invoice_payment' | 'deposit'; // deposit = advance before delivery
  fee_amount?: number; // card terminal / wire processing fee
  contact_id?: string; // required for deposits
}

export interface RecordVendorPaymentInput {
  bill_id: string;
  amount: number;
  date?: string;
  payment_mode?: string;
  reference?: string;
  notes?: string;
}

export async function generatePaymentNumber(type: 'customer_receipt' | 'vendor_payment'): Promise<string> {
  const db = getDb();
  const year = new Date().getFullYear();
  const prefix = type === 'customer_receipt' ? 'TK-REC' : 'TK-VPMT';
  const rs = await db.execute({
    sql: `SELECT COUNT(*) as count FROM payments WHERE payment_number LIKE ?`,
    args: [`${prefix}-${year}-%`]
  });
  const count = Number(rs.rows[0].count) + 1;
  const seq = String(count).padStart(4, '0');
  return `${prefix}-${year}-${seq}`;
}

export async function generateApplyNumber(): Promise<string> {
  const db = getDb();
  const year = new Date().getFullYear();
  const rs = await db.execute({
    sql: `SELECT COUNT(*) as count FROM payments WHERE payment_number LIKE ?`,
    args: [`TK-APPLY-${year}-%`]
  });
  const count = Number(rs.rows[0].count) + 1;
  const seq = String(count).padStart(4, '0');
  return `TK-APPLY-${year}-${seq}`;
}

// Available deposit balance = deposits held - deposits released
export async function getCustomerDepositBalance(contactId: string): Promise<number> {
  const db = getDb();
  const rs = await db.execute({
    sql: `SELECT
            COALESCE(SUM(CASE WHEN category = 'deposit' THEN amount ELSE 0 END), 0) as held,
            COALESCE(SUM(CASE WHEN category = 'deposit_applied' THEN amount ELSE 0 END), 0) as released
          FROM payments
          WHERE contact_id = ? AND type = 'customer_receipt'`,
    args: [contactId]
  });
  const held = Number((rs.rows[0] as any).held || 0);
  const released = Number((rs.rows[0] as any).released || 0);
  return Math.round((held - released) * 100) / 100;
}

const ALLOWED_MODES = new Set(['bank_transfer', 'cash', 'card', 'cheque']);

export async function recordCustomerPayment(input: RecordCustomerPaymentInput): Promise<any> {
  const db = getDb();
  const paidAmount = Number(input.amount);
  if (!Number.isFinite(paidAmount) || paidAmount <= 0) {
    throw new Error(`Invalid payment amount: ${input.amount}`);
  }
  const paymentMode = ALLOWED_MODES.has(input.payment_mode || '') ? (input.payment_mode as string) : 'bank_transfer';
  const feeAmount = Math.max(0, Number(input.fee_amount || 0));
  if (feeAmount >= paidAmount) throw new Error(`Processing fee (${feeAmount}) cannot exceed the payment amount.`);
  const reference = input.reference || (input as any).reference_number || null;
  const date = input.date || new Date().toISOString().split('T')[0];

  // ---- Advance / Deposit: money before delivery ----
  if (input.category === 'deposit') {
    const contactId = input.contact_id || (input as any).customer_id;
    if (!contactId) throw new Error('contact_id is required to record an advance (deposit)');

    const cChk = await db.execute({ sql: `SELECT name, company_name FROM contacts WHERE id = ?`, args: [contactId] });
    if (cChk.rows.length === 0) throw new Error(`Contact ${contactId} not found.`);
    const customerName = (cChk.rows[0] as any).company_name || (cChk.rows[0] as any).name;

    const paymentId = `pmt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const paymentNumber = await generatePaymentNumber('customer_receipt');

    await db.execute({
      sql: `INSERT INTO payments (id, payment_number, type, contact_id, invoice_id, date, amount, currency, payment_mode, reference, notes, category, fee_amount)
            VALUES (?, ?, 'customer_receipt', ?, NULL, ?, ?, 'AED', ?, ?, ?, 'deposit', ?)`,
      args: [paymentId, paymentNumber, contactId, date, paidAmount, paymentMode, reference, input.notes || null, feeAmount]
    });

    await recordDepositLedgerEntry({
      paymentId,
      paymentNumber,
      customerName,
      amount: paidAmount - feeAmount,
      date
    });

    const depositBalance = await getCustomerDepositBalance(contactId);
    return {
      payment_id: paymentId,
      payment_number: paymentNumber,
      category: 'deposit',
      customer_name: customerName,
      amount_paid: paidAmount,
      deposit_balance: depositBalance,
      status: 'deposit',
      date
    };
  }

  // ---- Invoice payment (cash / card / cheque / bank) ----
  const invRef = input.invoice_id_or_number || (input as any).invoice_id || (input as any).invoice_number;
  if (!invRef) throw new Error('invoice_id_or_number or invoice_id is required');
  const invoice = await getInvoice(invRef);
  if (!invoice) throw new Error(`Invoice ${invRef} not found.`);

  const paymentId = `pmt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const paymentNumber = await generatePaymentNumber('customer_receipt');

  // Fresh outstanding balance computed from totals (not the stored balance_due
  // field, which may be stale). Reject silent overpayments.
  const outstanding = Math.round((invoice.total_amount - invoice.paid_amount) * 100) / 100;
  if (paidAmount > outstanding + 0.01) {
    throw new Error(`Payment (AED ${paidAmount.toFixed(2)}) exceeds outstanding balance (AED ${Math.max(0, outstanding).toFixed(2)}) for invoice ${invoice.invoice_number}.`);
  }

  const newPaidTotal = Math.round((invoice.paid_amount + paidAmount) * 100) / 100;
  const newBalanceDue = Math.round((invoice.total_amount - newPaidTotal) * 100) / 100;
  const newStatus = newBalanceDue <= 0 ? 'paid' : 'partially_paid';

  await db.execute({
    sql: `INSERT INTO payments (id, payment_number, type, contact_id, invoice_id, date, amount, currency, payment_mode, reference, notes, category, fee_amount)
          VALUES (?, ?, 'customer_receipt', ?, ?, ?, ?, 'AED', ?, ?, ?, 'invoice_payment', ?)`,
    args: [
      paymentId,
      paymentNumber,
      invoice.customer_id,
      invoice.id,
      date,
      paidAmount,
      paymentMode,
      reference,
      input.notes || null,
      feeAmount
    ]
  });

  // Update Invoice balance and status
  await db.execute({
    sql: `UPDATE invoices SET paid_amount = ?, balance_due = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
    args: [newPaidTotal, newBalanceDue, newStatus, invoice.id]
  });

  // Record in double-entry general ledger (net of processing fee)
  await recordCustomerPaymentLedgerEntry({
    paymentId,
    paymentNumber,
    customerName: invoice.customer_company || invoice.customer_name || 'Customer',
    invoiceNumber: invoice.invoice_number,
    amount: paidAmount,
    date,
    feeAmount
  });

  return {
    payment_id: paymentId,
    payment_number: paymentNumber,
    invoice_number: invoice.invoice_number,
    customer_name: invoice.customer_company || invoice.customer_name,
    amount_paid: paidAmount,
    balance_remaining: newBalanceDue,
    payment_mode: paymentMode,
    status: newStatus,
    date
  };
}

// Release a held deposit against an outstanding invoice (no bank movement):
// Dr 2300 Customer Deposits / Cr 1200 AR; invoice paid_amount increases.
export async function applyDepositToInvoice(input: {
  contact_id: string;
  invoice_id_or_number: string;
  amount: number;
  date?: string;
}): Promise<any> {
  const db = getDb();
  const amount = Number(input.amount);
  if (!Number.isFinite(amount) || amount <= 0) throw new Error(`Invalid amount: ${input.amount}`);

  const available = await getCustomerDepositBalance(input.contact_id);
  if (amount > available + 0.01) {
    throw new Error(`Deposit available (AED ${available.toFixed(2)}) is less than the amount requested (AED ${amount.toFixed(2)}).`);
  }

  const invoice = await getInvoice(input.invoice_id_or_number);
  if (!invoice) throw new Error(`Invoice ${input.invoice_id_or_number} not found.`);
  if (invoice.customer_id !== input.contact_id) {
    throw new Error(`Invoice ${invoice.invoice_number} does not belong to this customer.`);
  }

  const outstanding = Math.round((invoice.total_amount - invoice.paid_amount) * 100) / 100;
  const release = Math.min(amount, outstanding);

  const paymentId = `pmt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const applyNumber = await generateApplyNumber();
  const date = input.date || new Date().toISOString().split('T')[0];

  await db.execute({
    sql: `INSERT INTO payments (id, payment_number, type, contact_id, invoice_id, date, amount, currency, payment_mode, reference, notes, category, fee_amount)
          VALUES (?, ?, 'customer_receipt', ?, ?, ?, ?, 'AED', 'deposit', NULL, NULL, 'deposit_applied', 0)`,
    args: [paymentId, applyNumber, input.contact_id, invoice.id, date, release]
  });

  const newPaidTotal = Math.round((invoice.paid_amount + release) * 100) / 100;
  const newBalanceDue = Math.round((invoice.total_amount - newPaidTotal) * 100) / 100;
  const newStatus = newBalanceDue <= 0 ? 'paid' : 'partially_paid';

  await db.execute({
    sql: `UPDATE invoices SET paid_amount = ?, balance_due = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
    args: [newPaidTotal, newBalanceDue, newStatus, invoice.id]
  });

  await recordDepositAppliedLedgerEntry({
    paymentId,
    paymentNumber: applyNumber,
    customerName: invoice.customer_company || invoice.customer_name || 'Customer',
    invoiceNumber: invoice.invoice_number,
    amount: release,
    date
  });

  return {
    payment_id: paymentId,
    apply_number: applyNumber,
    invoice_number: invoice.invoice_number,
    amount_released: release,
    balance_remaining: newBalanceDue,
    invoice_status: newStatus,
    deposit_balance: await getCustomerDepositBalance(input.contact_id)
  };
}

export async function recordVendorPayment(input: RecordVendorPaymentInput): Promise<any> {
  const db = getDb();
  const billRs = await db.execute({
    sql: `SELECT b.*, c.name as vendor_name, c.company_name as vendor_company
          FROM vendor_bills b
          LEFT JOIN contacts c ON b.vendor_id = c.id
          WHERE b.id = ? OR b.bill_number = ?`,
    args: [input.bill_id, input.bill_id]
  });

  if (billRs.rows.length === 0) throw new Error(`Vendor bill ${input.bill_id} not found.`);
  const bill = billRs.rows[0] as any;

  const paymentId = `vpmt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const paymentNumber = await generatePaymentNumber('vendor_payment');
  const date = input.date || new Date().toISOString().split('T')[0];

  const paidAmount = Number(input.amount);
  if (!Number.isFinite(paidAmount) || paidAmount <= 0) {
    throw new Error(`Invalid payment amount: ${input.amount}`);
  }

  // Reject silent overpayments against the fresh outstanding balance.
  const outstanding = Math.round((bill.total_amount - bill.paid_amount) * 100) / 100;
  if (paidAmount > outstanding + 0.01) {
    throw new Error(`Payment (${bill.currency} ${paidAmount.toFixed(2)}) exceeds outstanding balance (${bill.currency} ${Math.max(0, outstanding).toFixed(2)}) for bill ${bill.bill_number}.`);
  }

  const newPaidTotal = Math.round((bill.paid_amount + paidAmount) * 100) / 100;
  const newBalanceDue = Math.round((bill.total_amount - newPaidTotal) * 100) / 100;
  const newStatus = newBalanceDue <= 0 ? 'paid' : 'partially_paid';

  await db.execute({
    sql: `INSERT INTO payments (id, payment_number, type, contact_id, vendor_bill_id, date, amount, currency, payment_mode, reference, notes, category, fee_amount)
          VALUES (?, ?, 'vendor_payment', ?, ?, ?, ?, ?, ?, ?, ?, 'invoice_payment', 0)`,
    args: [
      paymentId,
      paymentNumber,
      bill.vendor_id,
      bill.id,
      date,
      paidAmount,
      bill.currency,
      input.payment_mode || 'bank_transfer',
      input.reference || null,
      input.notes || null
    ]
  });

  await db.execute({
    sql: `UPDATE vendor_bills SET paid_amount = ?, balance_due = ?, status = ? WHERE id = ?`,
    args: [newPaidTotal, newBalanceDue, newStatus, bill.id]
  });

  const exchangeRate = bill.exchange_rate || 4.0;
  const paidAed = Math.round(paidAmount * exchangeRate * 100) / 100;

  await recordVendorPaymentLedgerEntry({
    paymentId,
    paymentNumber,
    vendorName: bill.vendor_company || bill.vendor_name || 'Vendor',
    billNumber: bill.bill_number,
    amountAed: paidAed,
    date
  });

  return {
    payment_id: paymentId,
    payment_number: paymentNumber,
    bill_number: bill.bill_number,
    vendor_name: bill.vendor_company || bill.vendor_name,
    amount_paid: paidAmount,
    currency: bill.currency,
    balance_remaining: newBalanceDue,
    status: newStatus
  };
}

export async function listPayments(limit = 50): Promise<any[]> {
  const db = getDb();
  const rs = await db.execute({
    sql: `SELECT p.*, c.name as contact_name, c.company_name as contact_company, i.invoice_number
          FROM payments p
          LEFT JOIN contacts c ON p.contact_id = c.id
          LEFT JOIN invoices i ON p.invoice_id = i.id
          ORDER BY p.created_at DESC LIMIT ?`,
    args: [limit]
  });
  return rs.rows;
}
