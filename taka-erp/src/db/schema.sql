-- TAKA Scientific ERP Database Schema (Turso / libSQL)

-- Contacts (Customers and Vendors)
CREATE TABLE IF NOT EXISTS contacts (
  id TEXT PRIMARY KEY,
  type TEXT CHECK(type IN ('customer', 'vendor')) NOT NULL,
  name TEXT NOT NULL,
  company_name TEXT,
  email TEXT,
  phone TEXT,
  trn TEXT,
  billing_address TEXT,
  shipping_address TEXT,
  credit_terms_days INTEGER DEFAULT 30,
  currency TEXT DEFAULT 'AED',
  notes TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Catalog Items
CREATE TABLE IF NOT EXISTS items (
  id TEXT PRIMARY KEY,
  sku TEXT UNIQUE,
  brand TEXT NOT NULL,
  model TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  unit TEXT DEFAULT 'unit',
  cost_price REAL DEFAULT 0,
  cost_currency TEXT DEFAULT 'AED',
  selling_price REAL DEFAULT 0,
  vat_rate REAL DEFAULT 0.05,
  stock_quantity INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Quotations
CREATE TABLE IF NOT EXISTS quotations (
  id TEXT PRIMARY KEY,
  quote_number TEXT UNIQUE NOT NULL,
  customer_id TEXT REFERENCES contacts(id),
  date TEXT NOT NULL,
  expiry_date TEXT NOT NULL,
  subtotal REAL DEFAULT 0,
  vat_amount REAL DEFAULT 0,
  total_amount REAL DEFAULT 0,
  currency TEXT DEFAULT 'AED',
  status TEXT CHECK(status IN ('draft', 'approved', 'sent', 'accepted', 'declined', 'invoiced', 'cancelled')) DEFAULT 'draft',
  notes TEXT,
  terms TEXT,
  sent_at TEXT,
  accepted_at TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Quotation Line Items
CREATE TABLE IF NOT EXISTS quotation_items (
  id TEXT PRIMARY KEY,
  quotation_id TEXT REFERENCES quotations(id) ON DELETE CASCADE,
  item_id TEXT REFERENCES items(id),
  description TEXT NOT NULL,
  quantity REAL NOT NULL,
  unit_price REAL NOT NULL,
  discount_percent REAL DEFAULT 0,
  tax_rate REAL DEFAULT 0.05,
  tax_amount REAL DEFAULT 0,
  total REAL NOT NULL
);

-- Sales Orders
CREATE TABLE IF NOT EXISTS sales_orders (
  id TEXT PRIMARY KEY,
  so_number TEXT UNIQUE NOT NULL,
  quote_id TEXT REFERENCES quotations(id),
  customer_id TEXT REFERENCES contacts(id),
  customer_po_ref TEXT,
  date TEXT NOT NULL,
  delivery_date TEXT,
  total_amount REAL NOT NULL,
  currency TEXT DEFAULT 'AED',
  status TEXT CHECK(status IN ('draft', 'confirmed', 'in_procurement', 'ready_for_dispatch', 'delivered', 'invoiced', 'closed')) DEFAULT 'confirmed',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Sales Order Line Items
CREATE TABLE IF NOT EXISTS sales_order_items (
  id TEXT PRIMARY KEY,
  sales_order_id TEXT REFERENCES sales_orders(id) ON DELETE CASCADE,
  item_id TEXT REFERENCES items(id),
  description TEXT NOT NULL,
  quantity REAL NOT NULL,
  unit_price REAL NOT NULL,
  total REAL NOT NULL
);

-- Purchase Orders (Procurement)
CREATE TABLE IF NOT EXISTS purchase_orders (
  id TEXT PRIMARY KEY,
  po_number TEXT UNIQUE NOT NULL,
  vendor_id TEXT REFERENCES contacts(id),
  sales_order_id TEXT REFERENCES sales_orders(id),
  date TEXT NOT NULL,
  expected_delivery_date TEXT,
  subtotal REAL DEFAULT 0,
  tax_amount REAL DEFAULT 0,
  total_amount REAL DEFAULT 0,
  currency TEXT DEFAULT 'EUR',
  exchange_rate REAL DEFAULT 1.0,
  shipping_terms TEXT DEFAULT 'Ex-Works',
  status TEXT CHECK(status IN ('draft', 'approved', 'sent', 'confirmed', 'shipped', 'received', 'billed', 'cancelled')) DEFAULT 'draft',
  notes TEXT,
  sent_at TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Purchase Order Line Items
CREATE TABLE IF NOT EXISTS purchase_order_items (
  id TEXT PRIMARY KEY,
  purchase_order_id TEXT REFERENCES purchase_orders(id) ON DELETE CASCADE,
  item_id TEXT REFERENCES items(id),
  description TEXT NOT NULL,
  quantity REAL NOT NULL,
  unit_cost REAL NOT NULL,
  total REAL NOT NULL
);

-- Tax Invoices (UAE FTA Compliant)
CREATE TABLE IF NOT EXISTS invoices (
  id TEXT PRIMARY KEY,
  invoice_number TEXT UNIQUE NOT NULL,
  customer_id TEXT REFERENCES contacts(id),
  sales_order_id TEXT REFERENCES sales_orders(id),
  quotation_id TEXT REFERENCES quotations(id),
  date TEXT NOT NULL,
  due_date TEXT NOT NULL,
  subtotal REAL DEFAULT 0,
  vat_amount REAL DEFAULT 0,
  total_amount REAL DEFAULT 0,
  paid_amount REAL DEFAULT 0,
  balance_due REAL DEFAULT 0,
  currency TEXT DEFAULT 'AED',
  status TEXT CHECK(status IN ('draft', 'sent', 'partially_paid', 'paid', 'overdue', 'void')) DEFAULT 'draft',
  sent_at TEXT,
  notes TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Invoice Line Items
CREATE TABLE IF NOT EXISTS invoice_items (
  id TEXT PRIMARY KEY,
  invoice_id TEXT REFERENCES invoices(id) ON DELETE CASCADE,
  item_id TEXT REFERENCES items(id),
  description TEXT NOT NULL,
  quantity REAL NOT NULL,
  unit_price REAL NOT NULL,
  discount_percent REAL DEFAULT 0,
  vat_rate REAL DEFAULT 0.05,
  vat_amount REAL DEFAULT 0,
  total REAL NOT NULL
);

-- Vendor Bills (Accounts Payable)
CREATE TABLE IF NOT EXISTS vendor_bills (
  id TEXT PRIMARY KEY,
  bill_number TEXT UNIQUE NOT NULL,
  vendor_id TEXT REFERENCES contacts(id),
  purchase_order_id TEXT REFERENCES purchase_orders(id),
  date TEXT NOT NULL,
  due_date TEXT NOT NULL,
  total_amount REAL NOT NULL,
  paid_amount REAL DEFAULT 0,
  balance_due REAL DEFAULT 0,
  currency TEXT DEFAULT 'EUR',
  exchange_rate REAL DEFAULT 1.0,
  total_amount_aed REAL NOT NULL,
  status TEXT CHECK(status IN ('pending', 'partially_paid', 'paid', 'overdue')) DEFAULT 'pending',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Payments (Customer Receipts & Vendor Payments)
CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  payment_number TEXT UNIQUE NOT NULL,
  type TEXT CHECK(type IN ('customer_receipt', 'vendor_payment')) NOT NULL,
  contact_id TEXT REFERENCES contacts(id),
  invoice_id TEXT REFERENCES invoices(id),
  vendor_bill_id TEXT REFERENCES vendor_bills(id),
  date TEXT NOT NULL,
  amount REAL NOT NULL,
  currency TEXT DEFAULT 'AED',
  payment_mode TEXT DEFAULT 'bank_transfer',
  reference TEXT,
  notes TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Chart of Accounts (Double-Entry Core)
CREATE TABLE IF NOT EXISTS chart_of_accounts (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT CHECK(type IN ('asset', 'liability', 'equity', 'revenue', 'expense')) NOT NULL,
  description TEXT
);

-- Journal Entries
CREATE TABLE IF NOT EXISTS journal_entries (
  id TEXT PRIMARY KEY,
  entry_number TEXT UNIQUE NOT NULL,
  date TEXT NOT NULL,
  reference_type TEXT,
  reference_id TEXT,
  memo TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Journal Entry Lines (Debits & Credits)
CREATE TABLE IF NOT EXISTS journal_lines (
  id TEXT PRIMARY KEY,
  entry_id TEXT REFERENCES journal_entries(id) ON DELETE CASCADE,
  account_code TEXT REFERENCES chart_of_accounts(code),
  debit REAL DEFAULT 0,
  credit REAL DEFAULT 0,
  description TEXT
);

-- Activity Logs & Audit Trail
CREATE TABLE IF NOT EXISTS activity_logs (
  id TEXT PRIMARY KEY,
  source TEXT,
  event TEXT NOT NULL,
  details TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
