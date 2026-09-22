import dotenv from 'dotenv';
import { createQuote } from '../modules/quotes.js';
import { createInvoice } from '../modules/invoicing.js';
import { createPurchaseOrder } from '../modules/purchasing.js';
import { recordCustomerPayment } from '../modules/payments.js';
import { getArAgingReport, getProfitAndLossReport, getUaeVatReturnReport } from '../modules/reports.js';
import { findContactByNameOrEmail, createContact } from '../modules/contacts.js';
import { searchCatalog } from '../modules/catalog.js';
import { handleCliqCommand } from '../integrations/cliq.js';

dotenv.config();

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

export async function processNaturalLanguageRequest(userPrompt: string, userName = 'user'): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    // If API key is not configured, use heuristic regex parser so it never crashes
    return await fallbackIntentHandler(userPrompt, userName);
  }

  const systemInstruction = `You are TAKA Assistant, the AI Operations and ERP Agent for TAKA Scientific Trading LLC (UAE).
Your role is to understand team instructions, extract ERP intents, and generate quotations, purchase orders, invoices, payments, and financial reports.
Company currency is AED. Standard UAE VAT is 5%.
Known clients: ADEK, ADNOC, Khalifa University.
Known suppliers: IKA Germany, Hanil Scientific Korea, Hach Germany, Toption China, ELGA UK.

Available actions you can trigger:
1. create_quote: client name, line items (description, quantity, unit_price).
2. create_invoice: quote number or client name.
3. create_po: supplier name, items, unit cost.
4. record_payment: invoice number, amount, reference.
5. show_report: 'ar', 'pnl', 'vat'.

If the user asks to perform an ERP action, reply with a concise, professional confirmation of what action should be taken or executed.`;

  try {
    const res = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemInstruction }] },
        contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
        generationConfig: { temperature: 0.2, maxOutputTokens: 1000 }
      })
    });

    const data: any = await res.json();
    if (!res.ok) {
      console.warn('[Gemini API Warning]:', data);
      return await fallbackIntentHandler(userPrompt, userName);
    }

    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text;
    return reply || (await fallbackIntentHandler(userPrompt, userName));
  } catch (err: any) {
    console.error('[Gemini Request Error]:', err);
    return await fallbackIntentHandler(userPrompt, userName);
  }
}

// Robust fallback parser when no API key is supplied
async function fallbackIntentHandler(prompt: string, userName: string): Promise<string> {
  const lower = prompt.toLowerCase();

  if (lower.includes('ar') || lower.includes('receivable') || lower.includes('aging')) {
    const ar = await getArAgingReport();
    return `📊 Total Receivables: AED ${ar.total_receivable.toLocaleString()}\n` +
           `• Current: AED ${ar.current.toLocaleString()}\n` +
           `• 1-30 Days: AED ${ar.days_1_30.toLocaleString()}\n` +
           `• 31-60 Days: AED ${ar.days_31_60.toLocaleString()}\n` +
           `• 60+ Days: AED ${ar.days_60_plus.toLocaleString()}`;
  }

  if (lower.includes('pnl') || lower.includes('profit') || lower.includes('margin')) {
    const pnl = await getProfitAndLossReport();
    return `📈 P&L Summary (2026):\n` +
           `• Revenue: AED ${pnl.revenue.toLocaleString()}\n` +
           `• COGS: AED ${pnl.cost_of_goods_sold.toLocaleString()}\n` +
           `• Gross Profit: AED ${pnl.gross_profit.toLocaleString()} (${pnl.gross_margin_percent}%)\n` +
           `• Net Profit: AED ${pnl.net_profit.toLocaleString()}`;
  }

  if (lower.includes('vat') || lower.includes('tax')) {
    const vat = await getUaeVatReturnReport();
    return `🏛️ UAE FTA VAT Return (5%):\n` +
           `• Box 1a Output VAT: AED ${vat.box_1a_output_vat_due.toLocaleString()}\n` +
           `• Box 9 Recoverable VAT: AED ${vat.box_9_recoverable_vat.toLocaleString()}\n` +
           `• Net VAT Due: AED ${vat.net_vat_payable_to_fta.toLocaleString()}`;
  }

  if (lower.includes('invoice')) {
    const match = prompt.match(/(QTN-\d+|[0-9]{4}|TK-INV\S*)/i);
    const ref = match ? match[0] : prompt.replace(/.*invoice/i, '').replace(/^(for|of|to|\:|\s|,)+/i, '').trim();
    if (ref) {
      const res = await handleCliqCommand('invoice', ref, userName);
      return res.text;
    }
  }

  if (lower.includes('po') || lower.includes('purchase order')) {
    const poArgs = prompt.replace(/.*(purchase order|po)/i, '').replace(/^(for|of|to|\:|\s|,)+/i, '').trim();
    const res = await handleCliqCommand('po', poArgs || 'Hanil, Centrifuge, 1, 1200', userName);
    return res.text;
  }

  if (lower.includes('pay') || lower.includes('payment')) {
    const payArgs = prompt.replace(/.*(payment|pay)/i, '').replace(/^(for|of|to|\:|\s|,)+/i, '').trim();
    const res = await handleCliqCommand('pay', payArgs, userName);
    return res.text;
  }

  if (lower.includes('quote')) {
    // Extract rest of prompt after 'quote'
    const quoteIndex = lower.indexOf('quote');
    const args = prompt.slice(quoteIndex + 5).replace(/^[:\s,]+/, '').trim();
    return await handleDynamicFallbackQuote(args, userName);
  }

  return `Hello @${userName}, I am your TAKA ERP Agent. You can ask me to draft quotes, convert invoices, check AR aging, create POs, or view P&L reports.`;
}

async function handleDynamicFallbackQuote(args: string, userName: string): Promise<string> {
  const cleanArgs = args.replace(/^["'“`]+/, '').replace(/["'”`]+$/, '').trim();
  const parts = cleanArgs.split(',').map(s => s.trim());
  const clientQuery = parts[0] || 'ADEK';
  const itemQuery = parts[1] || 'Scientific Laboratory Equipment';
  const qty = parts[2] ? parseFloat(parts[2]) : 1;
  const unitPrice = parts[3] ? parseFloat(parts[3]) : 10000;

  let contact = await findContactByNameOrEmail(clientQuery, 'customer');
  if (!contact) {
    const newId = `cust_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    contact = await createContact({
      id: newId,
      type: 'customer',
      name: clientQuery,
      company_name: clientQuery,
      credit_terms_days: 30,
      currency: 'AED'
    });
  }

  const q = await createQuote({
    customer_id: contact.id,
    items: [{ description: itemQuery, quantity: qty, unit_price: unitPrice }]
  });

  const previewUrl = `https://taka-erp.wetartaka.workers.dev/api/documents/quote/${q.id}`;

  return `✅ Quotation *${q.quote_number}* Drafted for ${contact.company_name || contact.name}\n` +
         `• Item: ${qty}x ${itemQuery}\n` +
         `• Unit Price: AED ${unitPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}\n` +
         `• Subtotal: AED ${q.subtotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}\n` +
         `• UAE VAT (5%): AED ${q.vat_amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}\n` +
         `• Grand Total: AED ${q.total_amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}\n\n` +
         `🔗 [Click to View Official Proposal Letter & BOQ](${previewUrl})`;
}

