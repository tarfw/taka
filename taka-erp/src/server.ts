import express from 'express';
import dotenv from 'dotenv';
import { handleCliqCommand, broadcastToCliqChannel } from './integrations/cliq.js';
import { processNaturalLanguageRequest } from './ai/gemini.js';
import { getQuote, listQuotes, createQuote } from './modules/quotes.js';
import { getInvoice, listInvoices, createInvoice, createInvoiceFromQuote } from './modules/invoicing.js';
import { getPurchaseOrder, listPurchaseOrders, createPurchaseOrder, createVendorBill } from './modules/purchasing.js';
import { recordCustomerPayment, listPayments } from './modules/payments.js';
import { listContacts, createContact, getContactTimeline } from './modules/contacts.js';
import { listCatalogItems } from './modules/catalog.js';
import { getGeneralLedgerEntries, getBankAccountsSummary } from './modules/ledger.js';
import { renderQuotationHtml, renderInvoiceHtml, renderPurchaseOrderHtml } from './documents/generator.js';
import { getArAgingReport, getApAgingReport, getProfitAndLossReport, getUaeVatReturnReport } from './modules/reports.js';
import { renderDashboardHtml } from './ui/dashboard.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS headers
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Api-Key');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// CSRF guard: browsers attach an Origin header to cross-site POSTs. Requests
// without an Origin (curl, server-to-server, Zoho Cliq) are unaffected.
const WEBHOOK_PATHS = ['/api/cliq/webhook', '/api/zeptomail/webhook', '/api/mail/inbound'];
app.use((req, res, next) => {
  if (req.method !== 'POST' || WEBHOOK_PATHS.includes(req.path)) return next();
  const origin = req.headers.origin;
  if (origin) {
    try {
      if (new URL(origin).host !== req.headers.host) {
        return res.status(403).json({ error: 'Forbidden: cross-origin mutation rejected' });
      }
    } catch {
      return res.status(403).json({ error: 'Forbidden: invalid Origin header' });
    }
  }
  // Mutating requests need a session cookie (issued with the dashboard) or a
  // valid ERP_API_KEY header. Webhooks authenticate with their own tokens.
  const cookie = req.headers.cookie || '';
  const hasSession = /(?:^|;\s*)takasid=[^;\s]+/.test(cookie);
  const hasApiKey = process.env.ERP_API_KEY && req.headers['x-api-key'] === process.env.ERP_API_KEY;
  if (!hasSession && !hasApiKey) {
    return res.status(403).json({ error: 'Forbidden: open /app to create a session, or send a valid X-Api-Key' });
  }
  next();
});

