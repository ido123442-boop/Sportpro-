-- Legacy D1 schema recovered read-only from sportpro-orders-staging (2026-10-06). DDL only, no data.
CREATE TABLE suppliers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT UNIQUE NOT NULL,                -- 'arosport', 'bashgal', ...
  name TEXT NOT NULL,
  platform TEXT,                            -- 'shopify', 'woocommerce', 'wix', 'custom'
  base_url TEXT,
  status TEXT NOT NULL DEFAULT 'INACTIVE',  -- ACTIVE | INACTIVE | REVIEW_REQUIRED
  paused INTEGER NOT NULL DEFAULT 0,        -- Kill switch per supplier
  -- reliability metrics (Section 10)
  successful_orders INTEGER NOT NULL DEFAULT 0,
  failed_orders INTEGER NOT NULL DEFAULT 0,
  stock_failures INTEGER NOT NULL DEFAULT 0,
  price_changes INTEGER NOT NULL DEFAULT 0,
  cancellations INTEGER NOT NULL DEFAULT 0,
  avg_fulfillment_hours REAL,
  tracking_success_rate REAL,               -- 0..1
  reliability_score REAL NOT NULL DEFAULT 0.5, -- 0..1, recomputed after every order
  checkout_method TEXT,                     -- 'cart_permalink' | 'browser' | 'manual'
  shipping_policy TEXT,                    -- JSON: {free_above, base_cost, ...}
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE supplier_products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  supplier_id INTEGER NOT NULL REFERENCES suppliers(id),
  supplier_product_id TEXT NOT NULL,        -- supplier's own product id/handle
  title TEXT,
  url TEXT,
  image_url TEXT,
  active INTEGER NOT NULL DEFAULT 0,
  last_verified_at TEXT, platform TEXT,
  UNIQUE (supplier_id, supplier_product_id)
);

CREATE TABLE supplier_variants (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  supplier_product_id INTEGER NOT NULL REFERENCES supplier_products(id),
  supplier_variant_id TEXT,
  sku TEXT,
  title TEXT,                               -- e.g. "42 / Black"
  price REAL,
  stock INTEGER,
  shipping_cost REAL DEFAULT 0,
  last_checked_at TEXT, size TEXT, color TEXT, barcode TEXT, brand TEXT, currency TEXT DEFAULT 'ILS', last_seen_at TEXT, discovery_status TEXT NOT NULL DEFAULT 'DISCOVERED', raw_price REAL, normalization_rule TEXT,                     -- stale check => RECHECK_REQUIRED
  UNIQUE (supplier_product_id, supplier_variant_id)
);

CREATE TABLE product_mappings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  shopify_product_id TEXT NOT NULL,
  shopify_variant_id TEXT NOT NULL,
  supplier_id INTEGER NOT NULL REFERENCES suppliers(id),
  supplier_product_id TEXT NOT NULL,
  supplier_variant_id TEXT NOT NULL,
  supplier_sku TEXT,
  size TEXT,
  color TEXT,
  mapping_confidence REAL NOT NULL DEFAULT 0, -- 0..1; >= threshold required
  verified_at TEXT,                           -- NULL = never verified
  status TEXT NOT NULL DEFAULT 'MAPPING_REQUIRED', -- VERIFIED | MAPPING_REQUIRED | REJECTED
  created_at TEXT DEFAULT (datetime('now')), verified_by TEXT, verification_method TEXT, previous_status TEXT, live_status TEXT, live_price REAL, live_currency TEXT, live_stock INTEGER, live_checked_at TEXT, live_source TEXT, landed_cost REAL, profit_snapshot TEXT, risk_snapshot TEXT, blocked_reason TEXT, blocked_at TEXT, approved_supplier_price REAL,
  UNIQUE (shopify_variant_id, supplier_id, supplier_variant_id)
);

