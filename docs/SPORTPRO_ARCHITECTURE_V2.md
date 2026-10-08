> **Superseded (2026-10-08):** for the code as built see `SPORTPRO_ARCHITECTURE.md`.

# SPORTPRO — Architecture V2 (Sellable-First)

Status: **design + tested pure core; nothing deployed.** Code: `src/core/*` (98 tests), schema `migrations/0001_supplier_first.sql` (not applied), tools in `tools/`.

```
NEVER:  Supplier → Shopify → try to make automation work
ALWAYS: Supplier → Supplier DB → Discovery → Match → Live Verification → Shipping → Pricing → Risk → SELLABLE GATE → Shopify
```

Shopify is an **output**. D1 is the system's source of truth. Supplier availability never comes from Shopify.

## 1. Principles
1. **Fail closed.** UNKNOWN never becomes 0, true, AVAILABLE or a quantity.
2. **One primary state per variant** from a closed set (13 states → 9 report groups A–I), fixed gate order.
3. **Deterministic gates.** AI may propose (discovery, review suggestions, copy), never decide a gate.
4. **Three separate decisions:** mapping approval ("same product?") ≠ listing approval ("sell it?") ≠ order approval ("buy from supplier?").
5. **ONE WRITER** to Shopify: a single Worker job with a single least-privilege credential. Not Base44, not a Claude connector, not another app, not a script.
6. **Append-only knowledge.** Supplier products/variants are never deleted (status only); prices, stock, decisions and audit are append-only (enforced by DB triggers).
7. **Every write**: dry-run → diff → count → sample → owner approval → execute → post-check → rollback file.

## 2. Data model — `migrations/0001_supplier_first.sql`

| | Table | Purpose | Enforced by schema (tested in `test/schema.test.js`) |
|---|---|---|---|
| A | `supplier_catalog` | Supplier registry | `checkout_verified=1` requires evidence ref; `CHECKOUT_VERIFIED` requires verified flag |
| B | `supplier_products` | Raw + normalized product | Never deleted (trigger); status ACTIVE/UNAVAILABLE/STALE/REMOVED/BLOCKED |
| C | `supplier_variants` | Raw + normalized variant | Never deleted (trigger); unique (supplier, variant id) |
| D | `supplier_prices` | Price observations | Append-only; price > 0 |
| E | `supplier_stock` | Stock observations | Append-only; **tri-state only** (no quantity possible) |
| F | `supplier_shipping` | Versioned policy + evidence | VERIFIED/CONDITIONAL require source URL + verified_at |
| G | `product_matches` | Shopify variant ↔ supplier variant | One active mapping per Shopify variant; one approved listing per supplier variant; MANUAL_REVIEW/REJECT cannot be approved; approval needs approver |
| H | `verification_runs` | Live checks | url_ok, variant_exists, tri-state stock, price, currency |
| I | `pricing_decisions` | Versioned pricing result | pass requires known shipping |
| J | `sellable_decisions` | Gate result history | Append-only; non-SELLABLE needs reason; SELLABLE requires match + verification + pricing refs; state from closed set |
| K | `shopify_listings`, `shopify_sync_queue` | Snapshot + single-writer queue | `decision_id` unique (idempotent enqueue); APPLIED requires approval; rollback_json required |
| — | `sku_proposals` | SKU recovery | approval_required always 1; cannot approve with a collision |
| L | `orders` | Shopify orders | Unique Shopify order id (duplicate webhook → no second row) |
| M | `supplier_orders` | Procurement | Unique idempotency key; PURCHASED+ requires order number + transaction confirmation + stage-2 approval + purchased_at; stage 2 cannot precede stage 1 |
| N | `audit_log` | Every action | Append-only (no UPDATE/DELETE) |

## 3. Supplier registry
`src/core/registry.js` + `audit/supplier_registry.csv`: for each of 12 suppliers, supplier_id, name, domain, catalog_method, catalog/product/variant feed, price/stock availability, stock granularity, SKU/barcode/size/color availability, shipping policy/source/verified_at, checkout method, checkout_verified (**false for all**), status, last_scan_at, freshness TTL (24 h), risk level. Unknown fields are literally `UNKNOWN`.

## 4. Matching engine — `src/core/match.js`

| Priority | Method | Confidence | Class |
|---|---|---|---|
| 1 | Exact supplier SKU (narrowed by size/color when the supplier reuses SKUs per style) | 1.00 | AUTO_CANDIDATE |
| 2 | Exact barcode | 1.00 | AUTO_CANDIDATE |
| 3 | Normalized SKU (punctuation/spacing) | 0.97 | AUTO_CANDIDATE |
| 4 | Brand + model code + exact size + exact color | 0.95 | AUTO_CANDIDATE |
| 5 | Brand + model code + exact size (color/width unverified) | 0.92 | HIGH_CONFIDENCE |
| 6 | Normalized title + exact options | 0.93 | HIGH_CONFIDENCE |
| 6b | Normalized title + exact size only | 0.90 | HIGH_CONFIDENCE |
| 7 | Compatible size mapping (2XL↔XXL, one-size↔default) | 0.85 | MANUAL_REVIEW |
| 8 | Fuzzy title (Jaccard, same brand) | ≤ 0.85 | MANUAL_REVIEW / REJECT |

