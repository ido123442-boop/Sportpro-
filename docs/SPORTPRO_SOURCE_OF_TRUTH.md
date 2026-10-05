> **Superseded for numbers (2026-10-05)** by `docs/SPORTPRO_SELLABLE_CATALOG_AUDIT.md` (new matching engine + live verification). Key corrections: AroSport "option not offered" was mostly a shoe-width dimension, not only a generic size grid; purchasable-but-supplier-unavailable is 3,391 and loss-making 1,673 (more variants are now matched); the Claude Shopify connector itself is one of the four writers.

# SPORTPRO — Source of Truth

Status: Phase 0 (audit / recovery). Snapshot time: **2026-10-04 15:57–16:01 UTC**.
No production writes were made while producing this document.

Labels: **VERIFIED** (observed directly in this audit) · **INFERRED** (strongly implied by verified data) · **UNKNOWN** (no evidence available) · **BLOCKED** (access missing).

## 1. Authority order

| Rank | Source | What it is authoritative for | Access in this audit | Snapshot |
|---|---|---|---|---|
| 1 | **Shopify production** (`xayj9j-q9.myshopify.com`) | What customers can see and buy: products, variants, status, price, SKU, inventory flags, publication, event history | VERIFIED (Admin API, read-only + bulk export jobs) | `shopify_full.jsonl` sha256 `b1d0f58f…930872b`, 43,370 objects |
| 2 | **Supplier live catalogs** (10 public feeds) | Supplier identity, supplier variant IDs, current cost, availability flag, shipping policy text | VERIFIED (public GET only) | 18,901 products / 90,165 variants, fetched 15:57:55–15:58:27 UTC |
| 3 | Cloudflare D1 production | Mappings, approvals, orders, audit log, kill switch, SKU proposals | **BLOCKED** (no Cloudflare credentials) | — |
| 4 | Worker source + deployed Worker | Business logic | Source **not found** in any reachable repo; deployed Workers reachable (public pages only) | — |
| 5 | Base44 reports / CSVs | Reference only | **BLOCKED** (no access) | — |

Rule: when sources disagree, the higher rank wins for the fields it owns (section 2). A lower-ranked source never overrides a higher one; it can only raise a discrepancy.

## 2. Field ownership

| Field | Owner (authoritative) | Notes |
|---|---|---|
| Product/variant exists, status, published | Shopify | — |
| Selling price | Shopify | Pricing engine proposes; Shopify is what the customer pays |
| Supplier identity of a product | **Nobody today** | Only a free-text tag `ספק:<name>` in Shopify. No supplier URL, product ID, variant ID or SKU field is stored anywhere readable (VERIFIED: the only metafield is `custom.gender`). |
| Supplier product/variant ↔ Shopify variant mapping | D1 (claimed) — **BLOCKED** | Audit produced *proposed* mappings (`audit/mappings.csv`), none approved |
| Supplier cost | Supplier feed | Never Shopify, never historical reports |
| Supplier availability | Supplier feed (`available` / `is_in_stock`) | Tri-state AVAILABLE / UNAVAILABLE / UNKNOWN |
| Stock quantity | **No source exists** | VERIFIED: none of the 10 supplier feeds exposes a quantity. All Shopify quantities are synthetic (see DATA_QUALITY §4). |
| Shipping cost | Supplier published policy (text, with URL + date) | Encoded in `src/core/shipping.js` with evidence |
| Checkout feasibility | Pilot evidence (a real supplier order) | None exists → unverified for every supplier |
| Mapping approval | D1 + authenticated owner action | BLOCKED; treated as *not approved* (fail closed) |
| Kill switch | D1 / Worker | BLOCKED; unverified |

## 3. Which numbers are now authoritative

| Number | Value | Source | Replaces historical claim |
|---|---|---|---|
| Products | 7,114 (1,947 ACTIVE / 5,147 DRAFT / 20 ARCHIVED) | Shopify, VERIFIED | same total; "1,947 + 5,147" omitted 20 archived |
| Variants | 20,665 (11,045 under ACTIVE products) | Shopify, VERIFIED | 20,039 ✘ |
| Variants with SKU | 6,043 (missing: 14,622) | Shopify, VERIFIED | "4,707 SKU fixes applied" ✘ |
| Duplicate SKU values | 264 values across 1,883 variants | Shopify, VERIFIED | — |
| Barcodes | 0 in Shopify, 0 in every supplier feed | VERIFIED | — |
| Supplier-tag values | 26 distinct, plus 51 untagged products | Shopify, VERIFIED | "27" in my previous report counted "(none)" as a tag |
| Supplier catalog | 18,901 products / 90,165 variants across 10 feeds | Supplier feeds, VERIFIED | historical 2,317 / 8,165 and per-supplier counts ✘ (stale) |
| D1 mappings / candidates / variant_state | — | BLOCKED | 715 / 8,435 / 20,041: unverifiable |
| Test results (73/73, 86/86) | — | BLOCKED (no source) | unverifiable |

## 4. Evidence files

| File | Content | Committed? |
|---|---|---|
| `audit/shopify_variants.csv` | Every Shopify variant + match + live supplier data + state (20,665 rows) | No — repo is **public**; kept local (see note) |
| `audit/supplier_catalog.csv` | Every supplier variant scanned (90,165 rows) | No |
| `audit/mappings.csv` | Proposed (unapproved) mappings (8,788 rows) | No |
| `audit/sellable_candidates.csv` | AUTO_READY / OWNER_APPROVAL / DATA_FIX (2,117 rows) | No |
| `audit/blockers.csv` | Every non-SELLABLE variant with reason + fix (20,665 rows) | No |
| `audit/supplier_tags.csv` | 27 rows (26 tags + untagged) with classification | No |
| `audit/production_mutations.csv` | 38,904 product create/publish/unpublish/status/destroy events, 2026-07-15 → 2026-10-01 | No |
| `audit/summary.json` | Aggregate counts | Yes |
| `tools/scan_suppliers.mjs`, `tools/rebuild.mjs`, `tools/live_verify.mjs` | Reproducible read-only pipeline | Yes |

Note: the CSVs contain draft catalog, prices and inventory data. The GitHub repo `ido123442-boop/Sportpro-` is **public**, so they are git-ignored until the repo is made private. They exist in the working directory of this session (ephemeral container).

To reproduce: `node tools/scan_suppliers.mjs <dir>/suppliers` → place Shopify bulk exports in `<dir>` → `node tools/rebuild.mjs <dir> audit` → `node tools/live_verify.mjs audit/live_candidates.json <dir>/live.jsonl` → `node tools/rebuild.mjs <dir> audit <dir>/live.jsonl`.
