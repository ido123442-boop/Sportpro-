# SPORTPRO — Architecture V2 (Supplier-First)

Status: **design, not implemented in production.** The pure core modules referenced here exist in `src/core/` with tests. Nothing in this document has been deployed.

## 1. Principles

1. **The supplier catalog is the source of product truth. Shopify is a storefront.** A product is ACTIVE because it is SELLABLE, never the other way round.
2. **Fail closed.** UNKNOWN never becomes 0, true or AVAILABLE. Missing evidence → blocked, with an explicit reason.
3. **One primary state per variant**, from a closed set, decided by a fixed gate order. No variant falls between states.
4. **Deterministic first.** Matching, pricing, shipping, stock and eligibility are pure functions over stored evidence. AI may *propose* (match suggestions, title/quality fixes) but never decides a gate.
5. **Separate decisions:** mapping approval ("same product?") ≠ listing approval ("should we sell it?") ≠ order approval ("fulfill this order?").
6. **Single Shopify writer.** One credential, one code path, and every bulk write goes through dry-run → diff → approval → execution log → rollback file.
7. **Append-only history.** Supplier knowledge is never deleted; disappearance is a status.

## 2. Data model (D1, staging first)

```
suppliers(id, key, domain, platform, feed_url, status, checkout_verified_at, checkout_evidence_ref,
          shipping_policy_id, onboarded_at)
shipping_policies(id, supplier_id, rule_json, source_url, source_text, verified_at, expires_at, status)
supplier_products(id, supplier_id, supplier_product_id, title, title_norm, product_type, url,
          first_seen_at, last_seen_at, status[ACTIVE|UNAVAILABLE|STALE|REMOVED|BLOCKED], source_hash)
supplier_variants(id, supplier_product_id, supplier_variant_id, sku, barcode, options_json, option_sig,
          grams, cost, stock_status[AVAILABLE|UNAVAILABLE|UNKNOWN], price_checked_at, stock_checked_at,
          first_seen_at, last_seen_at, last_available_at, status)
supplier_observations(id, supplier_variant_id, observed_at, cost, stock_status, source_hash)   -- append-only
shopify_variants(shopify_variant_id, shopify_product_id, sku, option_sig, price, status, inventory_tracked,
          snapshot_at)                                                                         -- mirror, read-only
mappings(id, shopify_variant_id UNIQUE, supplier_variant_id, tier[EXACT|HIGH|REVIEW], method, confidence,
          evidence_json, evidence_hash, status[PROPOSED|REVIEW_REQUIRED|MAPPING_APPROVED|REJECTED|SUPERSEDED],
          approved_by, approved_at)
mapping_events(id, mapping_id, at, actor, action, from_status, to_status, evidence_hash, ignored_fields)
eligibility(shopify_variant_id PK, state, primary_reason, fix, inputs_hash, evaluated_at)
eligibility_history(id, shopify_variant_id, at, state, primary_reason, inputs_hash)            -- append-only
listing_proposals(id, batch_id, shopify_product_id, action[ACTIVATE|DRAFT|UPDATE_PRICE|...], before_json,
          after_json, status[PROPOSED|APPROVED|APPLIED|ROLLED_BACK|REJECTED], approved_by, applied_at)
shopify_write_log(id, batch_id, at, mutation, target_id, request_hash, response_status, before_json)
```

Constraints that encode safety:
- `mappings.shopify_variant_id UNIQUE` among non-REJECTED rows, so one Shopify variant routes to exactly one supplier variant.
- Partial unique index on `(supplier_variant_id)` where `status='MAPPING_APPROVED'`, which prevents duplicate listings.
- `listing_proposals` can only be APPLIED if APPROVED, and `shopify_write_log` must hold a `before_json` (enabling rollback).

The canonical identity is the chain `supplier_variant` ↔ `mapping` ↔ `shopify_variant`. Shopify is never used as the supplier master.

## 3. SELLABLE contract

A variant is **SELLABLE** iff **all** hold:

| # | Condition | Evidence | Freshness |
|---|---|---|---|
| 1 | Shopify record valid: not archived, price > 0 | Shopify mirror | snapshot ≤ 24 h |
| 2 | Supplier tag resolves to an **onboarded** supplier with a working feed | `suppliers` | last scan ok |
| 3 | Supplier data fresh | `price_checked_at`, `stock_checked_at` | ≤ 24 h |
| 4 | Exactly one supplier variant matched (identity, size, color) | `mappings` | — |
| 5 | No duplicate supplier mapping; no SKU/title conflict | `mappings` uniqueness | — |
| 6 | Supplier variant `stock_status = AVAILABLE` (quantity is not used) | `supplier_variants` | ≤ 24 h |
| 7 | Shipping cost known (VERIFIED or CONDITIONAL with an evaluable condition) | `shipping_policies` | ≤ 30 d |
| 8 | Profit passes: net ≥ 10 ₪ **and** margin ≥ 4% (fees 4.5% + 1 ₪) | `pricing.js` | computed now |
| 9 | Shopify data fixable defects resolved (unique SKU, images) | Shopify mirror | — |
| 10 | Mapping approved: tier EXACT recorded, or HIGH approved by owner | `mappings.status` | — |
| 11 | Supplier checkout path verified (pilot order with evidence) | `suppliers.checkout_verified_at` | ≤ 90 d |
| 12 | No risk block (kill-switch-independent; supplier not BLOCKED) | `suppliers.status` | — |

### 3.1 States and gate order (first failing gate wins)

| Order | State | Primary reasons |
|---|---|---|
| 1 | INVALID | PRODUCT_ARCHIVED, INVALID_PRICE |
| 2 | SUPPLIER_REQUIRED | NO_SUPPLIER_TAG, NO_PUBLIC_CATALOG_FEED, SUPPLIER_NOT_ONBOARDED, SUPPLIER_UNIDENTIFIED, PERSONAL_IMPORT_NO_SUPPLIER, OWN_BRAND_SOURCE_UNKNOWN, SUPPLIER_FEED_FAILED |
| 3 | STALE | SUPPLIER_DATA_STALE |
| 4 | MAPPING_REQUIRED | NO_PRODUCT_MATCH, OPTION_NOT_OFFERED_BY_SUPPLIER, SHOPIFY_COLLAPSED_VARIANTS, SUPPLIER_HAS_NO_VARIANTS, AMBIGUOUS_PRODUCT, AMBIGUOUS_VARIANT, AMBIGUOUS_SKU, SKU_TITLE_CONFLICT, SKU_OPTIONS_MISMATCH |
| 5 | RISK_BLOCKED | DUPLICATE_SUPPLIER_MAPPING, SKU_CONFLICTS_WITH_MATCH |
| 6 | STOCK_BLOCKED | STOCK_UNAVAILABLE, STOCK_UNKNOWN |
| 7 | SHIPPING_BLOCKED | SHIPPING_UNKNOWN:*, SHIPPING_EXCEPTION:* |
| 8 | PROFIT_BLOCKED | PROFIT_BELOW_MIN, MARGIN_BELOW_MIN, SUPPLIER_COST_UNKNOWN |
| 9 | DATA_FIX | DUPLICATE_SKU, NO_IMAGES |
| 10 | OWNER_APPROVAL | MAPPING_NEEDS_OWNER_APPROVAL (HIGH tier) |
| 11 | AUTO_READY | AWAITING_MAPPING_RECORD (EXACT tier), CHECKOUT_UNVERIFIED |
| 12 | SELLABLE | — |
| — | UNKNOWN | EVALUATION_ERROR (must be 0; alert if not) |

Implemented in `src/core/eligibility.js`; every gate has a unit test in `test/core.test.js`.

### 3.2 Matching (deterministic, `tools/audit_catalog.mjs` → to be moved to `src/core/match.js`)

| Tier | Rule | Who may approve |
|---|---|---|
| EXACT | Supplier SKU equals Shopify SKU (narrowed by size/color signature when the supplier reuses SKUs per style), with no contradicting title/options evidence | Recording is automatic; listing still needs approval in pilot |
| HIGH | Same supplier, unique exact normalized title, unique exact option signature (confidence 0.95) | Owner, one at a time |
| REVIEW | Anything else (ambiguous, conflicting, partial) | Owner only after new evidence raises the tier; `acknowledge_low_conf` is never accepted |

Normalization (`src/core/normalize.js`): NFKC, bidi stripping, Hebrew/English punctuation, fractional EU sizes (`41 1/3` → `41.33`, `41⅔` → `41.67`), `EU`/`UK`/`מידה` prefixes, `Default`/`Default Title` ignored. Size *systems* (EU↔UK) are **not** auto-converted; that needs a per-brand chart and is a REVIEW item.

### 3.3 Approval guard
`src/core/approvalGuard.js`; see SAFETY_AUDIT §3.

## 4. Pipeline and agents

