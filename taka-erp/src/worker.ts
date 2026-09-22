import { handleCliqCommand } from './integrations/cliq.js';
import { processNaturalLanguageRequest } from './ai/gemini.js';
import { getQuote, listQuotes, createQuote, updateQuoteStatus } from './modules/quotes.js';
import { getInvoice, listInvoices, createInvoice, createInvoiceFromQuote, updateInvoiceStatus } from './modules/invoicing.js';
import { getPurchaseOrder, listPurchaseOrders, createPurchaseOrder, createVendorBill } from './modules/purchasing.js';
import { recordCustomerPayment, listPayments } from './modules/payments.js';
import { listContacts, createContact, findContactByNameOrEmail, getContact, getContactTimeline } from './modules/contacts.js';
import { listCatalogItems } from './modules/catalog.js';
import { getGeneralLedgerEntries, getBankAccountsSummary } from './modules/ledger.js';
import { renderQuotationHtml, renderInvoiceHtml, renderPurchaseOrderHtml } from './documents/generator.js';
import { getArAgingReport, getApAgingReport, getProfitAndLossReport, getUaeVatReturnReport } from './modules/reports.js';
import { renderDashboardHtml } from './ui/dashboard.js';

export interface Env {
  TURSO_DATABASE_URL: string;
  TURSO_AUTH_TOKEN: string;
  ZEPTOMAIL_SEND_MAIL_TOKEN?: string;
  ZEPTOMAIL_API_URL?: string;
  GEMINI_API_KEY?: string;
  ZOHO_CLIQ_INCOMING_WEBHOOK_URL?: string;
  ZOHO_CLIW_VERIFICATION_TOKEN?: string;
  ERP_API_KEY?: string;
}

const json = (body: any, status = 200): Response => new Response(JSON.stringify(body), {
  status,
  headers: { 'Content-Type': 'application/json' }
});

// Mutating requests require either a session cookie (issued together with the
// dashboard at /) or a valid ERP_API_KEY header. Webhook endpoints are excluded
// here because they authenticate themselves with their own tokens.
function hasWriteAccess(request: Request, env: Env): boolean {
  const cookie = request.headers.get('cookie') || '';
  if (/(?:^|;\s*)takasid=[^;\s]+/.test(cookie)) return true;
  if (env.ERP_API_KEY) {
    const provided = request.headers.get('x-api-key');
    if (provided && provided === env.ERP_API_KEY) return true;
  }
  return false;
}

