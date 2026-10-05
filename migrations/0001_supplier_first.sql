-- Sportpro supplier-first schema (D1 / SQLite). NOT APPLIED to any environment yet.
-- Additive: creates new tables only; does not touch or drop legacy tables.
-- Apply to STAGING first, after a D1 export backup:
--   wrangler d1 export <staging-db> --remote --output backup.sql
--   wrangler d1 migrations apply <staging-db> --remote

PRAGMA foreign_keys = ON;

-- A. supplier registry
CREATE TABLE IF NOT EXISTS supplier_catalog (
  supplier_id TEXT PRIMARY KEY,
  supplier_name TEXT NOT NULL,
  domain TEXT NOT NULL,
  catalog_method TEXT NOT NULL DEFAULT 'UNKNOWN',
  catalog_url TEXT, product_feed TEXT, variant_feed TEXT,
  price_available TEXT NOT NULL DEFAULT 'UNKNOWN',
  stock_available TEXT NOT NULL DEFAULT 'UNKNOWN',
  stock_granularity TEXT NOT NULL DEFAULT 'UNKNOWN',
  sku_available TEXT NOT NULL DEFAULT 'UNKNOWN',
  barcode_available TEXT NOT NULL DEFAULT 'UNKNOWN',
  size_available TEXT NOT NULL DEFAULT 'UNKNOWN',
  color_available TEXT NOT NULL DEFAULT 'UNKNOWN',
  checkout_method TEXT NOT NULL DEFAULT 'UNKNOWN',
  checkout_verified INTEGER NOT NULL DEFAULT 0 CHECK (checkout_verified IN (0,1)),
  checkout_evidence_ref TEXT,
  status TEXT NOT NULL DEFAULT 'CANDIDATE' CHECK (status IN ('CANDIDATE','CATALOG_OK','SHIPPING_OK','CHECKOUT_VERIFIED','BLOCKED')),
  last_scan_at TEXT,
  freshness_ttl_hours INTEGER NOT NULL DEFAULT 24,
  risk_level TEXT NOT NULL DEFAULT 'UNKNOWN',
  CHECK (checkout_verified = 0 OR checkout_evidence_ref IS NOT NULL),
  CHECK (status <> 'CHECKOUT_VERIFIED' OR checkout_verified = 1)
);

-- B. supplier products (raw + normalized kept separately; never deleted, only status changes)
CREATE TABLE IF NOT EXISTS supplier_products (
  id INTEGER PRIMARY KEY,
  supplier_id TEXT NOT NULL REFERENCES supplier_catalog(supplier_id),
  supplier_product_id TEXT NOT NULL,
  title_raw TEXT, brand_raw TEXT, model_raw TEXT, product_type_raw TEXT, url TEXT, image_urls TEXT,
  title_normalized TEXT, brand_normalized TEXT, model_normalized TEXT,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','UNAVAILABLE','STALE','REMOVED','BLOCKED')),
  first_seen_at TEXT NOT NULL, last_seen_at TEXT NOT NULL, last_available_at TEXT,
  source_hash TEXT NOT NULL,
  UNIQUE (supplier_id, supplier_product_id)
);

-- C. supplier variants
CREATE TABLE IF NOT EXISTS supplier_variants (
  id INTEGER PRIMARY KEY,
  supplier_product_ref INTEGER NOT NULL REFERENCES supplier_products(id),
  supplier_id TEXT NOT NULL REFERENCES supplier_catalog(supplier_id),
  supplier_variant_id TEXT NOT NULL,
  sku_raw TEXT, barcode_raw TEXT, size_raw TEXT, color_raw TEXT, options_raw TEXT, grams INTEGER,
  sku_normalized TEXT, size_normalized TEXT, color_normalized TEXT, option_signature TEXT,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','UNAVAILABLE','STALE','REMOVED','BLOCKED')),
  first_seen_at TEXT NOT NULL, last_seen_at TEXT NOT NULL, last_available_at TEXT,
  UNIQUE (supplier_id, supplier_variant_id)
);
CREATE INDEX IF NOT EXISTS idx_sv_sku ON supplier_variants(supplier_id, sku_normalized);