Classes: ≥0.95 AUTO_CANDIDATE · 0.90–0.949 HIGH_CONFIDENCE · 0.75–0.899 MANUAL_REVIEW · <0.75 REJECT. **AUTO_CANDIDATE ≠ SELLABLE.** Contradictions (SKU vs options, SKU vs title) → CONFLICT; several equal candidates → AMBIGUOUS. Each match carries confidence, method and evidence (supplier product/variant, size, color, brand, model).

## 5. SELLABLE gate — `src/core/eligibility.js`

SELLABLE ⇔ supplier exists & onboarded & not blocked ∧ match class AUTO_CANDIDATE/HIGH_CONFIDENCE ∧ (HIGH requires owner approval) ∧ mapping recorded ∧ live-verified (variant exists, URL ok, ILS) ∧ data ≤ 24 h ∧ stock = AVAILABLE ∧ shipping VERIFIED/CONDITIONAL with condition satisfied ∧ profit ≥ 10 ₪ ∧ margin ≥ 4% ∧ no duplicate mapping ∧ data defects fixed ∧ supplier checkout verified.

| Order | State | Group | Examples of primary reason |
|---|---|---|---|
| 1 | INVALID | H | PRODUCT_ARCHIVED, INVALID_PRICE |
| 2 | SUPPLIER_REQUIRED | G | NO_SUPPLIER_TAG, SUPPLIER_BLOCKED, NO_PUBLIC_CATALOG_FEED, SUPPLIER_NOT_ONBOARDED |
| 3 | MAPPING_REQUIRED | C | NO_PRODUCT_MATCH, OPTION_NOT_OFFERED_BY_SUPPLIER, MATCH_NEEDS_MANUAL_REVIEW, SUPPLIER_VARIANT_GONE |
| 4 | RISK_BLOCKED | H | DUPLICATE_SUPPLIER_MAPPING, CURRENCY_NOT_ILS, SUPPLIER_URL_BROKEN |
| 5 | STALE | I | SUPPLIER_DATA_STALE |
| 6 | STOCK_BLOCKED | D | STOCK_UNAVAILABLE, STOCK_UNKNOWN |
| 7 | SHIPPING_BLOCKED | E | SHIPPING_UNKNOWN:*, SHIPPING_EXCEPTION:*, SHIPPING_CONDITION_NOT_MET |
| 8 | PROFIT_BLOCKED | F | PROFIT_BELOW_MIN, MARGIN_BELOW_MIN |
| 9 | DATA_FIX | B | DUPLICATE_SKU, NO_IMAGES |
| 10 | STALE | I | LIVE_CHECK_REQUIRED |
| 11 | OWNER_APPROVAL | B | MAPPING_NEEDS_OWNER_APPROVAL |
| 12 | AUTO_READY | B | AWAITING_MAPPING_RECORD, CHECKOUT_UNVERIFIED |
| 13 | SELLABLE | A | — |
| — | UNKNOWN | I | EVALUATION_ERROR (alert if > 0) |

## 6. Pricing — `src/core/pricing.js`
Policy `B-2026-10-04` (versioned): fees 2.5% + 2% + 1 ₪; min profit 10 ₪; min margin 4%; max markup 35%; charm `.90`. **Markup tiers 15/13/12/10% are named in Policy B but their cost-band boundaries were never documented → not applied (UNKNOWN).** `minProfitablePrice()` gives the lowest charm price that passes both floors; if it exceeds cost × 1.35, the item is **structurally unprofitable** under policy. No market ceiling is ever invented.

## 7. Shipping — `src/core/shipping.js`
Per-supplier rule with source URL and date. Conditional free shipping is evaluated for a single-unit order and **re-evaluated against the real supplier cart at order time**. UNKNOWN / EXCEPTION → SHIPPING_BLOCKED. Policies older than 30 days → re-verify.

## 8. Shopify sync — `src/core/syncPlanner.js`
`shopify_sync_queue` rows: product/variant, current, desired, reason, evidence, decision_id (deterministic hash), policy, generated_at, rollback.
- **STRICT:** product ACTIVE ⇔ ≥ 1 SELLABLE variant.
- **RISK_MINIMUM:** draft only ACTIVE products whose every purchasable variant is supplier-UNAVAILABLE or loss-making; activates nothing.
- Before execution: `reconcileBeforeWrite` skips rows already applied and refuses rows whose live state drifted. After a partial failure, `rollbackSet` returns exactly the applied rows.
- Rollback for status changes must also restore **sales-channel publications** (drafting unpublished products from Online Store / POS on 2026-10-01). Capture `resourcePublications` per product immediately before any write.

