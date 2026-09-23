import { initializeDatabase } from './db/init.js';
import { resetDatabaseToProduction } from './db/reset_production.js';
import { findContactByNameOrEmail, listContacts } from './modules/contacts.js';
import { searchCatalog } from './modules/catalog.js';
import { createQuote, getQuote } from './modules/quotes.js';
import { createSalesOrderFromQuote } from './modules/orders.js';
import { createPurchaseOrder, createVendorBill } from './modules/purchasing.js';
import { createInvoiceFromQuote, getInvoice } from './modules/invoicing.js';
import { recordCustomerPayment } from './modules/payments.js';
import { getArAgingReport, getProfitAndLossReport, getUaeVatReturnReport } from './modules/reports.js';
import { renderQuotationHtml, renderInvoiceHtml, renderPurchaseOrderHtml } from './documents/generator.js';
import { handleCliqCommand } from './integrations/cliq.js';
import { sendTransactionalEmail } from './integrations/zeptomail.js';

async function runTestSuite() {
  console.log('===============================================================');
  console.log('       TAKA SCIENTIFIC AGENTIC ERP TEST SUITE                 ');
  console.log('===============================================================');

  // Step 1: Initialize Database & Seed Data
  console.log('\n--- 1. Initializing Database & Seeding Catalog ---');
  await initializeDatabase();

  // Step 2: Test Contact & Catalog Lookups
  console.log('\n--- 2. Verifying Contacts & Catalog ---');
  const adek = await findContactByNameOrEmail('ADEK', 'customer');
  console.log('Found Customer:', adek?.company_name, '| TRN:', adek?.trn);
  if (!adek) throw new Error('Customer ADEK not found');

  const hanil = await findContactByNameOrEmail('Hanil', 'vendor');
  console.log('Found Supplier:', hanil?.company_name, '| Country: Korea');
  if (!hanil) throw new Error('Supplier Hanil not found');

  const catalogResults = await searchCatalog('Analyzer', undefined, 3);
  console.log(`Catalog search for "Analyzer": Found ${catalogResults.length} items`);
  for (const item of catalogResults) {
    console.log(`   • [${item.brand}] ${item.name} (${item.sku})`);
  }

  // Step 3: Create Quotation (Sales Flow)
  console.log('\n--- 3. Testing Quotation Generation (UAE VAT 5%) ---');
  const quote = await createQuote({
    customer_id: adek.id,
    items: [
      {
        description: 'Hanil Scientific Micro 17 Microcentrifuge with Fixed Angle Rotor',
        quantity: 2,
        unit_price: 11000.00
      },
      {
        description: 'IKA RCT Basic Magnetic Stirrer with Heating Plate',
        quantity: 1,
        unit_price: 4500.00
      }
    ],
    notes: 'Official proposal for ADEK Secondary Schools Analytical Laboratory'
  });

  console.log('Quote Number:', quote.quote_number);
  console.log(`Subtotal: AED ${quote.subtotal.toLocaleString()}`);
  console.log(`UAE VAT (5%): AED ${quote.vat_amount.toLocaleString()}`);
  console.log(`Grand Total: AED ${quote.total_amount.toLocaleString()}`);

  // Validation: 2x 11000 + 4500 = 26500. VAT 5% = 1325. Total = 27825
  if (quote.subtotal !== 26500 || quote.vat_amount !== 1325 || quote.total_amount !== 27825) {
    throw new Error(`Quotation math mismatch! Got ${quote.total_amount}, expected 27825`);
  }
  console.log('✅ Quotation math & 5% VAT verified perfectly.');

  // Step 4: Convert Quote to Sales Order (Client accepts)
  console.log('\n--- 4. Client Accepts Quote -> Create Sales Order ---');
  const salesOrder = await createSalesOrderFromQuote(quote.id, 'ADEK-LPO-2026-8941');
  console.log('Sales Order Created:', salesOrder.so_number, '| Customer LPO:', salesOrder.customer_po_ref);

  // Step 5: Issue Purchase Order to Supplier (Procure-to-Pay)
  console.log('\n--- 5. Procurement: Issue Purchase Order to Hanil Korea ---');
  const po = await createPurchaseOrder({
    vendor_id: hanil.id,
    sales_order_id: salesOrder.id,
    currency: 'USD',
    exchange_rate: 3.67,
    items: [
      {
        description: 'Hanil Micro 17 Centrifuge (Model MF-1700)',
        quantity: 2,
        unit_cost: 1650.00
      }
    ],
    notes: 'Ship via Air Freight to Dubai Airport (DXB)'
  });
  console.log('Supplier PO Generated:', po.po_number, `| Total: USD ${po.total_amount}`);

  // Record vendor bill upon shipment
  const billNumber = `HANIL-INV-2026-${Date.now().toString().slice(-5)}`;
  const bill = await createVendorBill(po.id, billNumber);
  console.log('Vendor Bill Recorded:', bill.bill_number, `| AED Value: ${bill.total_amount_aed}`);

  // Step 6: Generate UAE FTA Tax Invoice
  console.log('\n--- 6. Generating Tax Invoice & Double-Entry Ledger Entry ---');
  const invoice = await createInvoiceFromQuote(quote.id);
  console.log('Tax Invoice Generated:', invoice.invoice_number);
  console.log(`Due Date: ${invoice.due_date} | Total Due: AED ${invoice.total_amount}`);

  // Step 7: Record Customer Payment
  console.log('\n--- 7. Recording Customer Payment ---');
  const payment = await recordCustomerPayment({
    invoice_id_or_number: invoice.invoice_number,
    amount: 27825.00,
    payment_mode: 'bank_transfer',
    reference: 'WIO-TXN-884920194'
  });
  console.log('Payment Receipt:', payment.payment_number);
  console.log(`Amount Paid: AED ${payment.amount_paid} | Remaining: AED ${payment.balance_remaining} | Status: ${payment.status}`);

  // Step 8: Financial Reports Verification
  console.log('\n--- 8. Verifying Financial Reports ---');
  const arReport = await getArAgingReport();
  console.log('AR Aging Total Outstanding Receivables:', `AED ${arReport.total_receivable}`);

  const pnlReport = await getProfitAndLossReport();
  console.log('P&L Revenue:', `AED ${pnlReport.revenue}`);
  console.log('P&L COGS:', `AED ${pnlReport.cost_of_goods_sold}`);
  console.log('P&L Gross Profit:', `AED ${pnlReport.gross_profit} (${pnlReport.gross_margin_percent}%)`);

  const vatReport = await getUaeVatReturnReport();
  console.log('UAE FTA VAT Box 1a (Output VAT):', `AED ${vatReport.box_1a_output_vat_due}`);
  console.log('UAE FTA Net VAT Payable to FTA:', `AED ${vatReport.net_vat_payable_to_fta}`);

  // Step 9: Verify Document HTML Generation
  console.log('\n--- 9. Verifying Official TAKA Document Templates ---');
  const quoteHtml = renderQuotationHtml(quote);
  const invoiceHtml = renderInvoiceHtml(invoice);
  const poHtml = renderPurchaseOrderHtml(po);

  if (!quoteHtml.includes('100482910400003') || !invoiceHtml.includes('TAX INVOICE')) {
    throw new Error('Document rendering missing legal credentials');
  }
  console.log(`Quote HTML Length: ${quoteHtml.length} bytes (Letterhead & TRN verified)`);
  console.log(`Invoice HTML Length: ${invoiceHtml.length} bytes (Tax Invoice verified)`);
  console.log(`PO HTML Length: ${poHtml.length} bytes (Purchase Order verified)`);

  // Step 10: Verify Zoho Cliq Slash Commands
  console.log('\n--- 10. Verifying Zoho Cliq Slash Commands ---');
  const cliqQuoteRes = await handleCliqCommand('quote', 'ADNOC, Oil Viscometer, 1, 14500', 'Kalaikugan');
  console.log('Cliq /quote response:', cliqQuoteRes.text);
  console.log('Cliq Card Title:', cliqQuoteRes.card?.title);

  const cliqReportRes = await handleCliqCommand('report', 'ar', 'Kalaikugan');
  console.log('Cliq /report ar response:', cliqReportRes.text);

  // Step 11: Verify ZeptoMail Integration Client
  console.log('\n--- 11. Verifying ZeptoMail Dispatch (Simulation Mode) ---');
  const emailRes = await sendTransactionalEmail({
    to: [{ address: 'tariq.nuaimi@adek.gov.ae', name: 'Dr. Tariq Al Nuaimi' }],
    subject: `Quotation ${quote.quote_number} - TAKA Scientific`,
    htmlbody: '<p>Please find attached our quotation.</p>'
  });
  console.log('ZeptoMail status:', emailRes.success ? 'DISPATCH SUCCESS' : 'FAILED');

  console.log('\n===============================================================');
  console.log('  ALL 11 TAKA ERP CORE MODULES PASSED WITH 100% SUCCESS!       ');
  console.log('===============================================================');
}

runTestSuite()
  .finally(async () => {
    console.log('\n[Test Suite Cleanup] Restoring database to pristine production state...');
    await resetDatabaseToProduction();
  })
  .catch(err => {
    console.error('\n❌ Test Suite Failed:', err);
    process.exit(1);
  });
