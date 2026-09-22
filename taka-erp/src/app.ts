import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { handleCliqCommand } from './integrations/cliq.js';
import { processNaturalLanguageRequest } from './ai/gemini.js';
import { getQuote, listQuotes, createQuote, updateQuoteStatus } from './modules/quotes.js';
import { getInvoice, listInvoices, createInvoice, createInvoiceFromQuote, updateInvoiceStatus } from './modules/invoicing.js';
import { getPurchaseOrder, listPurchaseOrders, createPurchaseOrder, createVendorBill } from './modules/purchasing.js';
import { recordCustomerPayment, listPayments } from './modules/payments.js';
import { listContacts, createContact, findContactByNameOrEmail, getContactTimeline } from './modules/contacts.js';
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

const app = new Hono<{ Bindings: Env }>();

// Runtime setting resolver: works in Workers (c.env) and under Node (process.env).
const setting = (c: any, key: string): string | undefined =>
  c.env?.[key] ?? process.env[key];

// ---------------------------------------------------------------------------
// Global middleware
// ---------------------------------------------------------------------------

// Copy Worker bindings into process.env (libsql client / gemini / cliq read them).
app.use('*', async (c, next) => {
  const b = ((c.env || {}) as unknown) as Record<string, string>;
  for (const key of Object.keys(b)) {
    if (b[key]) (process.env as any)[key] = b[key];
  }
  await next();
});

app.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'X-Api-Key'],
}));

// Mutation guard: any mutating request (other than the self-authenticating
// Cliq webhook) needs a session cookie or a valid ERP_API_KEY header.
app.use('*', async (c, next) => {
  if (c.req.method !== 'POST' || c.req.path === '/api/cliq/webhook') return next();
  const cookie = c.req.header('cookie') || '';
  const hasSession = /(?:^|;\s*)takasid=[^;\s]+/.test(cookie);
  const apiKey = setting(c, 'ERP_API_KEY');
  const hasApiKey = !!apiKey && c.req.header('x-api-key') === apiKey;
  if (!hasSession && !hasApiKey) {
    return c.json({ error: 'Forbidden: open / to create a session, or send a valid X-Api-Key' }, 403);
  }
  return next();
});

// ---------------------------------------------------------------------------
// Dashboard & health
// ---------------------------------------------------------------------------

const dashboardHandler = (c: any) => {
  const takasid = `${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
  c.header('Cache-Control', 'no-cache');
  c.header('Set-Cookie', `takasid=${takasid}; Path=/; HttpOnly; SameSite=Lax`);
  return c.html(renderDashboardHtml());
};

app.get('/', dashboardHandler);
app.get('/app', dashboardHandler);

const healthPayload = (c: any) => c.json({
  status: 'ok',
  system: 'TAKA Scientific Agentic ERP',
  cloud: 'Cloudflare Workers',
  database: 'Turso Cloud (AWS EU-West-1)',
  timestamp: new Date().toISOString()
});

app.get('/health', healthPayload);
app.get('/api/health', healthPayload);

// ---------------------------------------------------------------------------
// KPI summary
// ---------------------------------------------------------------------------

app.get('/api/dashboard/stats', async (c) => {
  const ar = await getArAgingReport();
  const pnl = await getProfitAndLossReport();
  const vat = await getUaeVatReturnReport();
  const quotes = await listQuotes(undefined, 100);
  const invoices = await listInvoices(undefined, 100);
  const pos = await listPurchaseOrders(100);

  return c.json({
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
});

// ---------------------------------------------------------------------------
// Quotations
// ---------------------------------------------------------------------------

async function resolveCustomerId(body: any, type: 'customer' | 'vendor'): Promise<string | undefined> {
  const directId = type === 'customer' ? body.customer_id : body.vendor_id;
  if (directId) return directId;
  const name = type === 'customer'
    ? (body.customer_company || body.customer_name)
    : (body.vendor_company || body.vendor_name);
  if (!name) return undefined;
  const trimmed = name.trim();
  let contact = await findContactByNameOrEmail(trimmed, type);
  if (!contact) {
    const prefix = type === 'customer' ? 'cust' : 'vend';
    contact = await createContact({
      id: `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      type,
      name: trimmed,
      company_name: trimmed,
      email: type === 'customer' ? (body.customer_email || undefined) : undefined,
      trn: type === 'customer' ? (body.customer_trn || undefined) : undefined,
      credit_terms_days: 30,
      currency: type === 'vendor' ? (body.currency || 'USD') : 'AED'
    });
  }
  return contact.id;
}

app.get('/api/quotes', async (c) => c.json(await listQuotes(undefined, 50)));

app.post('/api/quotes', async (c) => {
  const body: any = await c.req.json();
  const customer_id = await resolveCustomerId(body, 'customer');
  return c.json(await createQuote({ ...body, customer_id }));
});

app.post('/api/quotes/:id/convert', async (c) =>
  c.json(await createInvoiceFromQuote(c.req.param('id'))));

app.post('/api/quotes/:id/send', async (c) => {
  const quote = await getQuote(c.req.param('id'));
  if (!quote) return c.json({ error: 'Quote not found' }, 404);
  await updateQuoteStatus(quote.id, 'sent');
  return c.json({ success: true, quote_number: quote.quote_number, status: 'sent' });
});

app.post('/api/quotes/:id/invoice', async (c) => {
  const quote = await getQuote(c.req.param('id'));
  if (!quote) return c.json({ error: 'Quote not found' }, 404);
  return c.json(await createInvoiceFromQuote(quote.id));
});

// ---------------------------------------------------------------------------
// Invoices
// ---------------------------------------------------------------------------