export default {
  async fetch(request: Request, env: Env, ctx: any): Promise<Response> {
    const url = new URL(request.url);
    const { pathname } = url;

    // Apply env vars to process.env
    if (env.TURSO_DATABASE_URL) process.env.TURSO_DATABASE_URL = env.TURSO_DATABASE_URL;
    if (env.TURSO_AUTH_TOKEN) process.env.TURSO_AUTH_TOKEN = env.TURSO_AUTH_TOKEN;
    if (env.ZEPTOMAIL_SEND_MAIL_TOKEN) process.env.ZEPTOMAIL_SEND_MAIL_TOKEN = env.ZEPTOMAIL_SEND_MAIL_TOKEN;
    if (env.GEMINI_API_KEY) process.env.GEMINI_API_KEY = env.GEMINI_API_KEY;
    if (env.ZOHO_CLIQ_INCOMING_WEBHOOK_URL) process.env.ZOHO_CLIQ_INCOMING_WEBHOOK_URL = env.ZOHO_CLIQ_INCOMING_WEBHOOK_URL;
    if (env.ZOHO_CLIW_VERIFICATION_TOKEN) process.env.ZOHO_CLIW_VERIFICATION_TOKEN = env.ZOHO_CLIW_VERIFICATION_TOKEN;

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Api-Key'
        }
      });
    }

    // Mutation guard: any mutating request (other than the self-authenticating
    // Cliq webhook) needs a session or API key.
    if (request.method === 'POST' && pathname !== '/api/cliq/webhook' && !hasWriteAccess(request, env)) {
      return json({ error: 'Forbidden: open / to create a session, or send a valid X-Api-Key' }, 403);
    }

    // 1. Web Dashboard (SPA Canvas)
    if (pathname === '/' || pathname === '/app') {
      const takasid = `${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
      return new Response(renderDashboardHtml(), {
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'no-cache',
          'Set-Cookie': `takasid=${takasid}; Path=/; HttpOnly; SameSite=Lax`
        }
      });
    }

    // 2. Health check
    if (pathname === '/health' || pathname === '/api/health') {
      return json({
        status: 'ok',
        system: 'TAKA Scientific Agentic ERP',
        cloud: 'Cloudflare Workers',
        database: 'Turso Cloud (AWS EU-West-1)',
        timestamp: new Date().toISOString()
      });
    }

    // 3. Dashboard KPI Summary Stats API
    if (pathname === '/api/dashboard/stats') {
      try {
        const ar = await getArAgingReport();
        const pnl = await getProfitAndLossReport();
        const vat = await getUaeVatReturnReport();
        const quotes = await listQuotes(undefined, 100);
        const invoices = await listInvoices(undefined, 100);
        const pos = await listPurchaseOrders(100);

        return json({
          total_revenue: pnl.revenue,
          gross_profit: pnl.gross_profit,
          gross_margin_percent: pnl.gross_margin_percent,
          net_profit: pnl.net_profit,
          total_ar: ar.total_receivable,
          overdue_ar: (ar.days_1_30 || 0) + (ar.days_31_60 || 0) + (ar.days_60_plus || 0),
          net_vat: vat.net_vat_payable_to_fta,
          quotes_count: quotes.length,
          invoices_count: invoices.length,
          pos_count: pos.length
        });
      } catch (err: any) {
        return json({ error: err.message }, 500);
      }
    }

    // 4. Quotations API
    if (pathname === '/api/quotes') {
      try {
        if (request.method === 'GET') {
          const quotes = await listQuotes(undefined, 50);
          return json(quotes);
        }
        if (request.method === 'POST') {
          const body: any = await request.json();
          let customerId = body.customer_id;
          if (!customerId && (body.customer_name || body.customer_company)) {
            const clientName = (body.customer_company || body.customer_name).trim();
            let client = await findContactByNameOrEmail(clientName, 'customer');
            if (!client) {
              const newId = `cust_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
              client = await createContact({
                id: newId,
                type: 'customer',
                name: clientName,
                company_name: clientName,
                email: body.customer_email || undefined,
                trn: body.customer_trn || undefined,
                credit_terms_days: 30,
                currency: 'AED'
              });
            }
            customerId = client.id;
          }
          const quote = await createQuote({
            ...body,
            customer_id: customerId
          });
          return json(quote);
        }
      } catch (err: any) {
        return json({ error: err.message }, 500);
      }
    }

    // 5. Convert Quote to Invoice
    if (pathname.startsWith('/api/quotes/') && pathname.endsWith('/convert') && request.method === 'POST') {
      try {
        const id = pathname.replace('/api/quotes/', '').replace('/convert', '');
        const inv = await createInvoiceFromQuote(id);
        return json(inv);
      } catch (err: any) {
        return json({ error: err.message }, 500);
      }
    }

    // 5b. Send Quote
    if (pathname.startsWith('/api/quotes/') && pathname.endsWith('/send') && request.method === 'POST') {
      try {
        const id = pathname.replace('/api/quotes/', '').replace('/send', '');
        const quote = await getQuote(id);
        if (!quote) return json({ error: 'Quote not found' }, 404);
        await updateQuoteStatus(quote.id, 'sent');
        return json({ success: true, quote_number: quote.quote_number, status: 'sent' });
      } catch (err: any) {
        return json({ error: err.message }, 500);
      }
    }

    // 5c. Convert Quote to Tax Invoice
    if (pathname.startsWith('/api/quotes/') && pathname.endsWith('/invoice') && request.method === 'POST') {
      try {
        const id = pathname.replace('/api/quotes/', '').replace('/invoice', '');
        const quote = await getQuote(id);
        if (!quote) return json({ error: 'Quote not found' }, 404);
        const inv = await createInvoiceFromQuote(quote.id);
        return json(inv);
      } catch (err: any) {
        return json({ error: err.message }, 500);
      }
    }

    // 6. Invoices API
    if (pathname === '/api/invoices') {
      try {
        if (request.method === 'GET') {
          const invoices = await listInvoices(undefined, 50);
          return json(invoices);
        }
        if (request.method === 'POST') {
          const body: any = await request.json();
          let customerId = body.customer_id;
          if (!customerId && (body.customer_name || body.customer_company)) {
            const clientName = (body.customer_company || body.customer_name).trim();
            let client = await findContactByNameOrEmail(clientName, 'customer');
            if (!client) {
              const newId = `cust_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
              client = await createContact({
                id: newId,
                type: 'customer',
                name: clientName,
                company_name: clientName,
                email: body.customer_email || undefined,
                trn: body.customer_trn || undefined,
                credit_terms_days: 30,
                currency: 'AED'
              });
            }
            customerId = client.id;
          }
          const inv = await createInvoice({
            ...body,
            customer_id: customerId
          });
          return json(inv);
        }
      } catch (err: any) {
        return json({ error: err.message }, 500);
      }
    }

    // 6b. Send Invoice
    if (pathname.startsWith('/api/invoices/') && pathname.endsWith('/send') && request.method === 'POST') {
      try {
        const id = pathname.replace('/api/invoices/', '').replace('/send', '');
        const inv = await getInvoice(id);
        if (!inv) return json({ error: 'Invoice not found' }, 404);
        await updateInvoiceStatus(inv.id, 'sent');
        return json({ success: true, invoice_number: inv.invoice_number, status: 'sent' });
      } catch (err: any) {
        return json({ error: err.message }, 500);
      }
    }

    // 7. Purchase Orders API
    if (pathname === '/api/pos' || pathname === '/api/purchase-orders') {
      try {
        if (request.method === 'GET') {
          const pos = await listPurchaseOrders(50);
          return json(pos);
        }
        if (request.method === 'POST') {
          const body: any = await request.json();
          let vendorId = body.vendor_id;
          if (!vendorId && (body.vendor_name || body.vendor_company)) {
            const vName = (body.vendor_company || body.vendor_name).trim();
            let vendor = await findContactByNameOrEmail(vName, 'vendor');
            if (!vendor) {
              const newId = `vend_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
              vendor = await createContact({
                id: newId,
                type: 'vendor',
                name: vName,
                company_name: vName,
                credit_terms_days: 30,
                currency: body.currency || 'USD'
              });
            }
            vendorId = vendor.id;
          }
          const po = await createPurchaseOrder({
            ...body,
            vendor_id: vendorId
          });
          return json(po);
        }
      } catch (err: any) {
        return json({ error: err.message }, 500);
      }
    }

    // 7b. Convert PO to Vendor Bill
    if (pathname.startsWith('/api/pos/') && pathname.endsWith('/bill') && request.method === 'POST') {
      try {
        const id = pathname.replace('/api/pos/', '').replace('/bill', '');
        const body: any = await request.json().catch(() => ({}));
        const billNum = body.bill_number || `BILL-${Date.now().toString().slice(-6)}`;
        const bill = await createVendorBill(id, billNum, body.amount);
        return json(bill);
      } catch (err: any) {
        return json({ error: err.message }, 500);
      }
    }

    // 8. Payments API
    if (pathname === '/api/payments') {
      try {
        if (request.method === 'GET') {
          const payments = await listPayments(50);
          return json(payments);
        }
        if (request.method === 'POST') {
          const body: any = await request.json();
          const pmt = await recordCustomerPayment(body);
          return json(pmt);
        }
      } catch (err: any) {
        return json({ error: err.message }, 500);
      }
    }

    // 8b. Banking Accounts & Balances API
    if (pathname === '/api/banking/accounts') {
      try {
        const accounts = await getBankAccountsSummary();
        return json(accounts);
      } catch (err: any) {
        return json({ error: err.message }, 500);
      }
    }

    // 9. Contacts API
    if (pathname === '/api/contacts') {
      try {
        if (request.method === 'GET') {
          const contacts = await listContacts();
          return json(contacts);
        }
        if (request.method === 'POST') {
          const body: any = await request.json();
          const contactId = `cnt_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
          const contact = await createContact({ id: contactId, ...body });
          return json(contact);
        }
      } catch (err: any) {
        return json({ error: err.message }, 500);
      }
    }

    // 9b. Contact Timeline & Financial Profile API
    if (pathname.startsWith('/api/contacts/') && pathname.endsWith('/timeline') && request.method === 'GET') {
      try {
        const contactId = pathname.replace('/api/contacts/', '').replace('/timeline', '');
        const timelineData = await getContactTimeline(contactId);
        if (!timelineData) {
          return json({ error: 'Contact not found' }, 404);
        }
        return json(timelineData);
      } catch (err: any) {
        return json({ error: err.message }, 500);
      }
    }

    // 10. Catalog API
    if (pathname === '/api/catalog') {
      try {
        const items = await listCatalogItems(140);
        return json(items);
      } catch (err: any) {
        return json({ error: err.message }, 500);
      }
    }

    // 11. General Ledger API
    if (pathname === '/api/ledger') {
      try {
        const entries = await getGeneralLedgerEntries(50);
        return json(entries);
      } catch (err: any) {
        return json({ error: err.message }, 500);
      }
    }

    // 12. Zoho Cliq Webhook Handler
    if (pathname === '/api/cliq/webhook' && request.method === 'POST') {
      try {
        let payload: any = {};
        const contentType = request.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          payload = await request.json();
        } else if (contentType.includes('application/x-www-form-urlencoded')) {
          const formData = await request.formData();
          payload = Object.fromEntries(formData.entries());
        }

        // Verify the request origin using the shared Cliq verification token
        if (env.ZOHO_CLIW_VERIFICATION_TOKEN) {
          const headerAuth = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
          const provided = payload.token || payload.verification_token || headerAuth;
          if (provided !== env.ZOHO_CLIW_VERIFICATION_TOKEN) {
            return json({ text: 'Unauthorized: invalid verification token' }, 401);
          }
        }

        let command = payload.command || payload.trigger_name || '';
        let args = payload.arguments || '';
        let raw = payload.text || payload.message || '';
        const user = payload.user?.first_name || payload.user_name || 'Team';

        // Strip HTML, encoded entities, blockquote symbols (>), and smart quotes
        let text = String(raw)
          .replace(/<[^>]*>/g, ' ')
          .replace(/&quot;/g, '"')
          .replace(/&ldquo;|&rdquo;/g, '"')
          .replace(/&#39;|&lsquo;|&rsquo;/g, "'")
          .replace(/&amp;/g, '&')
          .replace(/^[\s>|"'\u201C\u201D\u2018\u2019`]+/, '')
          .replace(/["'\u201C\u201D\u2018\u2019`]+$/, '')
          .trim();

        if (!command && text) {
          // Normalize leading conversational words: "create invoice", "please make po", "convert quote to invoice", etc.
          const normalized = text
            .replace(/^(can\s+you\s+|please\s+|kindly\s+|could\s+you\s+)+/i, '')
            .replace(/^(create|make|generate|draft|convert\s+to|convert|issue|record|view|show|check)\s+/i, '')
            .trim();

          const tokens = normalized.split(/\s+/);
          const firstToken = tokens[0]?.toLowerCase().replace(/^\/+/, '') || '';
          const supported = ['quote', 'invoice', 'po', 'pay', 'status', 'report', 'tk-quote', 'tk-invoice', 'tk-po', 'tk-pay', 'tk-report'];

          if (supported.includes(firstToken)) {
            command = firstToken;
            args = normalized
              .slice(tokens[0].length)
              .replace(/^[:,\-\s]+/, '')
              .replace(/^(for|to|of|from)\s+/i, '')
              .trim();
          }
        }

        let response: any;
        if (command) {
          response = await handleCliqCommand(command, args, user);
        } else if (text) {
          const aiReply = await processNaturalLanguageRequest(text, user);
          response = {
            text: aiReply,
            card: {
              theme: 'modern-inline',
              title: '🤖 TAKA ERP Agent'
            }
          };
        } else {
          response = { text: 'Hello! I am TAKA ERP Agent. Type `quote`, `invoice`, `po`, or `report`.' };
        }

        return json(response);
      } catch (err: any) {
        return json({ text: `❌ ERP Error: ${err.message}` }, 500);
      }
    }

    // 13. Document HTML Previews
    if (pathname.startsWith('/api/documents/quote/')) {
      const id = pathname.replace('/api/documents/quote/', '');
      const quote = await getQuote(id);
      if (!quote) return new Response('Quote not found', { status: 404 });
      return new Response(renderQuotationHtml(quote), {
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
      });
    }

    if (pathname.startsWith('/api/documents/invoice/')) {
      const id = pathname.replace('/api/documents/invoice/', '');
      const inv = await getInvoice(id);
      if (!inv) return new Response('Invoice not found', { status: 404 });
      return new Response(renderInvoiceHtml(inv), {
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
      });
    }

    if (pathname.startsWith('/api/documents/po/')) {
      const id = pathname.replace('/api/documents/po/', '');
      const po = await getPurchaseOrder(id);
      if (!po) return new Response('PO not found', { status: 404 });
      return new Response(renderPurchaseOrderHtml(po), {
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
      });
    }

    // 14. Reports API
    if (pathname === '/api/reports/ar') {
      try {
        return json(await getArAgingReport());
      } catch (err: any) {
        return json({ error: err.message }, 500);
      }
    }
    if (pathname === '/api/reports/ap') {
      try {
        return json(await getApAgingReport());
      } catch (err: any) {
        return json({ error: err.message }, 500);
      }
    }
    if (pathname === '/api/reports/pnl') {
      try {
        return json(await getProfitAndLossReport());
      } catch (err: any) {
        return json({ error: err.message }, 500);
      }
    }
    if (pathname === '/api/reports/vat') {
      try {
        return json(await getUaeVatReturnReport());
      } catch (err: any) {
        return json({ error: err.message }, 500);
      }
    }

    return new Response('Not Found', { status: 404 });
  }
};