CREATE TABLE products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  shopify_product_id TEXT NOT NULL,
  shopify_variant_id TEXT NOT NULL,
  handle TEXT,
  title TEXT NOT NULL,
  current_price REAL,
  compare_at_price REAL,
  supplier_price_at_listing REAL,            -- snapshot at time of listing (Section 14)
  listed_at TEXT,
  supplier_ready INTEGER NOT NULL DEFAULT 0, -- FALSE for entire current catalog until verified (Section 34)
  status TEXT NOT NULL DEFAULT 'MAPPING_REQUIRED',
  -- MAPPING_REQUIRED | SUPPLIER_NOT_READY | PRICE_BLOCKED | PRICE_REVIEW | ACTIVE | REVIEW_REQUIRED
  blocked_reason TEXT,                       -- visible reason, never silent (Section 41)
  pilot INTEGER NOT NULL DEFAULT 0,          -- part of the 30-50 product pilot
  updated_at TEXT DEFAULT (datetime('now')), shopify_image_url TEXT, sku TEXT, eligibility_status TEXT, eligibility_blocked_reason TEXT, eligibility_updated_at TEXT,
  UNIQUE (shopify_variant_id)
);

CREATE TABLE orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  shopify_order_id TEXT UNIQUE NOT NULL,     -- procurement lock anchor (Section 22)
  order_number TEXT,
  customer_name TEXT,
  customer_email TEXT,
  customer_phone TEXT,
  shipping_address TEXT,                    -- JSON
  total_price REAL,
  currency TEXT DEFAULT 'ILS',
  financial_status TEXT NOT NULL DEFAULT 'pending', -- paid required to start procurement
  status TEXT NOT NULL DEFAULT 'NEW',
  -- NEW | PAYMENT_PENDING | PAID | PROCESSING | READY_FOR_APPROVAL | APPROVED |
  -- CHECKOUT_READY | PAYMENT_PENDING_SUPPLIER | PURCHASED | TRACKING_PENDING |
  -- SHIPPED | DELIVERED | COMPLETED |
  -- BLOCKED | PRICE_CHANGED | OUT_OF_STOCK | MAPPING_REQUIRED | SUPPLIER_ERROR |
  -- PAYMENT_FAILED | CANCELLED | REFUND_PENDING | REFUNDED
  blocked_reason TEXT,
  kill_switch_queued INTEGER NOT NULL DEFAULT 0, -- queued when kill switch active
  created_at_shopify TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
, is_test INTEGER NOT NULL DEFAULT 0);

CREATE TABLE order_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL REFERENCES orders(id),
  shopify_product_id TEXT,
  shopify_variant_id TEXT,
  title TEXT,
  sku TEXT,
  quantity INTEGER NOT NULL,
  customer_price REAL NOT NULL,             -- unit price paid by customer
  supplier_code TEXT,                       -- resolved supplier for this item
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE supplier_orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL REFERENCES orders(id),
  supplier_id INTEGER NOT NULL REFERENCES suppliers(id),
  status TEXT NOT NULL DEFAULT 'PENDING',
  -- PENDING | READY_FOR_APPROVAL_1 | APPROVED | CHECKOUT_READY |
  -- READY_FOR_APPROVAL_2 | PAYMENT_PENDING_SUPPLIER | PURCHASED |
  -- TRACKING_PENDING | SHIPPED | COMPLETED | BLOCKED | REAPPROVAL_REQUIRED
  items TEXT,                               -- JSON array (never silently drop an item)
  supplier_subtotal REAL,                   -- sum(supplier prices x qty)
  supplier_shipping REAL,
  supplier_total REAL,
  customer_revenue REAL,                    -- what customer paid for these items
  expected_net_profit REAL,
  expected_net_margin REAL,
  checkout_url TEXT,                        -- cart permalink or browser session URL
  cart_snapshot TEXT,                       -- JSON snapshot at approval 2 (Section 19)
  snapshot_matches INTEGER,                 -- 1 = verified unchanged
  blocked_reason TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
, is_test INTEGER NOT NULL DEFAULT 0, checkout_expires_at TEXT);

