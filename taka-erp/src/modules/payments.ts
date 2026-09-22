import { getDb } from '../db/client.js';
import { getInvoice } from './invoicing.js';
import { recordCustomerPaymentLedgerEntry, recordVendorPaymentLedgerEntry } from './ledger.js';

export interface RecordCustomerPaymentInput {
  invoice_id_or_number: string;
  amount: number;
  date?: string;
  payment_mode?: string; // bank_transfer, cheque, cash
  reference?: string;
  notes?: string;
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

export async function recordCustomerPayment(input: RecordCustomerPaymentInput): Promise<any> {
  const db = getDb();
  const invRef = input.invoice_id_or_number || (input as any).invoice_id || (input as any).invoice_number;
  if (!invRef) throw new Error('invoice_id_or_number or invoice_id is required');
  const invoice = await getInvoice(invRef);
  if (!invoice) throw new Error(`Invoice ${invRef} not found.`);

  const paymentId = `pmt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const paymentNumber = await generatePaymentNumber('customer_receipt');
  const date = input.date || new Date().toISOString().split('T')[0];
  const paymentMode = input.payment_mode || (input as any).payment_method || 'bank_transfer';
  const reference = input.reference || (input as any).reference_number || null;

  const paidAmount = Number(input.amount);
  if (!Number.isFinite(paidAmount) || paidAmount <= 0) {
    throw new Error(`Invalid payment amount: ${input.amount}`);
  }

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
    sql: `INSERT INTO payments (id, payment_number, type, contact_id, invoice_id, date, amount, currency, payment_mode, reference, notes)
          VALUES (?, ?, 'customer_receipt', ?, ?, ?, ?, 'AED', ?, ?, ?)`,
    args: [
      paymentId,
      paymentNumber,
      invoice.customer_id,
      invoice.id,
      date,
      paidAmount,
      paymentMode,
      reference,
      input.notes || null
    ]
  });

  // Update Invoice balance and status
  await db.execute({
    sql: `UPDATE invoices SET paid_amount = ?, balance_due = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
    args: [newPaidTotal, newBalanceDue, newStatus, invoice.id]
  });

  // Record in double-entry general ledger
  await recordCustomerPaymentLedgerEntry({
    paymentId,
    paymentNumber,
    customerName: invoice.customer_company || invoice.customer_name || 'Customer',
    invoiceNumber: invoice.invoice_number,
    amount: paidAmount,
    date
  });

  return {
    payment_id: paymentId,
    payment_number: paymentNumber,
    invoice_number: invoice.invoice_number,
    customer_name: invoice.customer_company || invoice.customer_name,
    amount_paid: paidAmount,
    balance_remaining: newBalanceDue,
    status: newStatus,
    date
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
    sql: `INSERT INTO payments (id, payment_number, type, contact_id, vendor_bill_id, date, amount, currency, payment_mode, reference, notes)
          VALUES (?, ?, 'vendor_payment', ?, ?, ?, ?, ?, ?, ?, ?)`,
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
