import dotenv from 'dotenv';
import { createQuote, getQuote, listQuotes } from '../modules/quotes.js';
import { createInvoiceFromQuote, getInvoice, listInvoices } from '../modules/invoicing.js';
import { createPurchaseOrder, getPurchaseOrder } from '../modules/purchasing.js';
import { recordCustomerPayment } from '../modules/payments.js';
import { getArAgingReport, getProfitAndLossReport, getUaeVatReturnReport } from '../modules/reports.js';
import { findContactByNameOrEmail, createContact } from '../modules/contacts.js';
import { searchCatalog } from '../modules/catalog.js';

dotenv.config();

export interface CliqMessageResponse {
  text: string;
  card?: {
    theme?: string;
    title?: string;
    thumbnail?: string;
    sections?: { type: string; text: string }[];
    buttons?: { label: string; type: string; key?: string; url?: string }[];
  };
  buttons?: any[];
  slides?: { type: string; title: string; data: { [key: string]: string }[] }[];
}

export async function handleCliqCommand(command: string, args: string, user: string): Promise<CliqMessageResponse> {
  const cleanCmd = command.toLowerCase().replace('/', '').trim();

  switch (cleanCmd) {
    case 'quote':
    case 'tk-quote':
      return await handleQuoteCommand(args, user);

    case 'invoice':
    case 'tk-invoice':
      return await handleInvoiceCommand(args, user);

    case 'po':
    case 'tk-po':
      return await handlePoCommand(args, user);

    case 'pay':
    case 'tk-pay':
      return await handlePayCommand(args, user);

    case 'status':
    case 'tk-status':
      return await handleStatusCommand(args);

    case 'report':
    case 'tk-report':
      return await handleReportCommand(args);

    default:
      return {
        text: `*TAKA ERP Bot Commands*\n` +
              `• \`/quote [client] [item] [qty] [price]\` — Draft quotation\n` +
              `• \`/invoice [quote#]\` — Convert quote to tax invoice\n` +
              `• \`/po [vendor] [item] [qty] [cost]\` — Generate supplier PO\n` +
              `• \`/pay [inv#] [amount] [reference]\` — Record customer payment\n` +
              `• \`/status [ref#]\` — Check status of quote, PO, or invoice\n` +
              `• \`/report [ar | pnl | vat]\` — View real-time business reports`
      };
  }
}

