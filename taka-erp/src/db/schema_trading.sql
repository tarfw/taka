-- TAKA Scientific ERP — Trading Flow Migration (idempotent)

-- Delivery Notes (goods handover between quotation/PO and tax invoice)
CREATE TABLE IF NOT EXISTS delivery_notes (
  id TEXT PRIMARY KEY,
  dn_number TEXT UNIQUE NOT NULL,
  customer_id TEXT REFERENCES contacts(id),
  source_type TEXT CHECK(source_type IN ('quote', 'invoice', 'sales_order')) DEFAULT 'quote',
  source_id TEXT,
  customer_po_ref TEXT,
  delivery_date TEXT NOT NULL,
  received_by TEXT,
  vehicle TEXT,
  status TEXT CHECK(status IN ('prepared', 'delivered', 'invoiced')) DEFAULT 'prepared',
  notes TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS delivery_note_items (
  id TEXT PRIMARY KEY,
  delivery_note_id TEXT REFERENCES delivery_notes(id) ON DELETE CASCADE,
  item_id TEXT REFERENCES items(id),
  description TEXT NOT NULL,
  quantity REAL NOT NULL
);

-- Deposits accounting (advance payments before delivery)
INSERT OR IGNORE INTO chart_of_accounts (code, name, type, description)
VALUES ('2300', 'Customer Deposits (Advances)', 'liability', 'Advance payments received before delivery (credited on delivery or invoicing)');

-- Bank/bank-card processing fees expense
INSERT OR IGNORE INTO chart_of_accounts (code, name, type, description)
VALUES ('5100', 'Card & Bank Fees', 'expense', 'Payment processing fees (card terminals, wire charges)');
