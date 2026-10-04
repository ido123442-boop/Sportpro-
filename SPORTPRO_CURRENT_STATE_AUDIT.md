> **SUPERSEDED (2026-10-04)** by `docs/SPORTPRO_CURRENT_STATE.md` and the other `docs/` files.
> Correction: §0.6 / §B.3 said the 1,297 zero-inventory ACTIVE products "display as sold out". That is wrong.
> 9,906 variants have inventory tracking disabled, and 1,489 ACTIVE products are purchasable (see `docs/SPORTPRO_CURRENT_STATE.md` §B.1).
> Also: there are 26 supplier-tag values plus untagged products, not 27 tag values.

# SPORTPRO MIGRATION & SUPPLIER-FIRST AUDIT

Audit date: 2026-10-01 (UTC). Phase 1 (AUDIT) only.
No production writes were made. No mappings were approved. No purchases were made. Kill switch was not touched.

Evidence labels used throughout:

| Label | Meaning |
|---|---|
| **VERIFIED** | Observed directly during this audit (command/query output) |
| **INFERRED** | Strongly suggested by verified evidence, not directly observed |
| **UNKNOWN** | No evidence either way could be obtained |
| **BLOCKED** | Could not be checked because access/credentials are missing |
| **CONTRADICTED** | A historical claim that verified evidence shows is false |

The only actions with any side effect on external systems:
1. One Shopify `bulkOperationRunQuery` (read-only export job; changes no store data).
2. HTTP `GET` requests to the two Workers' public pages (`/health`, `/verify`, `/orders`, `/admin`) and to unauthenticated `/api/*` paths (all returned 401).
3. One-item `GET` requests to public supplier catalog endpoints.

---

## 0. Executive summary — the 10 things that matter

1. **The Worker source code is not in this repository** (VERIFIED). `ido123442-boop/Sportpro-` contains only a README on `main`; branch `ccr-e8d58ef1-yhjgjd` contains an unrelated Python trading bot. No wrangler config, migrations, adapters, or tests exist in any repo this session can reach. The deployed Workers are the only place the code is known to exist. **This is the #1 migration risk**: if the code lives only in Base44 / a deployed bundle, it is one bad deploy away from loss.
2. **Both Workers are live** and report `{"ok":true,"service":"sportpro-automation-v2"}` (VERIFIED). Staging and production serve **byte-identical** dashboard HTML (VERIFIED, sha256 match) → INFERRED same build.
3. **Shopify catalog verified exactly**: 7,114 products = **1,947 ACTIVE + 5,147 DRAFT + 20 ARCHIVED** (the historical "1,947 + 5,147 = 7,114" omitted the 20 archived). **20,665 variants**, not 20,039 (+626).
4. **The "4,707 SKU fixes applied to Shopify" claim is CONTRADICTED by Shopify.** Shopify today has **6,043 variants with SKU / 14,622 without**. Historical baseline was 20,039 − 14,006 = 6,033 with SKU. The net gain is ~10, not 4,707.
5. **A production bulk write happened today.** The custom app **"SportPro Manager"** changed **4,783 products ACTIVE→DRAFT** and unpublished them from Online Store / POS on 2026-10-01 between 07:43 and 10:22 UTC (VERIFIED via Shopify events). INFERRED: this is the operation that produced the "1,947 active" figure. Who triggered it (Worker cron, Base44, a previous AI session, or the owner) is UNKNOWN.
6. **ACTIVE ≠ sellable, confirmed numerically**: of 1,947 ACTIVE products, **1,297 have zero inventory on every variant** (`inventoryPolicy=DENY` on all 20,665 variants → these display as sold out).
7. **Shopify holds invented-looking stock quantities**: 6,028 variants have quantity > 0, dominated by the values 2 (2,336), 10 (1,216) and 1 (915). This violates the "AVAILABLE ≠ quantity" rule in the handoff and needs to be traced to the code that writes inventory.
8. **Suppliers in the live catalog do not match the handoff's supplier list.** 27 distinct `ספק:` (supplier) tag values exist. **Footlocker has 81 ACTIVE products (711 variants)** and is not one of the 9 documented suppliers. **Decathlon has 18 ACTIVE products**, though the handoff says no reliable Decathlon catalog/API exists.
9. **Safety issue in the `/verify` UI**: every discovery-approve call sends `acknowledge_low_conf:true` unconditionally, and batch-approve endpoints exist. One owner click can approve low-confidence mappings in bulk. This contradicts "do not auto-approve low-confidence matches".
10. **D1, Durable Objects, cron triggers, secrets, kill-switch state, mappings, candidates, tests and Base44 contents are all BLOCKED**: there is no Cloudflare token, no Worker admin token, and no Base44 access in this environment.