app.get('/api/invoices', async (c) => c.json(await listInvoices(undefined, 50)));

app.post('/api/invoices', async (c) => {
  const body: any = await c.req.json();
  const customer_id = await resolveCustomerId(body, 'customer');
  return c.json(await createInvoice({ ...body, customer_id }));
});

app.post('/api/invoices/:id/send', async (c) => {
  const inv = await getInvoice(c.req.param('id'));
  if (!inv) return c.json({ error: 'Invoice not found' }, 404);
  await updateInvoiceStatus(inv.id, 'sent');
  return c.json({ success: true, invoice_number: inv.invoice_number, status: 'sent' });
});

// ---------------------------------------------------------------------------
// Purchase Orders
// ---------------------------------------------------------------------------

app.get('/api/pos', async (c) => c.json(await listPurchaseOrders(50)));
app.get('/api/purchase-orders', async (c) => c.json(await listPurchaseOrders(50)));

app.post('/api/pos', async (c) => {
  const body: any = await c.req.json();
  const vendor_id = await resolveCustomerId(body, 'vendor');
  return c.json(await createPurchaseOrder({ ...body, vendor_id }));
});

app.post('/api/purchase-orders', async (c) => {
  const body: any = await c.req.json();
  const vendor_id = await resolveCustomerId(body, 'vendor');
  return c.json(await createPurchaseOrder({ ...body, vendor_id }));
});

app.post('/api/pos/:id/bill', async (c) => {
  const body: any = await c.req.json().catch(() => ({}));
  const billNum = body.bill_number || `BILL-${Date.now().toString().slice(-6)}`;
  return c.json(await createVendorBill(c.req.param('id'), billNum, body.amount));
});

// ---------------------------------------------------------------------------
// Payments
// ---------------------------------------------------------------------------

app.get('/api/payments', async (c) => c.json(await listPayments(50)));

app.post('/api/payments', async (c) =>
  c.json(await recordCustomerPayment(await c.req.json())));

// ---------------------------------------------------------------------------
// Banking / Contacts / Catalog / Ledger
// ---------------------------------------------------------------------------

app.get('/api/banking/accounts', async (c) => c.json(await getBankAccountsSummary()));

app.get('/api/contacts', async (c) => c.json(await listContacts()));

app.post('/api/contacts', async (c) => {
  const body: any = await c.req.json();
  const contactId = `cnt_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  return c.json(await createContact({ id: contactId, ...body }));
});

app.get('/api/contacts/:id/timeline', async (c) => {
  const timelineData = await getContactTimeline(c.req.param('id'));
  if (!timelineData) return c.json({ error: 'Contact not found' }, 404);
  return c.json(timelineData);
});

app.get('/api/catalog', async (c) => c.json(await listCatalogItems(140)));

app.get('/api/ledger', async (c) => c.json(await getGeneralLedgerEntries(50)));

// ---------------------------------------------------------------------------
// Reports
// ---------------------------------------------------------------------------

app.get('/api/reports/ar', async (c) => c.json(await getArAgingReport()));
app.get('/api/reports/ap', async (c) => c.json(await getApAgingReport()));
app.get('/api/reports/pnl', async (c) => c.json(await getProfitAndLossReport()));
app.get('/api/reports/vat', async (c) => c.json(await getUaeVatReturnReport()));

// ---------------------------------------------------------------------------
// Document previews
// ---------------------------------------------------------------------------

app.get('/api/documents/quote/:id', async (c) => {
  const quote = await getQuote(c.req.param('id'));
  if (!quote) return c.text('Quote not found', 404);
  return c.html(renderQuotationHtml(quote));
});

app.get('/api/documents/invoice/:id', async (c) => {
  const inv = await getInvoice(c.req.param('id'));
  if (!inv) return c.text('Invoice not found', 404);
  return c.html(renderInvoiceHtml(inv));
});

app.get('/api/documents/po/:id', async (c) => {
  const po = await getPurchaseOrder(c.req.param('id'));
  if (!po) return c.text('PO not found', 404);
  return c.html(renderPurchaseOrderHtml(po));
});

// ---------------------------------------------------------------------------
// Zoho Cliq webhook (authenticates with its own shared token)
// ---------------------------------------------------------------------------

app.post('/api/cliq/webhook', async (c) => {
  let payload: any = {};
  const contentType = c.req.header('content-type') || '';
  if (contentType.includes('application/json')) {
    payload = await c.req.json();
  } else if (contentType.includes('application/x-www-form-urlencoded')) {
    const formData = await c.req.formData();
    payload = Object.fromEntries(formData.entries());
  }

  // Verify the request origin using the shared Cliq verification token
  const expectedToken = setting(c, 'ZOHO_CLIW_VERIFICATION_TOKEN');
  if (expectedToken) {
    const headerAuth = (c.req.header('authorization') || '').replace(/^Bearer\s+/i, '');
    const provided = payload.token || payload.verification_token || headerAuth;
    if (provided !== expectedToken) {
      return c.json({ text: 'Unauthorized: invalid verification token' }, 401);
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
      card: { theme: 'modern-inline', title: '🤖 TAKA ERP Agent' }
    };
  } else {
    response = { text: 'Hello! I am TAKA ERP Agent. Type `quote`, `invoice`, `po`, or `report`.' };
  }

  return c.json(response);
});

// ---------------------------------------------------------------------------
// Fallbacks
// ---------------------------------------------------------------------------

app.onError((err, c) => c.json({ error: err.message }, 500));

app.notFound((c) => c.text('Not Found', 404));

export default app;
