import { getDb } from '../db/client.js';

export interface Contact {
  id: string;
  type: 'customer' | 'vendor';
  name: string;
  company_name?: string;
  email?: string;
  phone?: string;
  trn?: string;
  billing_address?: string;
  shipping_address?: string;
  credit_terms_days: number;
  currency: string;
  notes?: string;
}

export async function createContact(contact: Contact): Promise<Contact> {
  const db = getDb();
  await db.execute({
    sql: `INSERT INTO contacts (id, type, name, company_name, email, phone, trn, billing_address, shipping_address, credit_terms_days, currency, notes)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      contact.id,
      contact.type,
      contact.name,
      contact.company_name || null,
      contact.email || null,
      contact.phone || null,
      contact.trn || null,
      contact.billing_address || null,
      contact.shipping_address || null,
      contact.credit_terms_days || 30,
      contact.currency || 'AED',
      contact.notes || null
    ]
  });
  return contact;
}

export async function getContact(id: string): Promise<Contact | null> {
  const db = getDb();
  const rs = await db.execute({
    sql: `SELECT * FROM contacts WHERE id = ?`,
    args: [id]
  });
  if (rs.rows.length === 0) return null;
  return rs.rows[0] as unknown as Contact;
}

export async function findContactByNameOrEmail(query: string, type?: 'customer' | 'vendor'): Promise<Contact | null> {
  const db = getDb();
  const searchQuery = `%${query.trim()}%`;
  let sql = `SELECT * FROM contacts WHERE (name LIKE ? OR company_name LIKE ? OR email LIKE ?)`;
  const args: any[] = [searchQuery, searchQuery, searchQuery];

  if (type) {
    sql += ` AND type = ?`;
    args.push(type);
  }
  sql += ` LIMIT 1`;

  const rs = await db.execute({ sql, args });
  if (rs.rows.length === 0) return null;
  return rs.rows[0] as unknown as Contact;
}

export async function listContacts(type?: 'customer' | 'vendor'): Promise<Contact[]> {
  const db = getDb();
  let sql = `SELECT * FROM contacts`;
  const args: any[] = [];
  if (type) {
    sql += ` WHERE type = ?`;
    args.push(type);
  }
  sql += ` ORDER BY company_name ASC, name ASC`;
  const rs = await db.execute({ sql, args });
  return rs.rows as unknown as Contact[];
}

export interface TimelineEvent {
  id: string;
  type: 'quote' | 'invoice' | 'payment' | 'po' | 'bill';
  date: string;
  title: string;
  subtitle: string;
  amount: number;
  currency: string;
  status: string;
  doc_id: string;
  doc_type: string;
  doc_number: string;
  created_at?: string;
}

export interface ContactTimelineResponse {
  contact: Contact;
  stats: {
    total_quoted?: number;
    total_invoiced?: number;
    total_paid: number;
    outstanding_ar?: number;
    total_ordered?: number;
    total_billed?: number;
    outstanding_ap?: number;
    quote_count?: number;
    invoice_count?: number;
    po_count?: number;
    bill_count?: number;
    payment_count: number;
  };
  timeline: TimelineEvent[];
  quotations?: any[];
  invoices?: any[];
  payments: any[];
  purchase_orders?: any[];
  vendor_bills?: any[];
}

export async function getContactTimeline(id: string): Promise<ContactTimelineResponse | null> {
  const db = getDb();
  const contact = await getContact(id);
  if (!contact) return null;

  const timeline: TimelineEvent[] = [];

  if (contact.type === 'customer') {
    const quotesRs = await db.execute({
      sql: `SELECT * FROM quotations WHERE customer_id = ? ORDER BY date DESC, created_at DESC`,
      args: [id]
    });
    const quotes = quotesRs.rows as any[];

    const invoicesRs = await db.execute({
      sql: `SELECT * FROM invoices WHERE customer_id = ? ORDER BY date DESC, created_at DESC`,
      args: [id]
    });
    const invoices = invoicesRs.rows as any[];

    const paymentsRs = await db.execute({
      sql: `SELECT p.*, i.invoice_number 
            FROM payments p 
            LEFT JOIN invoices i ON p.invoice_id = i.id 
            WHERE p.contact_id = ? OR p.invoice_id IN (SELECT id FROM invoices WHERE customer_id = ?)
            ORDER BY p.date DESC, p.created_at DESC`,
      args: [id, id]
    });
    const payments = paymentsRs.rows as any[];

    let totalQuoted = 0;
    for (const q of quotes) {
      totalQuoted += Number(q.total_amount || 0);
      timeline.push({
        id: q.id,
        type: 'quote',
        date: q.date,
        title: `Quotation ${q.quote_number}`,
        subtitle: `Drafted proposal for client`,
        amount: Number(q.total_amount || 0),
        currency: q.currency || 'AED',
        status: q.status,
        doc_id: q.id,
        doc_type: 'quote',
        doc_number: q.quote_number,
        created_at: q.created_at
      });
    }

    let totalInvoiced = 0;
    let outstandingAr = 0;
    for (const inv of invoices) {
      totalInvoiced += Number(inv.total_amount || 0);
      outstandingAr += Number(inv.balance_due || 0);
      timeline.push({
        id: inv.id,
        type: 'invoice',
        date: inv.date,
        title: `Tax Invoice ${inv.invoice_number}`,
        subtitle: Number(inv.balance_due) <= 0 ? 'Fully Paid' : `Balance Due: AED ${Number(inv.balance_due).toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
        amount: Number(inv.total_amount || 0),
        currency: inv.currency || 'AED',
        status: inv.status,
        doc_id: inv.id,
        doc_type: 'invoice',
        doc_number: inv.invoice_number,
        created_at: inv.created_at
      });
    }

    let totalPaid = 0;
    for (const p of payments) {
      totalPaid += Number(p.amount || 0);
      timeline.push({
        id: p.id,
        type: 'payment',
        date: p.date,
        title: `Payment Receipt ${p.payment_number}`,
        subtitle: `Received via ${(p.payment_mode === 'bank_transfer' ? 'Bank Wire Transfer' : p.payment_mode || 'Wire')}${p.reference ? ' (Ref: ' + p.reference + ')' : ''}`,
        amount: Number(p.amount || 0),
        currency: p.currency || 'AED',
        status: 'received',
        doc_id: p.id,
        doc_type: 'payment',
        doc_number: p.payment_number,
        created_at: p.created_at
      });
    }

    timeline.sort((a, b) => new Date(b.date || b.created_at || '').getTime() - new Date(a.date || a.created_at || '').getTime());

    return {
      contact,
      stats: {
        total_quoted: totalQuoted,
        total_invoiced: totalInvoiced,
        total_paid: totalPaid,
        outstanding_ar: outstandingAr,
        quote_count: quotes.length,
        invoice_count: invoices.length,
        payment_count: payments.length
      },
      timeline,
      quotations: quotes,
      invoices,
      payments
    };
  } else {
    // Vendor
    const posRs = await db.execute({
      sql: `SELECT * FROM purchase_orders WHERE vendor_id = ? ORDER BY date DESC, created_at DESC`,
      args: [id]
    });
    const pos = posRs.rows as any[];

    const billsRs = await db.execute({
      sql: `SELECT * FROM vendor_bills WHERE vendor_id = ? ORDER BY date DESC, created_at DESC`,
      args: [id]
    });
    const bills = billsRs.rows as any[];

    const paymentsRs = await db.execute({
      sql: `SELECT p.*, b.bill_number 
            FROM payments p 
            LEFT JOIN vendor_bills b ON p.vendor_bill_id = b.id 
            WHERE p.contact_id = ? OR p.vendor_bill_id IN (SELECT id FROM vendor_bills WHERE vendor_id = ?)
            ORDER BY p.date DESC, p.created_at DESC`,
      args: [id, id]
    });
    const payments = paymentsRs.rows as any[];

    let totalOrdered = 0;
    for (const po of pos) {
      totalOrdered += Number(po.total_amount || 0);
      timeline.push({
        id: po.id,
        type: 'po',
        date: po.date,
        title: `Purchase Order ${po.po_number}`,
        subtitle: `Supplier procurement order (${po.shipping_terms || 'Ex-Works'})`,
        amount: Number(po.total_amount || 0),
        currency: po.currency || 'EUR',
        status: po.status,
        doc_id: po.id,
        doc_type: 'po',
        doc_number: po.po_number,
        created_at: po.created_at
      });
    }

    let totalBilled = 0;
    let outstandingAp = 0;
    for (const b of bills) {
      totalBilled += Number(b.total_amount || 0);
      outstandingAp += Number(b.balance_due || 0);
      timeline.push({
        id: b.id,
        type: 'bill',
        date: b.date,
        title: `Vendor Bill ${b.bill_number}`,
        subtitle: Number(b.balance_due) <= 0 ? 'Settled' : `Payable: ${b.currency} ${Number(b.balance_due).toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
        amount: Number(b.total_amount || 0),
        currency: b.currency || 'EUR',
        status: b.status,
        doc_id: b.id,
        doc_type: 'bill',
        doc_number: b.bill_number,
        created_at: b.created_at
      });
    }

    let totalPaid = 0;
    for (const p of payments) {
      totalPaid += Number(p.amount || 0);
      timeline.push({
        id: p.id,
        type: 'payment',
        date: p.date,
        title: `Supplier Payment ${p.payment_number}`,
        subtitle: `Disbursed via ${(p.payment_mode === 'bank_transfer' ? 'Bank Wire Transfer' : p.payment_mode || 'Wire')}`,
        amount: Number(p.amount || 0),
        currency: p.currency || 'AED',
        status: 'paid',
        doc_id: p.id,
        doc_type: 'payment',
        doc_number: p.payment_number,
        created_at: p.created_at
      });
    }

    timeline.sort((a, b) => new Date(b.date || b.created_at || '').getTime() - new Date(a.date || a.created_at || '').getTime());

    return {
      contact,
      stats: {
        total_ordered: totalOrdered,
        total_billed: totalBilled,
        total_paid: totalPaid,
        outstanding_ap: outstandingAp,
        po_count: pos.length,
        bill_count: bills.length,
        payment_count: payments.length
      },
      timeline,
      purchase_orders: pos,
      vendor_bills: bills,
      payments
    };
  }
}