---

## A. Infrastructure

| Item | Status | Evidence |
|---|---|---|
| GitHub repo `ido123442-boop/Sportpro-` | VERIFIED | Only repo accessible. **Public** visibility. `main` = 1 commit (README "# Sportpro-"). |
| Branch `ccr-e8d58ef1-yhjgjd` | VERIFIED | Unrelated "demo trading bot" (Python, Alpaca paper trading). Not Sportpro code. |
| Worker source / `wrangler.toml` / migrations / tests in git | VERIFIED absent | Full tree: 1 file. |
| Worker source exists somewhere | INFERRED | Deployed Workers run code named `sportpro-automation-v2`. Location of source (Base44? local machine? Cloudflare dashboard only?) UNKNOWN. |
| Cloudflare account access | BLOCKED | No `CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_ACCOUNT_ID` in env; `wrangler` not installed (installable). `api.cloudflare.com` is reachable from this container. |
| Base44 access | BLOCKED | No connector, no token. `app.base44.com` reachable. |
| Shopify Admin access | VERIFIED | Via the Shopify connector (read + write capable; only reads used, plus one bulk export job). |

## B. Shopify

Store: **Sportpro**, `www.sportpro.shop`, plan **Basic**, currency ILS, country Israel (VERIFIED).
Snapshot: full bulk export of 7,114 products + 20,665 variants, 2026-10-01 22:29 UTC, sha256 `5cb50bc2…7553beb`. It is kept in the session scratchpad only (it was **not** committed: the repo is public and the export contains draft catalog and inventory data).

### B.1 Counts (all VERIFIED, exact)

| Metric | Value | Historical claim | Verdict |
|---|---|---|---|
| Products | 7,114 | 7,114 | VERIFIED |
| ACTIVE | 1,947 | 1,947 | VERIFIED |
| DRAFT | 5,147 | 5,147 | VERIFIED |
| ARCHIVED | **20** | not mentioned | New finding |
| Variants | **20,665** | 20,039 | CONTRADICTED (+626) |
| Variants on ACTIVE products | 11,045 | — | — |
| Variants with SKU | **6,043** (ACTIVE 2,557 / DRAFT 3,477 / ARCHIVED 9) | ~6,033 before fixes, ~10,740 if 4,707 fixes applied | **SKU-fix claim CONTRADICTED** |
| Variants without SKU | 14,622 | 14,006 | — |
| Duplicate SKUs | **264 SKU values shared by 1,883 variants** | — | Mapping hazard |
| Variants with barcode | **0** | — | Barcode matching is impossible from the Shopify side |
| Variants with qty > 0 | 6,028 (ACTIVE: 2,927) | — | See B.3 |
| `inventoryPolicy` | DENY on all 20,665 | — | VERIFIED |
| Price ≤ 0 | 0 | — | VERIFIED |
| Orders visible to connector | 0 | — | INFERRED: no orders in the readable window. Connector scope may be limited to the last 60 days. |
| Vendors / product types | 257 vendors; top type "ביגוד" (clothing) with 3,054 products | — | VERIFIED |
| Created | 2026-07: 1,069 products; 2026-08: 6,045 | — | VERIFIED |

### B.2 Supplier attribution (tag `ספק:<supplier>`, products) — VERIFIED