```
 [Scheduler]
   │ 00:00 supplier scan (per supplier, rate-limited, GET-only)   → supplier_products/variants (+observations)
   │ 01:00 match (deterministic)                                   → mappings (PROPOSED / REVIEW_REQUIRED)
   │ 02:00 shipping policy re-verify (weekly) + cost/stock refresh  → supplier_variants
   │ 03:00 profit + eligibility                                    → eligibility (+history)
   │ 04:00 listing diff                                            → listing_proposals (DRY RUN)
   └ owner approves batch on /admin/catalog → single Shopify writer → shopify_write_log (+rollback)
```

| Agent | Kind | Writes to | Never does |
|---|---|---|---|
| Supplier discovery | deterministic scanner (+ AI only to *suggest* new suppliers) | supplier_* | Shopify writes |
| Matching | deterministic; AI may *suggest* REVIEW candidates with evidence | mappings (PROPOSED) | approve |
| Stock/price validator | deterministic | supplier_variants, observations | guess quantities |
| Shipping engine | deterministic rule table + evidence | shipping_policies | turn UNKNOWN into 0 |
| Profit engine | deterministic | eligibility inputs | invent market prices |
| Quality agent | AI-assisted proposals (title/Hebrew/SEO) | listing_proposals (UPDATE) | publish |
| Eligibility gate | deterministic | eligibility | — |
| Listing agent | deterministic diff | listing_proposals | write without approval |
| Maintenance | deterministic: SELLABLE → TEMPORARILY_BLOCKED on stock loss, back on return after fresh validation | eligibility, proposals | delete history |

## 5. Shopify listing policy

- Initial rollout: `ACTIVATE` proposals only for SELLABLE variants. A product is ACTIVE when ≥ 1 variant is SELLABLE; non-SELLABLE variants of an ACTIVE product must be unpurchasable (tracked inventory, qty 0, `DENY`).
- `DRAFT` proposals for ACTIVE products with zero SELLABLE variants. This is currently **all 1,947**, because nothing is SELLABLE until the checkout pilot passes. This is a policy decision for the owner: during the pilot, the store would show only pilot products.
- Every proposal batch: count, sample, diff, owner approval, execution, post-check, rollback file.
- Price updates are proposals too (never silent).

## 6. What to keep / replace

| Keep | Replace |
|---|---|
| Auth-before-routing on `/api/*` | Client-supplied `acknowledge_low_conf` and `approved_by` |
| Two-stage order approval with purchase evidence (order number + transaction confirmation) | Toggle-style kill switch → explicit `{active:true|false}` with confirmation |
| Kill switch concept, Durable Object idempotency (once source is recovered and tested) | Synthetic Shopify quantities and untracked inventory as the availability signal |
| `/verify`, `/orders`, `/admin` separation | Supplier identity as a free-text tag → stored supplier_variant mapping |
| The pricing formula (verified in `pricing.js`) | Four Shopify writer apps → one least-privilege writer |
| Existing D1 history (mappings, audit, candidates): migrate, never drop | Shopify-first activation (products ACTIVE without supply evidence) |

## 7. Roadmap (not started)

| Phase | Deliverable | Exit criterion |
|---|---|---|
| 0 ✔ (this) | Facts: Shopify + supplier truth, classification, safety findings | Docs + exports exist |
| 0b | **Access:** Cloudflare read token, Worker admin read token; locate Worker source; make repo private | Source in git; D1 schema + counts + kill switch value read; staging/prod bindings documented |
| 1 | **Freeze writers:** inventory of the 4 Shopify apps; revoke or rotate all but one; owner decision on R1/R2 (loss-making / unavailable purchasable items) | Exactly one writer credential; R1/R2 decision recorded |
| 2 | **Backups:** D1 export (staging + prod), Shopify snapshot (exists), pricing/shipping policy snapshot | sha256 manifest stored privately |
| 3 | **Supplier master in staging D1:** schema §2, import today's scan, nightly scan | 10 suppliers ingested; observations accumulating |
| 4 | **Reconcile** D1 legacy mappings (715) with audit proposals (8,788); approval guard deployed to staging | Diff report: agree / disagree / legacy-only / new |
| 5 | **Pilot checkout:** 1 supplier (Footlocker has the most AUTO_READY), 1 product, 1 real order, manual procurement, tracking, fulfillment | `checkout_verified_at` set with evidence |
| 6 | **Listing proposals → small batch** (e.g. 20 SELLABLE products) owner-approved | Post-check matches diff; rollback tested |
| 7 | Webhook/order path re-tested end-to-end in staging (HMAC, duplicates, kill switch) | Tests executed and logged, not assumed |
| 8 | Controlled scale: batch size grows only while fulfillment success holds | Metrics in supplier health dashboard |