-- D. supplier prices (append-only observations)
CREATE TABLE IF NOT EXISTS supplier_prices (
  id INTEGER PRIMARY KEY,
  supplier_variant_ref INTEGER NOT NULL REFERENCES supplier_variants(id),
  price_raw TEXT, price REAL CHECK (price IS NULL OR price > 0), currency TEXT,
  observed_at TEXT NOT NULL, source TEXT NOT NULL, verification_run_ref INTEGER
);

-- E. supplier stock (append-only observations; tri-state, never a quantity)
CREATE TABLE IF NOT EXISTS supplier_stock (
  id INTEGER PRIMARY KEY,
  supplier_variant_ref INTEGER NOT NULL REFERENCES supplier_variants(id),
  stock_raw TEXT,
  stock_status TEXT NOT NULL CHECK (stock_status IN ('AVAILABLE','UNAVAILABLE','UNKNOWN')),
  observed_at TEXT NOT NULL, source TEXT NOT NULL, verification_run_ref INTEGER
);

-- F. supplier shipping policies (versioned, with evidence)
CREATE TABLE IF NOT EXISTS supplier_shipping (
  id INTEGER PRIMARY KEY,
  supplier_id TEXT NOT NULL REFERENCES supplier_catalog(supplier_id),
  rule_json TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('VERIFIED','CONDITIONAL','UNKNOWN','EXCEPTION')),
  source_url TEXT, source_type TEXT, source_text TEXT,
  verified_at TEXT, expires_at TEXT, exceptions TEXT,
  superseded_by INTEGER REFERENCES supplier_shipping(id),
  CHECK (status = 'UNKNOWN' OR (source_url IS NOT NULL AND verified_at IS NOT NULL))
);