| Supplier tag | ACTIVE | DRAFT | ARCHIVED | In handoff list? | Public feed (this audit) |
|---|---:|---:|---:|---|---|
| arosport | 1,501 | 321 | 1 | yes | Shopify `/products.json` ✔ |
| megasport | 331 | 129 | 0 | yes | Shopify ✔ |
| footlocker | **81** | 477 | 1 | **no** | Shopify ✔ (footlocker.co.il) |
| decathlon | **18** | 422 | 0 | yes ("no reliable API") | none found ✘ |
| bashgal | 11 | 1,822 | 14 | yes | Shopify ✔ |
| energym | 5 | 249 | 0 | yes | Shopify ✔ |
| dugit | 0 | 637 | 0 | yes | Shopify ✔ |
| bealion | 0 | 242 | 0 | no | WooCommerce ✔ (bealion.co.il) |
| יבוא אישי ("personal import") | 0 | 193 | 0 | no | n/a |
| kdhockey | 0 | 169 | 0 | yes | none (Wix) ✘ |
| dmksports | 0 | 115 | 0 | no | UNKNOWN (guessed domain did not resolve) |
| probody | 0 | 69 | 0 | no | UNKNOWN |
| (no tag) | 0 | 51 | 0 | — | — |
| sportstock | 0 | 49 | 0 | yes | WooCommerce ✔ |
| championshop | 0 | 48 | 0 | no | WooCommerce ✔ |
| לא זוהה ("unidentified") | 0 | 47 | 0 | — | — |
| arena | 0 | 40 | 0 | yes | WooCommerce ✔ (arenaisrael.co.il) |
| sportpro (own) | 0 | 23 | 4 | — | — |
| rhinoshop | 0 | 16 | 0 | no | UNKNOWN |
| 9 others (≤ 6 each: Titleist Direct, פרופר ספורט, ספורטי, ג'ינה פלוס, אור ספורט, sportcom, דור ספורט, Rawlings) | 0 | 32 | 0 | no | — |

Key facts:
- Every ACTIVE product has a supplier tag (0 untagged ACTIVE).
- ACTIVE products from suppliers with **no verified adapter/feed**: footlocker 81, decathlon 18 → **99 ACTIVE products whose supply path is UNKNOWN**.
- **AroSport ACTIVE variants: 8,163, of which 0 have a SKU.** 77% of the sellable surface depends on title/size matching only.
- Footlocker ACTIVE: 711/711 variants have a SKU but **0 have stock > 0**.

### B.3 Inventory — VERIFIED values, INFERRED cause
- 6,028 variants have qty > 0. Distribution: 2 → 2,336; 10 → 1,216; 1 → 915; 8 → 241; …
- Suppliers generally do not expose quantities (handoff §13). These numbers are therefore most likely synthesized by a sync job (INFERRED). The writer must be found in the Worker code (BLOCKED).
- 1,297 of 1,947 ACTIVE products have 0 on every variant → ACTIVE but unbuyable.

### B.4 Today's production write — VERIFIED
- Shopify events: `status_changed` count today = **4,783** (all-time 5,424; 95 on 2026-09-20; 0 on 2026-09-30).
- Sampled events: `"SportPro Manager changed product status from active to draft"` plus `"excluded a product from Online Store / Point of Sale"`. `attributeToApp=true`, `attributeToUser=false`.
- All 4,783 products updated today are now DRAFT, across 23 supplier tags.
- The app "SportPro Manager" is a custom app holding write scopes. Where its token is stored (Worker secret / Base44 / elsewhere) is UNKNOWN. **It is the production write path that must be governed.**
- Webhook subscriptions: the connector sees 0. That is expected, because webhooks are app-scoped. The Worker's order webhooks (registered by "SportPro Manager") are UNKNOWN/BLOCKED.

### B.5 Data-quality signals — VERIFIED
- Tags with leaked Python repr: namespaces `'name'` (3) and `{'id'` (2) → a serialization bug in an import job.
- Tag namespaces `DT` (309), `DIVISION` (275), `__label` (215), `COLOR` (144) are copied from supplier sources (INFERRED).

## C. Cloudflare

| Item | Status | Evidence |
|---|---|---|
| Worker `sportpro-automation-staging` | VERIFIED live | `GET /health` → 200 `{"ok":true,"service":"sportpro-automation-v2"}` |
| Worker `sportpro-automation` (prod) | VERIFIED live | same response |
| Same build in both | INFERRED | `/verify`, `/orders`, `/admin` HTML sha256 identical across envs |
| Public routes | VERIFIED | `/health`, `/verify`, `/orders`, `/admin`, `/robots.txt` (Cloudflare managed) |
| `/api/*` auth | VERIFIED | Every probed `/api/*` path returns 401 `{"error":"unauthorized"}`, including nonexistent ones → auth runs before routing (good). Dashboards send `Authorization: Bearer <token>` from localStorage keys `vt` / `ot` / `at` (verify / orders / admin). |
| Webhook route path | UNKNOWN | `/webhooks/shopify`, `/webhook`, `/shopify/webhook`, `/webhooks/orders/create` → 404 on GET. The real path may be POST-only or differently named. Not POSTed, by design. |
| Cron triggers, DO classes, D1 bindings, KV, secrets list | BLOCKED | Needs a Cloudflare API token |
| Staging vs prod isolation (separate D1? separate Shopify token?) | BLOCKED | Critical to verify. Identical code + a single Shopify store means staging may write to the **production** Shopify store. |

## D. D1

| Item | Status |
|---|---|
| `sportpro-orders-staging` exists | BLOCKED (named in handoff only) |
| Production D1 name | UNKNOWN |
| Tables, row counts, migrations | BLOCKED |
| Claimed: 20,039 `variant_state` / 715 `product_mappings` / 8,435 `discovery_candidates` | BLOCKED. Note: Shopify now has 20,665 variants, so `variant_state` (20,041) is at least 624 rows behind Shopify if the claim is accurate. |

Table names INFERRED from the dashboard API (not schema-verified): mappings, discovery candidates, recovery state (SKU recovery), orders, supplier_orders, approvals, procurement queue, alerts, audit, eligibility, suppliers, kill switch / settings.

## E. Supplier catalog

| Supplier | Platform | Feed reachable today | Shipping policy | Status |
|---|---|---|---|---|
| MegaSport | Shopify | VERIFIED | 300₪ / 24.90₪ (historical) | Re-verification pending |
| AroSport | Shopify | VERIFIED | 29₪ / product-level free (historical) | Re-verification pending |
| BashGal | Shopify | VERIFIED | 399₪ (historical) | Re-verification pending |
| Dugit | Shopify | VERIFIED | 250₪ / 30₪ (historical) | Re-verification pending |
| EnergyM | Shopify | VERIFIED | 35 / 19 / 399₪ (historical) | Re-verification pending |
| Arena Israel | WooCommerce Store API | VERIFIED | UNKNOWN | — |
| SportStock | WooCommerce Store API | VERIFIED | UNKNOWN | — |
| Footlocker IL | Shopify | VERIFIED | UNKNOWN | **Not in handoff; 81 ACTIVE** |
| Bealion | WooCommerce | VERIFIED | UNKNOWN | Not in handoff |
| Championshop | WooCommerce | VERIFIED | UNKNOWN | Not in handoff |
| KDHockey | Wix | `/products.json` 400 | UNKNOWN | No feed |
| Decathlon IL | — | no public feed found | UNKNOWN | **18 ACTIVE, no supply path** |

A canonical Supplier Master: BLOCKED/UNKNOWN (it would live in D1). Historical scan figures (MegaSport ~1,881, AroSport ~4,791, …) were not re-scanned in this phase. That is Phase 3 and needs a place to persist results.

## F. Existing mappings
- 715 mappings: BLOCKED (D1).
- API surface VERIFIED from UI: `POST /api/mappings/{id}/verify-live`, `POST /api/mappings/verify-live-batch`, `GET /api/verify/candidates?status=`, `GET /api/verify/summary`, `POST /api/verify/{type}`, `POST /api/verify/batch-approve`.
- UI status values seen: `MANUAL_VERIFIED`, `supplier_ready`, `AUTO_READY`, `REVIEW_REQUIRED`, `NEEDS_STOCK`, `NEEDS_DATA_FIX`, `NEEDS_OWNER_APPROVAL`, `PROFIT_BLOCKED`, `READY_FOR_APPROVAL_*`.

## G. Discovery
- Endpoints VERIFIED: `GET /api/verify/discovery?status=NEW&limit=1000`, `POST /api/verify/discovery/approve`, `/reject`, `/batch-approve`.
- **Risk VERIFIED**: the UI sends `acknowledge_low_conf:true` on every single approve. The server-side guard therefore never sees an un-acknowledged low-confidence approval from the UI.
- 8,435 candidates / 12 matching methods: BLOCKED (code + D1).

## H. Pricing
- `POST /api/pricing/recalc {dry_run:true}` exists in the admin UI (VERIFIED). Formula and tiers: BLOCKED (code).
- Shopify price data VERIFIED available for all 20,665 variants. Supplier cost is not in Shopify, so profitability cannot be recomputed without D1 or a fresh supplier scan.

## I. Shipping
Engine and rules: BLOCKED. Policies listed in E are historical and unverified.

## J. Stock
- Engine: BLOCKED.
- Shopify-side evidence (B.3) shows integer quantities on 6,028 variants. This is INFERRED to violate the AVAILABLE/UNAVAILABLE/UNKNOWN rule.

## K. Orders
- Endpoints VERIFIED: `GET /api/orders`, `GET /api/orders/{id}`, `GET /api/procurement/queue`, `GET /api/supplier-orders/{id}`, `POST /api/supplier-orders/{id}/checkout-draft`, `POST /api/supplier-orders/{id}/purchase {supplier_order_number, transaction_confirmation}`, `POST /api/supplier-orders/{id}/cancel`, `POST /api/approvals {supplier_order_id, stage, decision, approved_by}`.
- Two-stage approval (stage 1 / stage 2) is VERIFIED in UI code, consistent with the handoff.
- State machine, DO locking, idempotency: BLOCKED.
- Shopify orders in readable window: 0 (VERIFIED).

## L. Tracking
No tracking/fulfillment endpoint appears in any dashboard (VERIFIED absence in UI). Backend existence: UNKNOWN.

## M. Security

| Finding | Status |
|---|---|
| `/api/*` requires bearer token; unauthenticated → 401 before routing | VERIFIED |
| Admin pages publicly served (HTML only, no data without token) | VERIFIED; acceptable, but consider Cloudflare Access |
| Tokens stored in browser localStorage | VERIFIED. XSS on these pages would leak them. |
| `approved_by:'owner'` is a client-supplied string | VERIFIED. Identity is not bound to the token (INFERRED). Audit attribution is spoofable. |
| Kill switch toggle `POST /api/kill-switch {active:!current}` | VERIFIED. A toggle based on stale client state can flip it the wrong way. Should be explicit `{active:true/false}` + confirm. |
| Kill switch current value | BLOCKED |
| Bulk low-confidence approve (see G) | VERIFIED risk |
| Custom app "SportPro Manager" holds Shopify write scope, used today for 4,783 writes | VERIFIED |
| Repo visibility = public | VERIFIED. Don't commit catalog exports, D1 dumps or configs containing IDs. |
| Secrets printed during this audit | None |

## N. Tests
- No test files exist in any accessible repository (VERIFIED).
- "73/73", "86/86" and the E2E results: **BLOCKED / unverifiable**. They cannot be re-run without the source.

## O. Base44 dependencies — BASE44_DEPENDENCY_MAP (draft)

| Component | Current owner | Data source | Runtime dependency | Migration status | Risk |
|---|---|---|---|---|---|
| Worker source code | UNKNOWN (not in git) | — | n/a | **Not migrated** | **Critical**: code may exist only in Base44/deployed bundle |
| Dashboards `/verify` `/orders` `/admin` | Worker | Worker API | **None on Base44** (VERIFIED: no base44 or external URLs in HTML) | Done | Low |
| "SportPro Manager" Shopify app token | UNKNOWN | — | UNKNOWN | UNKNOWN | High |
| Order webhooks | UNKNOWN (registered by SportPro Manager) | — | UNKNOWN | UNKNOWN | High |
| Scheduled jobs (today's 07:43 / 10:16 UTC bursts) | UNKNOWN: Worker cron or Base44 automation | — | UNKNOWN | UNKNOWN | High |
| Mappings / candidates / SKU proposals | D1 (claimed) | — | — | BLOCKED | Medium |
| Admin tooling, CSVs, reports | Base44 (claimed) | — | — | BLOCKED | Medium |

BASE44_DEPENDENCY count: **cannot be computed (BLOCKED).** The visible Worker surface has zero Base44 references.

## P. Data inconsistencies (VERIFIED unless noted)
1. Variants: Shopify 20,665 vs claimed 20,039 / D1 20,041 (claimed).
2. SKU fixes: claimed 4,707 applied; Shopify shows ~0 net.
3. Status totals: the historical report omitted 20 ARCHIVED.
4. 99 ACTIVE products from suppliers (footlocker, decathlon) with no documented/verified supply path.
5. 1,297 ACTIVE products with zero stock everywhere.
6. Synthetic-looking stock quantities on 6,028 variants.
7. 264 duplicate SKU values across 1,883 variants.
8. 0 barcodes in Shopify, so barcode matching is unavailable on the Shopify side.
9. Supplier list in handoff (9) vs Shopify supplier tags (27).

## Q. Duplicate systems
- Staging and prod run the same build and (INFERRED) the same Shopify store. "Staging" may not be isolated from production data. BLOCKED to confirm.
- Possible two writers to Shopify: Worker and Base44 (UNKNOWN which ran today's job).

## R. Missing capabilities (vs. handoff target)
Supplier Master + history tables, canonical product identity, explicit stock tri-state in Shopify sync, shipping as first-class verified data for 6+ suppliers, a tracking/fulfillment UI, separate mapping-approval vs listing-approval, `/admin/catalog` (404 today), per-product "why blocked" view, supplier health metrics, a version-controlled source + CI test suite.

## S. Supplier-First migration plan (phased, nothing executed)

| Phase | What | Gate |
|---|---|---|
| 0 | **Recover the source**: pull the deployed Worker script(s) via Cloudflare API into this repo (read-only download); export Base44 code if it lives there. Make the repo private. | Source in git, builds, tests run |
| 1 | Complete audit with D1 read access (schemas, counts, migrations, kill-switch value, cron schedule, bindings, secrets *names* only) | This report updated, no BLOCKED rows |
| 2 | Backups: D1 export (staging + prod), Shopify bulk export (done today, scratchpad), mapping/candidate/SKU-proposal export to private storage | sha256 manifest |
| 3 | Supplier Master in **staging D1**: append-only tables, fresh scans of the 9 reachable feeds | Master report |
| 4 | Reconcile Supplier Master ↔ existing 715 mappings ↔ 20,665 Shopify variants | Catalog truth report |
| 5 | Eligibility gate + full dry run (no writes) | CSV + summary |
| 6+ | Listing proposals → small-batch owner approval → pilot | Per handoff §43 |

Immediate safety recommendations (proposals only; **none executed**):
1. Confirm the kill switch is ON in **both** environments (read `GET /api/kill-switch`).
2. Identify what triggered the 4,783-product demotion today, and whether any scheduled job will re-run it or reverse it.
3. Decide policy for the 99 ACTIVE footlocker/decathlon products (a proposed DRAFT batch would need the full dry-run/diff/approval protocol).
4. Remove `acknowledge_low_conf:true` from the `/verify` UI; require explicit per-item acknowledgement server-side.

## T. Exact next commands

### What I need from you (no secrets in chat)
Add these as **environment variables** in this cloud environment's settings (session title bar → environment menu → Edit). A new session picks them up.

| Variable | Purpose | Minimum scope |
|---|---|---|
| `CLOUDFLARE_API_TOKEN` | Download Worker scripts, list bindings/crons, read D1 | Account: Workers Scripts **Read**, D1 **Read** (add D1 Edit later for staging-only Supplier Master) |
| `CLOUDFLARE_ACCOUNT_ID` | Account selector | — |
| `SPORTPRO_STAGING_ADMIN_TOKEN` | Read-only `GET /api/*` on **staging** (kill switch, dashboard, summaries) | Whatever token the `/admin` page uses |
| `SPORTPRO_PROD_ADMIN_TOKEN` (optional) | Read-only `GET` on prod for reconciliation | same |

Also tell me where the Worker source lives (Base44 project, local folder, another GitHub repo). If it's another GitHub repo, I can attach it directly.

### Commands I will run once access exists (all read-only)
```bash
npm i -g wrangler
wrangler whoami
wrangler deployments list --name sportpro-automation-staging
wrangler deployments list --name sportpro-automation
# download deployed source (read-only) into repo/src-recovered/
curl -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
  https://api.cloudflare.com/client/v4/accounts/$CLOUDFLARE_ACCOUNT_ID/workers/scripts/sportpro-automation-staging/content
curl -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
  https://api.cloudflare.com/client/v4/accounts/$CLOUDFLARE_ACCOUNT_ID/workers/scripts/sportpro-automation-staging/settings   # bindings, DO, compat
curl -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
  https://api.cloudflare.com/client/v4/accounts/$CLOUDFLARE_ACCOUNT_ID/workers/scripts/sportpro-automation-staging/schedules  # crons
wrangler d1 list
wrangler d1 execute sportpro-orders-staging --remote --command "SELECT name, sql FROM sqlite_master"
wrangler d1 execute sportpro-orders-staging --remote --command "SELECT * FROM d1_migrations"
wrangler d1 export sportpro-orders-staging --remote --output backup-staging.sql   # backup, kept out of the public repo
curl -H "Authorization: Bearer $SPORTPRO_STAGING_ADMIN_TOKEN" \
  https://sportpro-automation-staging.sportkaraspro.workers.dev/api/kill-switch
```

---

## Answers to the 20 questions (§32)

| # | Question | Answer |
|---|---|---|
| 1 | What actually exists? | Two live Workers (same build), 3 dashboards, a token-gated `/api`, a Shopify store with 7,114/20,665 products/variants, a custom Shopify app "SportPro Manager" with write access. No source in git. |
| 2 | Where does it run? | Cloudflare Workers `*.sportkaraspro.workers.dev` (VERIFIED). D1/DO: claimed, BLOCKED. |
| 3 | Files per subsystem? | BLOCKED: no source available. API map in F/G/H/K. |
| 4 | D1 tables? | BLOCKED; inferred list in D. |
| 5 | Migrations run? | BLOCKED |
| 6 | Endpoints? | 31 method+path pairs referenced by the dashboard JS (VERIFIED present in UI code; server responses not exercised — all 401 without token) plus public `/health`. Sections C/F/G/H/K + admin: `/api/dashboard`, `/api/suppliers`, `/api/eligibility`, `POST /api/eligibility/run`, `/api/alerts`, `POST /api/alerts/{id}/read`, `/api/audit?limit=`, `/api/kill-switch`, `/api/recovery/state*`). |
| 7 | Supplier adapters? | Code BLOCKED. Feeds reachable: 10 suppliers (E). |
| 8 | Secrets/bindings? | BLOCKED |
| 9 | Staging? | Live Worker, same build as prod, same Shopify store (INFERRED) |
| 10 | Production? | Live Worker; Shopify store `xayj9j-q9` |
| 11 | Depends on Base44? | Dashboards: no (VERIFIED). Source, scheduler, app token: UNKNOWN |
| 12 | Only in Base44? | UNKNOWN/BLOCKED; possibly the source code itself |
| 13 | Only in D1? | Mappings, candidates, SKU proposals, orders, audit (claimed) — BLOCKED |
| 14 | Only in Shopify? | Supplier tags for 27 sources, prices, product content; full snapshot taken |
| 15 | Historical claims verified? | 7,114 ✔, 1,947/5,147 ✔ (archived omitted), 20,039 ✘ (20,665), 4,707 SKU fixes ✘, tests/D1/mappings: unverifiable |
| 16 | Broken? | Inventory semantics, ACTIVE-but-zero-stock (1,297), unsupported ACTIVE suppliers (99), low-conf auto-ack, SKU fixes missing |
| 17 | Duplicated? | Staging/prod not demonstrably isolated; possibly two Shopify writers |
| 18 | Preserve? | Everything in D1 (mappings, candidates, audit), the Worker bundle, dashboards, two-stage approval, kill switch, auth-before-routing |
| 19 | Replace? | Stock→Shopify quantity sync; UI low-conf auto-ack; toggle-style kill switch; Shopify-first catalog activation |
| 20 | Safest path? | Phase 0: recover source into a **private** repo → read-only D1 audit → backups → staging-only Supplier Master (S) |