// 1. Dashboard Web App
app.get(['/', '/app'], (req, res) => {
  const takasid = `${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Set-Cookie', `takasid=${takasid}; Path=/; HttpOnly; SameSite=Lax`);
  res.send(renderDashboardHtml());
});

// 2. Health Check
app.get(['/health', '/api/health'], (req, res) => {
  res.json({
    status: 'ok',
    system: 'TAKA Scientific Agentic ERP',
    engine: 'Express Node.js',
    timestamp: new Date().toISOString()
  });
});

// 3. Dashboard KPI Summary Stats API
app.get('/api/dashboard/stats', async (req, res) => {
  try {
    const ar = await getArAgingReport();
    const pnl = await getProfitAndLossReport();
    const vat = await getUaeVatReturnReport();
    const quotes = await listQuotes(undefined, 100);
    const invoices = await listInvoices(undefined, 100);
    const pos = await listPurchaseOrders(100);

    res.json({
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
    res.status(500).json({ error: err.message });
  }
});

// 4. Quotes API
app.get('/api/quotes', async (req, res) => {
  try {
    const status = req.query.status as string | undefined;
    res.json(await listQuotes(status, 50));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/quotes', async (req, res) => {
  try {
    const quote = await createQuote(req.body);
    res.json(quote);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/quotes/:id/convert', async (req, res) => {
  try {
    const invoice = await createInvoiceFromQuote(req.params.id);
    res.json(invoice);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 5. Invoices API
app.get('/api/invoices', async (req, res) => {
  try {
    const status = req.query.status as string | undefined;
    res.json(await listInvoices(status, 50));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/invoices', async (req, res) => {
  try {
    const invoice = await createInvoice(req.body);
    res.json(invoice);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 6. Purchase Orders API
app.get('/api/pos', async (req, res) => {
  try {
    res.json(await listPurchaseOrders(50));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/pos', async (req, res) => {
  try {
    const po = await createPurchaseOrder(req.body);
    res.json(po);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/pos/:id/bill', async (req, res) => {
  try {
    const billNum = req.body?.bill_number || `BILL-${Date.now().toString().slice(-6)}`;
    const bill = await createVendorBill(req.params.id, billNum, req.body?.amount);
    res.json(bill);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 7. Payments API
app.get('/api/payments', async (req, res) => {
  try {
    res.json(await listPayments(50));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/payments', async (req, res) => {
  try {
    const payment = await recordCustomerPayment(req.body);
    res.json(payment);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 8. Contacts API
app.get('/api/contacts', async (req, res) => {
  try {
    res.json(await listContacts());
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/contacts', async (req, res) => {
  try {
    const contactId = `cnt_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const contact = await createContact({ id: contactId, ...req.body });
    res.json(contact);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/contacts/:id/timeline', async (req, res) => {
  try {
    const timelineData = await getContactTimeline(req.params.id);
    if (!timelineData) return res.status(404).json({ error: 'Contact not found' });
    res.json(timelineData);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 9. Catalog API
app.get('/api/catalog', async (req, res) => {
  try {
    res.json(await listCatalogItems(140));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 10. General Ledger & Banking API
app.get('/api/ledger', async (req, res) => {
  try {
    res.json(await getGeneralLedgerEntries(50));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/banking/accounts', async (req, res) => {
  try {
    res.json(await getBankAccountsSummary());
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 11. Document HTML Previews (Clean Swiss Corporate Design)
app.get('/api/documents/quote/:id', async (req, res) => {
  const quote = await getQuote(req.params.id);
  if (!quote) return res.status(404).send('Quote not found');
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(renderQuotationHtml(quote));
});

app.get('/api/documents/invoice/:id', async (req, res) => {
  const inv = await getInvoice(req.params.id);
  if (!inv) return res.status(404).send('Invoice not found');
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(renderInvoiceHtml(inv));
});

app.get('/api/documents/po/:id', async (req, res) => {
  const po = await getPurchaseOrder(req.params.id);
  if (!po) return res.status(404).send('Purchase Order not found');
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(renderPurchaseOrderHtml(po));
});

// 12. Reports API
app.get('/api/reports/ar', async (req, res) => {
  try {
    res.json(await getArAgingReport());
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/reports/ap', async (req, res) => {
  try {
    res.json(await getApAgingReport());
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/reports/pnl', async (req, res) => {
  try {
    res.json(await getProfitAndLossReport());
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/reports/vat', async (req, res) => {
  try {
    res.json(await getUaeVatReturnReport());
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 13. Zoho Cliq Webhook Handler
app.post('/api/cliq/webhook', async (req, res) => {
  try {
    const payload = req.body;

    // Verify the request origin using the shared Cliq verification token
    if (process.env.ZOHO_CLIQ_VERIFICATION_TOKEN) {
      const provided = payload.token || payload.verification_token || (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
      if (provided !== process.env.ZOHO_CLIQ_VERIFICATION_TOKEN) {
        return res.status(401).json({ text: 'Unauthorized: invalid verification token' });
      }
    }

    const command = payload.command || payload.trigger_name || '';
    const text = payload.text || payload.arguments || payload.message || '';
    const user = payload.user?.first_name || payload.user_name || 'Team';

    let response;
    if (command) {
      response = await handleCliqCommand(command, text, user);
    } else if (text) {
      const aiReply = await processNaturalLanguageRequest(text, user);
      response = { text: aiReply };
    } else {
      response = { text: 'Hello! I am TAKA ERP Agent. Type `/quote`, `/invoice`, `/po`, or `/report` to get started.' };
    }

    res.json(response);
  } catch (err: any) {
    res.status(500).json({ text: `❌ Internal ERP Error: ${err.message}` });
  }
});

// 14. ZeptoMail Tracking Webhook
app.post('/api/zeptomail/webhook', async (req, res) => {
  try {
    const event = req.body;
    if (event.event_type === 'email_opened') {
      const channelUrl = process.env.ZOHO_CLIQ_INCOMING_WEBHOOK_URL;
      if (channelUrl) {
        await broadcastToCliqChannel(channelUrl, {
          text: `👀 *Client Email Opened!* ${event.email_address} just opened email "${event.subject}"`
        });
      }
    }
    res.json({ status: 'received' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 15. Inbound RFQ Hook
app.post('/api/mail/inbound', async (req, res) => {
  try {
    const { from, subject, body } = req.body;
    const aiResponse = await processNaturalLanguageRequest(`Customer email from ${from} regarding "${subject}": ${body}`);
    const channelUrl = process.env.ZOHO_CLIQ_INCOMING_WEBHOOK_URL;
    if (channelUrl) {
      await broadcastToCliqChannel(channelUrl, {
        text: `📥 *New Inbound RFQ Received*\n*From:* ${from}\n*Subject:* ${subject}\n\n*Agent Summary:*\n${aiResponse}`
      });
    }
    res.json({ status: 'processed', summary: aiResponse });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Start Server
app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`  TAKA Scientific Agentic ERP Server is RUNNING`);
  console.log(`  Port: ${PORT}`);
  console.log(`  App: http://localhost:${PORT}/app`);
  console.log(`  Health: http://localhost:${PORT}/health`);
  console.log(`=======================================================`);
});