async function handleQuoteCommand(args: string, user: string): Promise<CliqMessageResponse> {
  if (!args || args.trim().length === 0) {
    const recent = await listQuotes(undefined, 5);
    const listText = recent.map(q => `• *${q.quote_number}* | ${q.customer_company || q.customer_name} | AED ${q.total_amount} [${q.status}]`).join('\n');
    return {
      text: `*Recent Quotations:*\n${listText || 'No quotes found.'}\n\n*To create a quote:* \`/quote [client] [item] [qty] [price]\``
    };
  }

  // Parse: client, item, qty, price
  const parts = args.split(',').map(s => s.trim());
  const clientQuery = parts[0] || 'ADEK';
  const itemQuery = parts[1] || 'Centrifuge';
  const qty = parts[2] ? parseFloat(parts[2]) : 1;
  const unitPrice = parts[3] ? parseFloat(parts[3]) : 6500;

  let client = await findContactByNameOrEmail(clientQuery, 'customer');
  if (!client) {
    const newId = `cust_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    client = await createContact({
      id: newId,
      type: 'customer',
      name: clientQuery,
      company_name: clientQuery,
      credit_terms_days: 30,
      currency: 'AED'
    });
  }

  const quote = await createQuote({
    customer_id: client.id,
    items: [
      {
        description: itemQuery,
        quantity: qty,
        unit_price: unitPrice
      }
    ]
  });

  const previewUrl = `https://taka-erp.wetartaka.workers.dev/api/documents/quote/${quote.id}`;

  const summaryText = 
    `*Customer:* ${quote.customer_company || quote.customer_name}\n` +
    `*Items:* ${qty}x ${itemQuery}\n` +
    `*Subtotal:* AED ${quote.subtotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}\n` +
    `*UAE VAT (5%):* AED ${quote.vat_amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}\n` +
    `*Grand Total:* AED ${quote.total_amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}\n` +
    `*Status:* Draft (Pending Approval)\n\n` +
    `🔗 [View Official TAKA Quotation Document](${previewUrl})`;

  return {
    text: summaryText,
    card: {
      theme: 'modern-inline',
      title: `📄 Quotation: ${quote.quote_number}`
    },
    buttons: [
      {
        label: 'View Proposal',
        type: '+',
        key: 'view_prop_btn',
        action: {
          type: 'open.url',
          data: {
            web: previewUrl
          }
        }
      }
    ]
  };
}

async function handleInvoiceCommand(args: string, user: string): Promise<CliqMessageResponse> {
  if (!args || args.trim().length === 0) {
    const recent = await listInvoices(undefined, 5);
    const listText = recent.map(i => `• *${i.invoice_number}* | ${i.customer_company || i.customer_name} | AED ${i.total_amount} | Due: ${i.due_date} [${i.status}]`).join('\n');
    return {
      text: `*Recent Tax Invoices:*\n${listText || 'No invoices found.'}\n\n*To create an invoice from a quote:* \`/invoice [quote#]\``
    };
  }

  let quoteRef = args.trim();
  const match = quoteRef.match(/(QTN-\d+|[a-z0-9_]{5,})/i);
  if (match) {
    quoteRef = match[0];
  } else {
    quoteRef = quoteRef.replace(/^(for|of|to|quote|quote#)\s+/i, '').trim();
  }

  const quote = await getQuote(quoteRef);
  if (!quote) {
    return { text: `⚠️ Quotation *"${quoteRef}"* not found.` };
  }

  try {
    // Guarded path: throws if this quotation was already invoiced,
    // and automatically marks the quotation as invoiced.
    const inv = await createInvoiceFromQuote(quote.id);

    const previewUrl = `https://taka-erp.wetartaka.workers.dev/api/documents/invoice/${inv.id}`;

    return {
      text: `🧾 Tax Invoice *${inv.invoice_number}* generated by @${user}\n\n🔗 [View Official FTA Tax Invoice](${previewUrl})`,
      card: {
        theme: 'modern-inline',
        title: `Tax Invoice: ${inv.invoice_number}`,
        sections: [
          {
            type: 'text',
            text: `*Customer:* ${inv.customer_company || inv.customer_name}\n` +
                  `*Customer TRN:* ${inv.customer_trn || 'N/A'}\n` +
                  `*Invoice Date:* ${inv.date} | *Due Date:* ${inv.due_date}\n` +
                  `*Total Amount:* AED ${inv.total_amount.toLocaleString()} (incl. 5% VAT)\n` +
                  `*Balance Outstanding:* AED ${inv.balance_due.toLocaleString()}`
          }
        ]
      },
      buttons: [
        {
          label: 'View Invoice',
          type: '+',
          key: `view_inv_${inv.id}`,
          action: {
            type: 'open.url',
            data: {
              web: previewUrl
            }
          }
        }
      ]
    };
  } catch (err: any) {
    return { text: `⚠️ Could not generate invoice: ${err.message}` };
  }
}

async function handlePoCommand(args: string, user: string): Promise<CliqMessageResponse> {
  const parts = args.split(',').map(s => s.trim());
  const vendorQuery = (parts[0] || 'Hanil').replace(/^(for|of|to|from)\s+/i, '').trim();
  const itemQuery = parts[1] || 'Hanil Centrifuge Micro 17';
  const qty = parts[2] ? parseFloat(parts[2]) : 1;
  const unitCost = parts[3] ? parseFloat(parts[3]) : 1200;

  const vendor = await findContactByNameOrEmail(vendorQuery, 'vendor');
  if (!vendor) {
    return { text: `⚠️ Vendor *"${vendorQuery}"* not found. Available: IKA, Hanil, Hach, Toption, ELGA.` };
  }

  const po = await createPurchaseOrder({
    vendor_id: vendor.id,
    currency: vendor.currency || 'EUR',
    items: [{ description: itemQuery, quantity: qty, unit_cost: unitCost }]
  });

  const previewUrl = `https://taka-erp.wetartaka.workers.dev/api/documents/po/${po.id}`;

  return {
    text: `📦 Purchase Order *${po.po_number}* created by @${user}\n\n🔗 [View Official Supplier PO](${previewUrl})`,
    card: {
      theme: 'modern-inline',
      title: `PO: ${po.po_number}`,
      sections: [
        {
          type: 'text',
          text: `*Supplier:* ${po.vendor_company || po.vendor_name}\n` +
                `*Items:* ${qty}x ${itemQuery}\n` +
                `*Total:* ${po.currency} ${po.total_amount.toLocaleString()}\n` +
                `*Expected Dispatch:* ${po.expected_delivery_date}\n` +
                `*Status:* Draft PO`
        }
      ]
    },
    buttons: [
      {
        label: 'View PO Document',
        type: '+',
        key: `view_po_${po.id}`,
        action: {
          type: 'open.url',
          data: {
            web: previewUrl
          }
        }
      }
    ]
  };
}

async function handlePayCommand(args: string, user: string): Promise<CliqMessageResponse> {
  const parts = args.split(',').map(s => s.trim());
  let invRef = (parts[0] || '').replace(/^(for|of|to|inv|invoice|invoice#)\s+/i, '').trim();
  const match = invRef.match(/(TK-INV\S*|\d{4})/i);
  if (match) invRef = match[0];
  const amount = parts[1] ? parseFloat(parts[1]) : 0;
  const ref = parts[2] || 'WIO Wire Transfer';

  if (!invRef || isNaN(amount) || amount <= 0) {
    return { text: `⚠️ Usage: \`/pay [invoice#], [amount], [reference]\`\nExample: \`/pay TK-INV-2026-0001, 15000, Wire ref #48291\`` };
  }

  try {
    const result = await recordCustomerPayment({
      invoice_id_or_number: invRef,
      amount,
      reference: ref
    });

    return {
      text: `💰 Payment Recorded by @${user}`,
      card: {
        theme: 'modern-inline',
        title: `Payment Receipt: ${result.payment_number}`,
        sections: [
          {
            type: 'text',
            text: `*Customer:* ${result.customer_name}\n` +
                  `*Invoice:* ${result.invoice_number}\n` +
                  `*Amount Paid:* AED ${result.amount_paid.toLocaleString()}\n` +
                  `*Remaining Balance:* AED ${result.balance_remaining.toLocaleString()}\n` +
                  `*Invoice Status:* ${result.status.toUpperCase()}\n` +
                  `*Ledger Entry:* Recorded in Wio Bank (1000) and Accounts Receivable (1200)`
          }
        ]
      }
    };
  } catch (err: any) {
    return { text: `❌ Error recording payment: ${err.message}` };
  }
}

async function handleStatusCommand(ref: string): Promise<CliqMessageResponse> {
  const cleanRef = ref.trim();
  if (!cleanRef) return { text: `⚠️ Usage: \`/status [ref#]\` (e.g. \`/status TK-INV-2026-0001\` or \`/status QTN-0001\`)` };

  // Check quote
  const quote = await getQuote(cleanRef);
  if (quote) {
    return {
      text: `📋 *Status for Quotation ${quote.quote_number}*\n` +
            `• Client: ${quote.customer_company || quote.customer_name}\n` +
            `• Amount: AED ${quote.total_amount.toLocaleString()} (incl. VAT)\n` +
            `• Status: *${quote.status.toUpperCase()}*\n` +
            `• Date: ${quote.date} | Expiry: ${quote.expiry_date}`
    };
  }

  // Check invoice
  const inv = await getInvoice(cleanRef);
  if (inv) {
    return {
      text: `🧾 *Status for Tax Invoice ${inv.invoice_number}*\n` +
            `• Customer: ${inv.customer_company || inv.customer_name}\n` +
            `• Total Amount: AED ${inv.total_amount.toLocaleString()}\n` +
            `• Paid Amount: AED ${inv.paid_amount.toLocaleString()}\n` +
            `• Balance Due: *AED ${inv.balance_due.toLocaleString()}*\n` +
            `• Status: *${inv.status.toUpperCase()}* | Due: ${inv.due_date}`
    };
  }

  // Check PO
  const po = await getPurchaseOrder(cleanRef);
  if (po) {
    return {
      text: `📦 *Status for Purchase Order ${po.po_number}*\n` +
            `• Supplier: ${po.vendor_company || po.vendor_name}\n` +
            `• Total: ${po.currency} ${po.total_amount.toLocaleString()}\n` +
            `• Status: *${po.status.toUpperCase()}*\n` +
            `• Expected Dispatch: ${po.expected_delivery_date || 'TBD'}`
    };
  }

  return { text: `⚠️ Reference *"${cleanRef}"* not found in Quotations, Invoices, or POs.` };
}

async function handleReportCommand(reportType: string): Promise<CliqMessageResponse> {
  const type = (reportType || 'ar').toLowerCase().trim();

  if (type === 'ar' || type === 'aging') {
    const ar = await getArAgingReport();
    const invRows = ar.invoices.map(i => `• ${i.invoice_number} (${i.customer}): AED ${i.balance_due.toLocaleString()} [${i.bucket}]`).join('\n');

    return {
      text: `📊 *Accounts Receivable (AR) Aging Report*`,
      card: {
        theme: 'modern-inline',
        title: `Total Receivables: AED ${ar.total_receivable.toLocaleString()}`,
        sections: [
          {
            type: 'text',
            text: `*Current (Not Due):* AED ${ar.current.toLocaleString()}\n` +
                  `*1-30 Days Overdue:* AED ${ar.days_1_30.toLocaleString()}\n` +
                  `*31-60 Days Overdue:* AED ${ar.days_31_60.toLocaleString()}\n` +
                  `*60+ Days Overdue:* AED ${ar.days_60_plus.toLocaleString()}\n\n` +
                  `*Outstanding Invoices:*\n${invRows || 'All invoices settled! 🎉'}`
          }
        ]
      }
    };
  }

  if (type === 'pnl' || type === 'profit') {
    const pnl = await getProfitAndLossReport();
    return {
      text: `📈 *Profit & Loss Statement (Year 2026)*`,
      card: {
        theme: 'modern-inline',
        title: `Net Profit: AED ${pnl.net_profit.toLocaleString()}`,
        sections: [
          {
            type: 'text',
            text: `*Sales Revenue:* AED ${pnl.revenue.toLocaleString()}\n` +
                  `*Cost of Goods Sold (COGS):* AED ${pnl.cost_of_goods_sold.toLocaleString()}\n` +
                  `*Gross Margin:* AED ${pnl.gross_profit.toLocaleString()} (${pnl.gross_margin_percent}%)\n` +
                  `*Operating Expenses:* AED ${pnl.operating_expenses.toLocaleString()}\n` +
                  `*Net Operating Income:* AED ${pnl.net_profit.toLocaleString()}`
          }
        ]
      }
    };
  }

  if (type === 'vat') {
    const vat = await getUaeVatReturnReport();
    return {
      text: `🏛️ *UAE FTA VAT Return Summary (TRN: 100482910400003)*`,
      card: {
        theme: 'modern-inline',
        title: `Net VAT Payable to FTA: AED ${vat.net_vat_payable_to_fta.toLocaleString()}`,
        sections: [
          {
            type: 'text',
            text: `*Box 1a (Standard Rated Supplies 5%):* AED ${vat.box_1a_standard_supplies_amount.toLocaleString()} | Output VAT: AED ${vat.box_1a_output_vat_due.toLocaleString()}\n` +
                  `*Box 9 (Standard Rated Expenses 5%):* AED ${vat.box_9_standard_expenses_amount.toLocaleString()} | Recoverable VAT: AED ${vat.box_9_recoverable_vat.toLocaleString()}\n` +
                  `*Box 14 (Net VAT Payable):* *AED ${vat.net_vat_payable_to_fta.toLocaleString()}*`
          }
        ]
      }
    };
  }

  return { text: `⚠️ Unknown report type: "${type}". Supported: \`/report ar\`, \`/report pnl\`, \`/report vat\`` };
}

export async function broadcastToCliqChannel(channelWebhookUrl: string, message: { text: string; card?: any }) {
  if (!channelWebhookUrl) {
    console.log(`[Cliq Broadcast Simulation]: ${message.text}`);
    return;
  }
  try {
    await fetch(channelWebhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message)
    });
  } catch (err: any) {
    console.error('[Cliq Channel Webhook Error]:', err);
  }
}
