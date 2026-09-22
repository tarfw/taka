import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getDb } from './client.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function initializeDatabase() {
  const db = getDb();
  console.log('[Init] Initializing TAKA ERP database schema...');

  // 1. Read and execute schema.sql
  const schemaPath = path.join(__dirname, 'schema.sql');
  const schemaSql = fs.readFileSync(schemaPath, 'utf8');

  // Split SQL commands by semicolon
  const statements = schemaSql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0);

  for (const statement of statements) {
    await db.execute(statement);
  }
  console.log('[Init] Database schema created successfully.');

  // 2. Seed Chart of Accounts
  console.log('[Init] Seeding Chart of Accounts...');
  const accounts = [
    { code: '1000', name: 'WIO Bank Main Account (AED)', type: 'asset', description: 'Primary business operating bank account' },
    { code: '1010', name: 'Petty Cash', type: 'asset', description: 'Office and field petty cash' },
    { code: '1200', name: 'Accounts Receivable (Customers)', type: 'asset', description: 'Outstanding customer invoice balances' },
    { code: '1300', name: 'Inventory Asset', type: 'asset', description: 'Warehouse stock at cost' },
    { code: '2000', name: 'Accounts Payable (Vendors)', type: 'liability', description: 'Outstanding supplier bills' },
    { code: '2100', name: 'UAE VAT Output (5% Payable)', type: 'liability', description: 'VAT collected on sales payable to FTA' },
    { code: '2110', name: 'UAE VAT Input (Recoverable)', type: 'asset', description: 'VAT paid on local purchases recoverable from FTA' },
    { code: '3000', name: "Owner's Equity", type: 'equity', description: 'Capital contribution and retained earnings' },
    { code: '4000', name: 'Sales Revenue - Lab Equipment', type: 'revenue', description: 'Revenue from scientific equipment sales' },
    { code: '4100', name: 'Service & Installation Revenue', type: 'revenue', description: 'Turnkey setup and commissioning fees' },
    { code: '5000', name: 'Cost of Goods Sold (COGS)', type: 'expense', description: 'Product purchase cost, freight, and customs' },
    { code: '6000', name: 'Operating & Admin Expenses', type: 'expense', description: 'Salaries, rent, utilities, communications' },
    { code: '6100', name: 'Shipping, Freight & Customs Duty', type: 'expense', description: 'Import clearance and regional delivery' }
  ];

  for (const acc of accounts) {
    await db.execute({
      sql: `INSERT INTO chart_of_accounts (code, name, type, description)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(code) DO UPDATE SET name=excluded.name, type=excluded.type`,
      args: [acc.code, acc.name, acc.type, acc.description]
    });
  }

  // 3. Seed Standard Vendors
  console.log('[Init] Seeding Vendors & Partners...');
  const vendors = [
    {
      id: 'vnd_ika',
      type: 'vendor',
      name: 'IKA-Werke GmbH & Co. KG',
      company_name: 'IKA Germany',
      email: 'orders@ika.de',
      phone: '+49 7633 831-0',
      trn: 'DE142694002',
      billing_address: 'Janke & Kunkel-Str. 10, 79219 Staufen, Germany',
      currency: 'EUR',
      credit_terms_days: 60,
      notes: 'Key supplier for stirrers, shakers, rotary evaporators, calorimeters'
    },
    {
      id: 'vnd_hanil',
      type: 'vendor',
      name: 'Hanil Scientific Inc.',
      company_name: 'Hanil Scientific Korea',
      email: 'overseas@ihanil.com',
      phone: '+82 2 3452 8965',
      trn: 'KR105814578',
      billing_address: '16 Geoma-ro, Songpa-gu, Seoul, Republic of Korea',
      currency: 'USD',
      credit_terms_days: 30,
      notes: 'Centrifuges, freeze dryers, CO2 incubators, deep freezers'
    },
    {
      id: 'vnd_hach',
      type: 'vendor',
      name: 'Hach Lange GmbH',
      company_name: 'Hach Germany / MENA',
      email: 'orders-mena@hach.com',
      phone: '+49 211 54587-0',
      trn: 'DE119363029',
      billing_address: 'Willstätterstraße 11, 40549 Düsseldorf, Germany',
      currency: 'EUR',
      credit_terms_days: 45,
      notes: 'Water analysis, spectrophotometers, turbidimeters, reagents'
    },
    {
      id: 'vnd_toption',
      type: 'vendor',
      name: 'Toption Instrument Co., Ltd.',
      company_name: 'Toption Tech China',
      email: 'info@toptionlab.com',
      phone: '+86 29 8876 3980',
      trn: 'CN916101317',
      billing_address: 'Room 2008, HeBang Building, Gaoxin 1st Road, Xi’an, China',
      currency: 'USD',
      credit_terms_days: 30,
      notes: 'Distillation, extraction systems, glass reactors, spray dryers'
    },
    {
      id: 'vnd_elga',
      type: 'vendor',
      name: 'ELGA LabWater / Veolia Water',
      company_name: 'ELGA LabWater UK',
      email: 'info@elgalabwater.com',
      phone: '+44 203 567 7300',
      trn: 'GB213456789',
      billing_address: 'Lane End Business Park, High Wycombe, HP14 3BY, UK',
      currency: 'EUR',
      credit_terms_days: 45,
      notes: 'PURELAB, CENTRA, MEDICA water purification systems'
    }
  ];

  for (const v of vendors) {
    await db.execute({
      sql: `INSERT INTO contacts (id, type, name, company_name, email, phone, trn, billing_address, currency, credit_terms_days, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET name=excluded.name, email=excluded.email`,
      args: [v.id, v.type, v.name, v.company_name, v.email, v.phone, v.trn, v.billing_address, v.currency, v.credit_terms_days, v.notes]
    });
  }

  // 4. Seed Standard Sample Customers
  console.log('[Init] Seeding Customers...');
  const customers = [
    {
      id: 'cust_adek',
      type: 'customer',
      name: 'Dr. Tariq Al Nuaimi',
      company_name: 'Abu Dhabi Education Council (ADEK)',
      email: 'tariq.nuaimi@adek.gov.ae',
      phone: '+971 2 615 0000',
      trn: '100348920100003',
      billing_address: 'P.O. Box 5600, Sector W-15, Abu Dhabi, United Arab Emirates',
      shipping_address: 'ADEK Central Warehouse, Musaffah, Abu Dhabi, UAE',
      credit_terms_days: 30,
      notes: 'Government institutional educational & laboratory accounts'
    },
    {
      id: 'cust_adnoc',
      type: 'customer',
      name: 'Eng. Mariam Al Mansoori',
      company_name: 'ADNOC Refining & Petrochemicals',
      email: 'm.mansoori@adnoc.ae',
      phone: '+971 2 602 0000',
      trn: '100201948200003',
      billing_address: 'Corniche Road, P.O. Box 898, Abu Dhabi, UAE',
      shipping_address: 'Ruwais Industrial Complex Labs, Ruwais, Abu Dhabi, UAE',
      credit_terms_days: 45,
      notes: 'Petroleum and analytical quality testing equipment'
    },
    {
      id: 'cust_ku',
      type: 'customer',
      name: 'Prof. Salem Al Harthi',
      company_name: 'Khalifa University of Science and Technology',
      email: 'salem.harthi@ku.ac.ae',
      phone: '+971 2 312 3333',
      trn: '100412893000003',
      billing_address: 'Al Saada St, Zone 1, Abu Dhabi, UAE',
      shipping_address: 'Main Campus Lab Wing, Building C, Abu Dhabi, UAE',
      credit_terms_days: 30,
      notes: 'Research centrifuges, spectroscopy, and chemistry equipment'
    }
  ];

  for (const c of customers) {
    await db.execute({
      sql: `INSERT INTO contacts (id, type, name, company_name, email, phone, trn, billing_address, shipping_address, credit_terms_days, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET name=excluded.name, email=excluded.email`,
      args: [c.id, c.type, c.name, c.company_name, c.email, c.phone, c.trn, c.billing_address, c.shipping_address, c.credit_terms_days, c.notes]
    });
  }

  // 5. Seed Items from products.json
  const productsJsonPath = path.join(__dirname, '../../../site/src/data/products.json');
  if (fs.existsSync(productsJsonPath)) {
    console.log('[Init] Seeding items from products.json...');
    const rawData = fs.readFileSync(productsJsonPath, 'utf8');
    const catalog = JSON.parse(rawData.replace(/^\uFEFF/, ''));

    let count = 0;
    if (catalog.categories) {
      for (const cat of catalog.categories) {
        if (cat.brands) {
          for (const brand of cat.brands) {
            if (brand.subcategories) {
              for (const sub of brand.subcategories) {
                if (sub.products) {
                  for (const prod of sub.products) {
                    const sku = `TK-${(brand.name || brand.id).toUpperCase().replace(/[^A-Z0-9]/g, '')}-${(prod.id || 'P').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 14)}-${count + 1}`;
                    
                    // Estimate baseline prices for seed data if not present
                    const costPrice = 4500.0;
                    const sellingPrice = 6200.0;

                    await db.execute({
                      sql: `INSERT INTO items (id, sku, brand, model, name, description, category, cost_price, selling_price, vat_rate, stock_quantity)
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0.05, 5)
                            ON CONFLICT(id) DO UPDATE SET name=excluded.name, selling_price=excluded.selling_price, sku=excluded.sku`,
                      args: [
                        `item_${prod.id}_${count}`,
                        sku,
                        brand.name || brand.id,
                        prod.name,
                        prod.fullName || prod.name,
                        prod.description || prod.fullDescription || '',
                        cat.name,
                        costPrice,
                        sellingPrice
                      ]
                    });
                    count++;
                  }
                }
              }
            }
          }
        }
      }
    }
    console.log(`[Init] Seeded ${count} items into catalog.`);
  }

  console.log('[Init] Database initialization completed successfully!');
}

// Run directly if called as main script
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  initializeDatabase()
    .then(() => process.exit(0))
    .catch(err => {
      console.error('[Init Error]:', err);
      process.exit(1);
    });
}