## 9. Multi-agent product system

| Agent | Kind | Reads | Writes | Never |
|---|---|---|---|---|
| 1 Supplier discovery | AI-assisted search + deterministic feed probe (`/products.json`, Woo Store API) | web | `supplier_catalog` (status CANDIDATE) | onboard a supplier without catalog + shipping + checkout evidence |
| 2 Product discovery | deterministic ranking of supplier catalog: brand, price band, availability, min profitable price ≤ cap, shipping known, category | supplier_* | candidate list (`supplier_opportunities`) | invent demand (demand = UNKNOWN until real data) |
| 3 Matching | deterministic `match.js`; AI may *suggest* evidence for MANUAL_REVIEW | supplier_*, Shopify mirror | `product_matches` (PROPOSED/REVIEW_REQUIRED) | approve |
| 4 Live verification | deterministic GET per variant (`live_verify.mjs`) | supplier sites | `verification_runs`, prices, stock | guess stock or quantity |
| 5 Profit | deterministic `pricing.js` | runs + shipping | `pricing_decisions` | invent market prices |
| 6 Quality/risk | deterministic checks (duplicate, wrong size/brand/variant, stale, missing image/SKU) + AI copy suggestions | all | `sellable_decisions`, `sku_proposals` | write to Shopify |
| 7 Catalog manager | deterministic diff of SELLABLE vs Shopify | sellable_decisions | `shopify_sync_queue` (PROPOSED) → after owner approval → **the single writer** | search for products; publish anything not SELLABLE |

Product pipeline (no shortcuts): `DISCOVERED → CANDIDATE → MATCHED → LIVE_VERIFIED → SHIPPING_VERIFIED → PRICED → PROFIT_VERIFIED → RISK_VERIFIED → OWNER_APPROVAL/AUTO_APPROVED → READY_TO_PUBLISH → SHOPIFY_ACTIVE`.

## 10. Automation (cron, after stabilization)

| UTC | Job | Output |
|---|---|---|
| 00:00 | Supplier catalog refresh (all feeds, rate-limited) | supplier_products/variants, prices, stock |
| 01:00 | Matching refresh | product_matches |
| 02:00 | Live verification of every currently-ACTIVE and every candidate variant | verification_runs |
| 03:00 | Shipping policy check (weekly re-verify; expiry 30 d) | supplier_shipping |
| 03:30 | Profit recalculation | pricing_decisions |
| 04:00 | SELLABLE gate | sellable_decisions |
| 04:30 | Sync diff (SELLABLE → TEMPORARILY_BLOCKED on stock loss; back after fresh validation) | shopify_sync_queue (PROPOSED) |
| — | Owner approves batch → single writer applies → post-check | shopify_write_log |
| every 15 min | Stale sweep: any ACTIVE variant whose last verification > TTL → proposal to block | queue |

## 11. Order flow — `src/core/orderGate.js`
```
Shopify order → webhook (HMAC verified) → orders (unique id) → payment PAID? → supplier + variant from APPROVED mapping
→ LIVE stock (AVAILABLE) → LIVE price (≤ +5% vs mapping, ILS) → shipping known → profit pass → PROCEED_TO_DRAFT
→ OWNER APPROVAL 1 → supplier cart → OWNER APPROVAL 2 → supplier checkout (human) → evidence (order no. + transaction) → PURCHASED
→ tracking → Shopify fulfillment → customer
```
Any failure → STOP, no purchase. Unknown kill-switch state counts as ON. Tests cover: kill switch, HMAC, duplicate order line, payment pending, no approved mapping, stale live check, unavailable/unknown stock, price jump, unknown shipping, unprofitable line, missing purchase evidence, stage-2 missing, double purchase, checkout failure.

## 12. Pilot and growth
Pilot ladder: **10 → 25 → 50 → 100 → 250 → 500** products. Step up only with **0 loss, 0 wrong supplier, 0 wrong variant, 0 unavailable purchase, 0 mapping errors** at the previous step.
Metrics: verified sellable; average/median net profit; average margin; supplier availability; mapping accuracy; order success; supplier checkout success; refund rate; cancellation rate; stale rate; **SELLABLE COVERAGE = verified sellable variants / total candidate variants**.

## 13. Dashboard (to build in the Worker admin)
Tiles: TOTAL DISCOVERED · MATCHED · LIVE VERIFIED · SELLABLE · BLOCKED · NO SUPPLIER · NO STOCK · NO SHIPPING · PROFIT BLOCKED · DATA QUALITY · STALE. Lists: top 100 to fix / to publish / by profit / by confidence / supplier opportunities. Every row shows **WHY SELLABLE** or **WHY BLOCKED** (state, primary reason, fix, evidence link, last check). The audit already produces these lists as CSV.