-- G. product matches (one active mapping per Shopify variant; one approved listing per supplier variant)
CREATE TABLE IF NOT EXISTS product_matches (
  id INTEGER PRIMARY KEY,
  shopify_variant_id TEXT NOT NULL,
  shopify_product_id TEXT NOT NULL,
  supplier_variant_ref INTEGER NOT NULL REFERENCES supplier_variants(id),
  confidence REAL NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  match_class TEXT NOT NULL CHECK (match_class IN ('AUTO_CANDIDATE','HIGH_CONFIDENCE','MANUAL_REVIEW','REJECT')),
  match_method TEXT NOT NULL,
  evidence_json TEXT NOT NULL, evidence_hash TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PROPOSED' CHECK (status IN ('PROPOSED','REVIEW_REQUIRED','MAPPING_APPROVED','REJECTED','SUPERSEDED')),
  approved_by TEXT, approved_at TEXT, created_at TEXT NOT NULL,
  -- approval requires an identified approver and a class that may be approved
  CHECK (status <> 'MAPPING_APPROVED' OR (approved_by IS NOT NULL AND approved_at IS NOT NULL AND match_class IN ('AUTO_CANDIDATE','HIGH_CONFIDENCE')))
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_match_active_shopify ON product_matches(shopify_variant_id) WHERE status IN ('PROPOSED','REVIEW_REQUIRED','MAPPING_APPROVED');
CREATE UNIQUE INDEX IF NOT EXISTS uq_match_approved_supplier ON product_matches(supplier_variant_ref) WHERE status = 'MAPPING_APPROVED';

-- H. verification runs
CREATE TABLE IF NOT EXISTS verification_runs (
  id INTEGER PRIMARY KEY,
  supplier_variant_ref INTEGER NOT NULL REFERENCES supplier_variants(id),
  method TEXT NOT NULL, url TEXT NOT NULL, http_status INTEGER,
  url_ok INTEGER NOT NULL CHECK (url_ok IN (0,1)), variant_exists INTEGER NOT NULL CHECK (variant_exists IN (0,1)),
  stock_status TEXT NOT NULL CHECK (stock_status IN ('AVAILABLE','UNAVAILABLE','UNKNOWN')),
  price REAL, currency TEXT, checked_at TEXT NOT NULL
);

-- I. pricing decisions (policy versioned)
CREATE TABLE IF NOT EXISTS pricing_decisions (
  id INTEGER PRIMARY KEY,
  shopify_variant_id TEXT NOT NULL, policy_version TEXT NOT NULL,
  supplier_cost REAL NOT NULL, supplier_shipping REAL, payment_fee REAL, selling_price REAL NOT NULL,
  net_profit REAL, net_margin_pct REAL, markup_pct REAL, min_profitable_price REAL,
  pass INTEGER NOT NULL CHECK (pass IN (0,1)), reason TEXT, decided_at TEXT NOT NULL,
  CHECK (pass = 0 OR supplier_shipping IS NOT NULL)
);

-- J. sellable decisions (append-only history; latest row per variant is current)
CREATE TABLE IF NOT EXISTS sellable_decisions (
  id INTEGER PRIMARY KEY,
  shopify_variant_id TEXT NOT NULL,
  state TEXT NOT NULL CHECK (state IN ('SELLABLE','AUTO_READY','OWNER_APPROVAL','DATA_FIX','MAPPING_REQUIRED','SUPPLIER_REQUIRED','STOCK_BLOCKED','SHIPPING_BLOCKED','PROFIT_BLOCKED','RISK_BLOCKED','STALE','INVALID','UNKNOWN')),
  primary_reason TEXT, fix TEXT, inputs_hash TEXT NOT NULL,
  match_ref INTEGER REFERENCES product_matches(id), verification_run_ref INTEGER REFERENCES verification_runs(id), pricing_ref INTEGER REFERENCES pricing_decisions(id),
  decided_at TEXT NOT NULL,
  CHECK (state = 'SELLABLE' OR primary_reason IS NOT NULL),
  CHECK (state <> 'SELLABLE' OR (match_ref IS NOT NULL AND verification_run_ref IS NOT NULL AND pricing_ref IS NOT NULL))
);
CREATE INDEX IF NOT EXISTS idx_sellable_variant ON sellable_decisions(shopify_variant_id, decided_at);

-- K. Shopify listings + the single-writer sync queue
CREATE TABLE IF NOT EXISTS shopify_listings (
  shopify_product_id TEXT PRIMARY KEY,
  status TEXT NOT NULL CHECK (status IN ('ACTIVE','DRAFT','ARCHIVED')),
  snapshot_json TEXT NOT NULL, snapshot_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS shopify_sync_queue (
  id INTEGER PRIMARY KEY,
  decision_id TEXT NOT NULL UNIQUE,
  shopify_product_id TEXT NOT NULL, shopify_variant_id TEXT,
  current_state TEXT NOT NULL, desired_state TEXT NOT NULL, reason TEXT NOT NULL, evidence_json TEXT NOT NULL,
  policy TEXT NOT NULL, batch_id TEXT,
  status TEXT NOT NULL DEFAULT 'PROPOSED' CHECK (status IN ('PROPOSED','APPROVED','APPLIED','FAILED','ROLLED_BACK','REJECTED','SKIPPED')),
  approved_by TEXT, approved_at TEXT, applied_at TEXT, rollback_json TEXT NOT NULL, generated_at TEXT NOT NULL,
  CHECK (status NOT IN ('APPROVED','APPLIED') OR (approved_by IS NOT NULL AND approved_at IS NOT NULL))
);
CREATE TABLE IF NOT EXISTS sku_proposals (
  id INTEGER PRIMARY KEY,
  shopify_variant_id TEXT NOT NULL, current_sku TEXT, proposed_sku TEXT NOT NULL,
  supplier_id TEXT NOT NULL, supplier_variant_id TEXT NOT NULL, confidence REAL NOT NULL, evidence_json TEXT NOT NULL,
  collision_status TEXT NOT NULL, approval_required INTEGER NOT NULL DEFAULT 1 CHECK (approval_required = 1),
  status TEXT NOT NULL DEFAULT 'REVIEW' CHECK (status IN ('WRITE_CANDIDATE','REVIEW','NO_CHANGE','APPROVED','APPLIED','REJECTED')),
  CHECK (status NOT IN ('APPROVED','APPLIED') OR collision_status = 'NONE')
);

-- L/M. orders and supplier orders (purchase requires evidence; one purchase per supplier order)
CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY,
  shopify_order_id TEXT NOT NULL UNIQUE,
  financial_status TEXT NOT NULL, hmac_verified INTEGER NOT NULL CHECK (hmac_verified IN (0,1)),
  state TEXT NOT NULL, received_at TEXT NOT NULL, payload_hash TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS supplier_orders (
  id INTEGER PRIMARY KEY,
  order_ref INTEGER NOT NULL REFERENCES orders(id),
  supplier_id TEXT NOT NULL REFERENCES supplier_catalog(supplier_id),
  idempotency_key TEXT NOT NULL UNIQUE,
  state TEXT NOT NULL CHECK (state IN ('RECEIVED','VALIDATED','AWAITING_APPROVAL','DRAFT','CHECKOUT_READY','PURCHASED','PAYMENT_PENDING','SHIPPED','DELIVERED','COMPLETED','CANCELLED','FAILED')),
  stage1_approved_by TEXT, stage1_approved_at TEXT, stage2_approved_by TEXT, stage2_approved_at TEXT,
  supplier_order_number TEXT, transaction_confirmation TEXT, purchased_at TEXT, tracking_number TEXT,
  CHECK (state NOT IN ('PURCHASED','PAYMENT_PENDING','SHIPPED','DELIVERED','COMPLETED') OR (supplier_order_number IS NOT NULL AND transaction_confirmation IS NOT NULL AND stage2_approved_by IS NOT NULL AND purchased_at IS NOT NULL)),
  CHECK (stage2_approved_by IS NULL OR stage1_approved_by IS NOT NULL)
);

-- N. audit log (append-only)
CREATE TABLE IF NOT EXISTS audit_log (
  id INTEGER PRIMARY KEY,
  at TEXT NOT NULL, actor TEXT NOT NULL, action TEXT NOT NULL, entity TEXT NOT NULL, entity_id TEXT NOT NULL,
  before_json TEXT, after_json TEXT, reason TEXT, ignored_client_fields TEXT
);
CREATE TRIGGER IF NOT EXISTS audit_log_no_update BEFORE UPDATE ON audit_log BEGIN SELECT RAISE(ABORT, 'audit_log is append-only'); END;
CREATE TRIGGER IF NOT EXISTS audit_log_no_delete BEFORE DELETE ON audit_log BEGIN SELECT RAISE(ABORT, 'audit_log is append-only'); END;
CREATE TRIGGER IF NOT EXISTS sellable_no_update BEFORE UPDATE ON sellable_decisions BEGIN SELECT RAISE(ABORT, 'sellable_decisions is append-only'); END;
CREATE TRIGGER IF NOT EXISTS prices_no_update BEFORE UPDATE ON supplier_prices BEGIN SELECT RAISE(ABORT, 'supplier_prices is append-only'); END;
CREATE TRIGGER IF NOT EXISTS stock_no_update BEFORE UPDATE ON supplier_stock BEGIN SELECT RAISE(ABORT, 'supplier_stock is append-only'); END;
CREATE TRIGGER IF NOT EXISTS supplier_products_no_delete BEFORE DELETE ON supplier_products BEGIN SELECT RAISE(ABORT, 'supplier knowledge is never deleted; set status=REMOVED'); END;
CREATE TRIGGER IF NOT EXISTS supplier_variants_no_delete BEFORE DELETE ON supplier_variants BEGIN SELECT RAISE(ABORT, 'supplier knowledge is never deleted; set status=REMOVED'); END;