CREATE TABLE approvals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL REFERENCES orders(id),
  supplier_order_id INTEGER REFERENCES supplier_orders(id),
  stage INTEGER NOT NULL CHECK (stage IN (1,2)), -- 1=order details, 2=supplier payment
  decision TEXT NOT NULL CHECK (decision IN ('APPROVED','REJECTED')),
  approved_by TEXT NOT NULL,                -- admin email
  snapshot TEXT,                            -- JSON of everything shown at approval time
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE supplier_purchases (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  supplier_order_id INTEGER NOT NULL UNIQUE REFERENCES supplier_orders(id),
  supplier_order_number TEXT,               -- proof 1
  transaction_confirmation TEXT,            -- proof 2 (confirmation number / receipt id)
  payment_method TEXT,
  status TEXT NOT NULL DEFAULT 'PAYMENT_UNCONFIRMED', -- PAYMENT_UNCONFIRMED | PURCHASED
  purchased_at TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  CHECK (NOT (status = 'PURCHASED' AND (supplier_order_number IS NULL OR transaction_confirmation IS NULL)))
);

CREATE TABLE tracking (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  supplier_order_id INTEGER NOT NULL REFERENCES supplier_orders(id),
  tracking_number TEXT,
  carrier TEXT,
  shopify_fulfillment_id TEXT,              -- set after Shopify fulfillment created
  status TEXT NOT NULL DEFAULT 'TRACKING_PENDING',
  updated_at TEXT DEFAULT (datetime('now'))
, tracking_url TEXT, shipped_at TEXT, delivered_at TEXT);

CREATE TABLE events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  shopify_webhook_id TEXT UNIQUE,            -- duplicate webhook => INSERT fails => skip
  shopify_event_id TEXT UNIQUE,
  event_type TEXT NOT NULL,                 -- orders/create, orders/paid, orders/cancelled ...
  payload_hash TEXT,
  processed_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE price_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  supplier_id INTEGER NOT NULL REFERENCES suppliers(id),
  supplier_variant_id TEXT NOT NULL,
  price REAL NOT NULL,
  stock INTEGER,
  shipping REAL,
  checked_at TEXT DEFAULT (datetime('now'))
, raw_price REAL);

CREATE TABLE stock_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  supplier_id INTEGER NOT NULL REFERENCES suppliers(id),
  supplier_variant_id TEXT NOT NULL,
  stock INTEGER NOT NULL,
  checked_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE profit_snapshots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER REFERENCES orders(id),
  supplier_order_id INTEGER REFERENCES supplier_orders(id),
  stage TEXT NOT NULL,                      -- LISTING | ORDER | APPROVAL | PURCHASE | FINAL
  customer_price REAL,
  supplier_price REAL,
  supplier_shipping REAL,
  payment_fee REAL,
  shopify_fee REAL,
  other_cost REAL DEFAULT 0,
  net_profit REAL,
  net_margin REAL,                          -- percent
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE system_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,                      -- JSON
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE admin_users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL DEFAULT 'admin',
  totp_secret TEXT,                        -- 2FA
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  actor TEXT NOT NULL,                      -- admin email or 'system'
  action TEXT NOT NULL,                    -- APPROVE_ORDER, REJECT_ORDER, KILL_SWITCH_ON, ...
  entity_type TEXT,
  entity_id TEXT,
  details TEXT,                             -- JSON
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE automation_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER REFERENCES orders(id),
  supplier_order_id INTEGER REFERENCES supplier_orders(id),
  step TEXT NOT NULL,
  status TEXT NOT NULL,                     -- SUCCESS | FAILED | BLOCKED
  message TEXT,
  blocked_reason TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE supplier_shipping (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  supplier_id INTEGER NOT NULL REFERENCES suppliers(id),
  shipping_method TEXT,
  shipping_cost REAL NOT NULL,
  currency TEXT NOT NULL DEFAULT 'ILS',
  effective_from TEXT NOT NULL DEFAULT (datetime('now')),
  verified_at TEXT,          -- NULL => placeholder/unverified => treated as UNKNOWN => BLOCK
  verified_by TEXT,
  source TEXT NOT NULL DEFAULT 'manual'
);

CREATE TABLE alerts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_type TEXT NOT NULL,     -- NEW_ORDER | APPROVAL_REQUIRED | PRICE_CHANGED | STOCK_LOST |
                                -- SUPPLIER_DOWN | PURCHASE_FAILED | TRACKING_RECEIVED | REFUND_REQUIRED
  severity TEXT NOT NULL DEFAULT 'info',   -- info | warning | critical
  entity_type TEXT,
  entity_id TEXT,
  title TEXT NOT NULL,
  details TEXT,                 -- JSON, PII-free
  read INTEGER NOT NULL DEFAULT 0,
  channel TEXT NOT NULL DEFAULT 'dashboard',
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE d1_migrations(
		id         INTEGER PRIMARY KEY AUTOINCREMENT,
		name       TEXT UNIQUE,
		applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE mapping_shipping_eval (
  mapping_id INTEGER PRIMARY KEY, supplier_code TEXT, category TEXT,
  supplier_price REAL, shipping_cost REAL, shipping_status TEXT,
  rule_source TEXT, eval_at TEXT, eval_version TEXT);

CREATE TABLE discovery_candidates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  shopify_product_id TEXT NOT NULL,
  shopify_variant_id TEXT NOT NULL,
  our_sku TEXT, our_size TEXT, our_color TEXT, our_title TEXT, our_price REAL,
  supplier_code TEXT NOT NULL,
  supplier_product_id TEXT,           -- supplier's own product id (numeric for Shopify)
  supplier_variant_id TEXT,           -- supplier's own variant id
  supplier_variant_title TEXT,
  supplier_sku TEXT, supplier_size TEXT, supplier_color TEXT,
  supplier_price REAL, supplier_stock TEXT, last_seen_at TEXT, live_src TEXT,
  match_reason TEXT, confidence REAL,
  status TEXT NOT NULL DEFAULT 'NEW',  -- NEW | APPROVED | REJECTED
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE (shopify_variant_id, supplier_code, supplier_sku)
);

CREATE TABLE shipping_policies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  supplier_code TEXT NOT NULL UNIQUE,
  rules_json TEXT NOT NULL,            -- [{type, cost?, threshold?, categories?, flag?, exclusions?}]
  source TEXT,                        -- official page URL or NULL
  verified_at TEXT,
  verified_by TEXT
);

CREATE TABLE variant_state (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 vid TEXT UNIQUE, pid TEXT, title TEXT, vtitle TEXT, sku TEXT, size TEXT, color TEXT,
 price REAL, image TEXT, status TEXT, tier TEXT, conf REAL, match_method TEXT, match_reason TEXT,
 supplier TEXT, supplier_sku TEXT, supplier_price REAL, live_stock TEXT, last_seen TEXT,
 ship_status TEXT, ship_cost REAL, sell_a REAL, net_a REAL, margin_a REAL,
 sell_b REAL, net_b REAL, margin_b REAL, b_unlocks INTEGER, proposed_sku TEXT, proposed_conf REAL,
 reasons TEXT, updated_at TEXT, live_src TEXT);

CREATE INDEX idx_mappings_variant ON product_mappings(shopify_variant_id);

CREATE INDEX idx_mappings_supplier ON product_mappings(supplier_id);

CREATE INDEX idx_orders_status ON orders(status);

CREATE INDEX idx_supplier_orders_order ON supplier_orders(order_id);

CREATE INDEX idx_price_history_variant ON price_history(supplier_id, supplier_variant_id);

CREATE UNIQUE INDEX idx_supplier_shipping_one
  ON supplier_shipping(supplier_id) WHERE verified_at IS NOT NULL;

CREATE INDEX idx_supplier_shipping_supplier ON supplier_shipping(supplier_id);

CREATE INDEX idx_alerts_created ON alerts(created_at);

CREATE INDEX idx_alerts_unread ON alerts(read);

CREATE INDEX idx_disc_status ON discovery_candidates(status);

CREATE INDEX idx_disc_conf ON discovery_candidates(confidence);

