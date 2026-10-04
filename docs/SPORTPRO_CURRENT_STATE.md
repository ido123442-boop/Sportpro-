# SPORTPRO — Current State (Phase 0 audit)

Snapshot: 2026-10-04 ~16:00 UTC. Labels: **VERIFIED / INFERRED / UNKNOWN / BLOCKED**.
Supersedes `SPORTPRO_CURRENT_STATE_AUDIT.md` (2026-10-01), which contains one error, corrected in §B.4.

---

## A. Repository audit

| Item | Finding | Label |
|---|---|---|
| Remotes | `origin` = `github.com/ido123442-boop/Sportpro-` (**public**) — the only repository this account exposes | VERIFIED |
| Branches | `main` (README only), `ccr-e8d58ef1-yhjgjd` (unrelated Python trading bot), `ccr-a4dc76e5-wrtk77` (this audit) | VERIFIED |
| Worker source code | **Not in any reachable repository.** Not on GitHub for this account. Location UNKNOWN: candidates are a Base44 project, a local machine, or only the deployed bundle in Cloudflare. | VERIFIED absent / location UNKNOWN |
| Package/build system | Old Worker: UNKNOWN. This repo now has a minimal Node ESM package (`package.json`, `node --test`), no dependencies | VERIFIED |
| Wrangler config | None found | VERIFIED absent |
| Worker names | `sportpro-automation-staging`, `sportpro-automation` (both on `*.sportkaraspro.workers.dev`, both return `{"ok":true,"service":"sportpro-automation-v2"}` on `/health`) | VERIFIED |
| Same build in both envs | `/verify`, `/orders`, `/admin` HTML byte-identical across envs | INFERRED same code |
| D1 databases | `sportpro-orders-staging` (named in handoff); production D1 name unknown | BLOCKED |
| Durable Objects / queues / cron triggers | — | BLOCKED |
| Environment separation & bindings | — | BLOCKED |
| Secrets (names only) | — | BLOCKED. Needs `CLOUDFLARE_API_TOKEN` (Workers Scripts:Read, D1:Read) + `CLOUDFLARE_ACCOUNT_ID` in the environment settings. |

**Shopify API clients that have written to production** (VERIFIED from Shopify event log, 2026-07-15 → 2026-10-01; no product events between 2026-09-06 and 2026-09-18):

| App title | api_client_id | Active period | Writes |
|---|---|---|---|
| Shopify Claude Connector App | 341262598145 | 2026-07-15 → 2026-08-09 | 2,109 creates, 1,482 publishes, 257 status changes (incl. 110 draft→active) |
| ספורט פרו | 409032753153 | 2026-08-11 → 2026-08-28 | 5,005+ creates, 10,638+ publishes, **999 product destroys (2026-08-28)**, 203 status changes |
| ספורט פרו סופי | 416810893313 | 2026-09-18 → 2026-09-22 | pages, collections, 98 status changes |
| **SportPro Manager** | **423502872577** | 2026-09-18 → 2026-10-01 | 4,857 status changes, 7,897 unpublishes |

All four are API apps; `attributeToUser=false` on every one of these events. Only 6 events in the period are attributed to the Shopify mobile app (human).

---

## B. Shopify audit (VERIFIED)

Full export: `audit/shopify_variants.csv` (one row per variant, 44 columns).

| Metric | Value |
|---|---|
| Products | 7,114 — ACTIVE 1,947 · DRAFT 5,147 · ARCHIVED 20 |
| Variants | 20,665 — under ACTIVE 11,045 · DRAFT 9,592 · ARCHIVED 28 |
| Variants with SKU / missing | 6,043 / 14,622 |
| Duplicate SKU values | 264 values used by 1,883 variants (1,793 of them on ACTIVE products; max reuse 20) |
| Barcodes | 0 |
| Inventory tracked / not tracked | 10,759 / **9,906** |
| Variants with qty > 0 | 6,028 (values: 2 → 2,336; 10 → 1,216; 1 → 915; …) |
| Inventory policy | DENY on all 20,665 |
| Locations | 1 (`הצבר 15`, fulfills online orders) |
| Collection memberships | 13,049 |
| Metafields | only `custom.gender` (2,542 products). **No supplier metadata in Shopify.** |
| Images | every ACTIVE and DRAFT product has ≥ 1 media item |
| Product creation | 2026-07 (1,069) and 2026-08 (6,045) |
| Orders visible to the connector | 0 |

### B.1 What a customer can buy right now (VERIFIED)
A variant is purchasable when the product is ACTIVE and (inventory not tracked **or** qty > 0).

| | Count |
|---|---|
| Purchasable ACTIVE variants | **7,194** of 11,045 (4,267 untracked + 2,927 tracked with qty > 0) |
| Purchasable ACTIVE products | **1,489** of 1,947 |
| …whose supplier variant is currently **UNAVAILABLE** | **2,146** variants |
| …priced **below landed cost** (net < 0 with verified shipping) | **1,319** variants (median net −20.61 ₪; worst −376.88 ₪) |
| …in state AUTO_READY (fully passes deterministic gates) | 339 |

Live-verified example: *מחבט פאדל Head Gravity Pro 2024* is ACTIVE at 753.00 ₪ with qty 3; AroSport sells it at **1,066.00 ₪** (available), so every sale loses 376.88 ₪ after shipping and fees.

### B.2 Supplier tags — complete list (26 values + untagged)

| Tag | Class | Products (A/D/X) | Variants | Feed |
|---|---|---|---|---|
| bashgal | DOCUMENTED | 1,847 (11/1,822/14) | 2,010 | Shopify ✔ |
| arosport | DOCUMENTED | 1,823 (1,501/321/1) | 9,244 | Shopify ✔ |
| dugit | DOCUMENTED | 637 (0/637/0) | 651 | Shopify ✔ |
| footlocker | **UNDOCUMENTED** | 559 (81/477/1) | 3,912 | Shopify ✔ |
| megasport | DOCUMENTED | 460 (331/129/0) | 2,249 | Shopify ✔ |
| decathlon | DOCUMENTED | 440 (18/422/0) | 959 | **none** |
| energym | DOCUMENTED | 254 (5/249/0) | 254 | Shopify ✔ |
| bealion | UNDOCUMENTED | 242 (0/242/0) | 242 | WooCommerce ✔ |
| יבוא אישי | UNKNOWN | 193 (0/193/0) | 385 | n/a (personal import) |
| kdhockey | DOCUMENTED | 169 (0/169/0) | 198 | **none** (Wix) |
| dmksports | UNDOCUMENTED | 115 (0/115/0) | 155 | not onboarded |
| probody | UNDOCUMENTED | 69 (0/69/0) | 69 | not onboarded |
| *(untagged)* | UNKNOWN | 51 (0/51/0) | 74 | — |
| sportstock | DOCUMENTED | 49 (0/49/0) | 49 | WooCommerce ✔ |
| championshop | UNDOCUMENTED | 48 (0/48/0) | 48 | WooCommerce ✔ |
| לא זוהה | UNKNOWN | 47 (0/47/0) | 47 | n/a ("unidentified") |
| arena | DOCUMENTED | 40 (0/40/0) | 40 | WooCommerce ✔ |
| sportpro | UNKNOWN | 27 (0/23/4) | 35 | own brand, source unknown |
| rhinoshop | UNDOCUMENTED | 16 | 16 | not onboarded |
| פרופר ספורט | UNDOCUMENTED | 6 | 6 | not onboarded |
| Titleist Direct (יבוא אישי) | UNKNOWN | 5 | 5 | personal import |
| sportcom | UNDOCUMENTED | 5 | 5 | not onboarded |
| ספורטי | UNDOCUMENTED | 4 | 4 | not onboarded |
| ג'ינה פלוס | UNDOCUMENTED | 4 | 4 | not onboarded |
| אור ספורט | UNDOCUMENTED | 2 | 2 | not onboarded |
| דור ספורט | UNDOCUMENTED | 1 | 1 | not onboarded |
| Rawlings | UNDOCUMENTED | 1 | 1 | not onboarded |

Totals: **DOCUMENTED 9 · UNDOCUMENTED 13 · UNKNOWN 4** (+ untagged).

### B.3 Footlocker / Decathlon ACTIVE products (VERIFIED)
- **Footlocker: 81 ACTIVE products / 711 variants.** All were created by app *ספורט פרו* on 2026-08-25 (18), 08-26 (23) and 08-27 (40). Every variant has a SKU that exists in footlocker.co.il's live feed, so Footlocker is the best-mapped supplier (1,803 AUTO_READY variants, mostly on DRAFT products). Shopify quantities: 0 on all 711, but inventory is **not tracked** on them, so they are purchasable.
- **Decathlon: 18 ACTIVE products / 72 variants.** All were created by *Shopify Claude Connector App* between 2026-07-24 and 2026-08-07. Decathlon IL has no public catalog feed, so there is no way to verify price or stock: SUPPLIER_REQUIRED.
- Exact product lists: `audit/shopify_variants.csv` filtered by `supplier_tag` in (footlocker, decathlon) and `shopify_status=ACTIVE`.

### B.4 Correction to the 2026-10-01 report
I reported "1,297 ACTIVE products have zero inventory → unbuyable". The 1,297 count is correct (re-verified), but the conclusion was wrong: 9,906 variants have **inventory tracking disabled**, and those sell regardless of quantity. 1,489 ACTIVE products are purchasable today (§B.1).

---

## C. Supplier audit (VERIFIED; scan 2026-10-04 15:57–15:58 UTC)

| Supplier | Feed / type | Products | Variants | AVAILABLE | UNAVAILABLE | Variant SKU | Shipping (evidence) | Checkout technically possible | Checkout verified |
|---|---|---|---|---|---|---|---|---|---|
| arosport | `/products.json` Shopify | 4,819 | 34,318 | 6,504 | 27,814 | 34,298 | **29 ₪ flat** (policy page) — VERIFIED | yes (Shopify cart) INFERRED | no |
| footlocker | `/products.json` Shopify | 3,861 | 25,512 | 16,761 | 8,751 | 25,512 | **free ≥ 199 ₪, else 14.90 ₪** (policy page) — VERIFIED | yes INFERRED | no |
| megasport | `/products.json` Shopify | 1,840 | 10,858 | 5,443 | 5,415 | 10,854 | free ≥ 300 ₪ on apparel/footwear (site banner) — CONDITIONAL; below threshold / other categories **UNKNOWN** (policy page empty) | yes INFERRED | no |
| dugit | `/products.json` Shopify | 2,977 | 9,899 | 4,680 | 5,219 | 8,775 | **30 ₪, free > 250 ₪** (policy page) — VERIFIED | yes INFERRED | no |
| energym | `/products.json` Shopify | 1,890 | 3,199 | 2,762 | 437 | 3,166 | 35 ₪ home ≤ 20 kg; oversize varies — CONDITIONAL / EXCEPTION | yes INFERRED | no |
| bashgal | `/products.json` Shopify | 1,642 | 2,918 | 2,463 | 455 | 2,911 | same policy text as energym (likely same operator): 35 ₪ ≤ 20 kg — CONDITIONAL | yes INFERRED | no |
| arena | Woo Store API | 247 | 1,273 | product-level only | — | product-level | UNKNOWN | yes INFERRED | no |
| sportstock | Woo Store API | 764 | 764 | 671 | 93 | 764 | UNKNOWN ("calculated at order") | yes INFERRED | no |
| championshop | Woo Store API | 656 | 873 | 461 | 195 | 329 | UNKNOWN | yes INFERRED | no |
| bealion | Woo Store API | 205 | 551 | product-level only | — | 0 | free > 249 ₪ (banner); below UNKNOWN | yes INFERRED | no |
| kdhockey | none (Wix) | — | — | — | — | — | UNKNOWN | UNKNOWN | no |
| decathlon | none | — | — | — | — | — | UNKNOWN | UNKNOWN | no |

Notes:
- No supplier exposes stock **quantity** or **barcodes** (VERIFIED).
- WooCommerce variable products expose stock only per product, so per-size stock is UNKNOWN and fail-closed.
- AroSport products carry tags like `PaidShipping`, i.e. product-level shipping markers. They are recorded but not used; the 29 ₪ flat rate is applied conservatively.
- "Last successful fetch" for every feed is 2026-10-04 15:58 UTC (`supplier_catalog.csv:fetched_at`).
- Full supplier catalog: `audit/supplier_catalog.csv` (90,165 rows).

---

## D. Mapping audit

| Item | Status |
|---|---|
| Existing D1 mappings (claimed 715) | **BLOCKED**. Cannot list, verify or compare. |
| Proposed mappings produced by this audit | **8,788** Shopify variants matched deterministically to a live supplier variant (`audit/mappings.csv`). **None approved.** |
| Match methods | `SKU_EXACT` 3,275 · `SKU_EXACT+TITLE_OPTIONS_EXACT` 2,184 → tier **EXACT** (5,459); `TITLE_OPTIONS_EXACT` 3,329 → tier **HIGH** (needs owner approval) |
| Not matched | 11,474 (no product in feed, size/color not offered, collapsed variants, …) |
| Ambiguous / conflicting | 364 ambiguous, 39 conflicting (SKU vs title/options disagree) |
| Spot check | 6 random AUTO_READY rows re-fetched live from footlocker.co.il: price, availability, SKU and size matched 6/6 |

Every mapping row carries: Shopify product/variant, supplier, supplier product URL, supplier variant ID, both SKUs, both size/color strings, tier, method, confidence, fetch time, live price, live stock, shipping, status and blocked reason.

---

## E. Production mutation audit — 2026-10-01 ACTIVE → DRAFT

| Question | Answer | Label |
|---|---|---|
| What changed | **4,783 products ACTIVE → DRAFT**, plus 7,749 "unpublished from Online Store / Point of Sale" events. Every transition was active→draft. | VERIFIED |
| Who (Shopify identity) | App **"SportPro Manager"**, `api_client_id 423502872577`. `attributeToApp=true`, `attributeToUser=false`. | VERIFIED |
| When | **Batch B1:** 2026-10-01 **07:35:xx → 07:43:15 UTC** (10:35–10:43 Israel), 4,771 products at a steady ~600/min (≈10 per second). **Batch B2:** 10:16:52 → 10:22:01 UTC, 12 products at irregular intervals (2 s to 54 s apart). | VERIFIED |
| Mechanism | B1 is a scripted loop (constant ~10/s rate over 8 minutes, starting at a non-round minute). B2 looks like individual, one-at-a-time actions. | INFERRED |
| Which system ran it (Worker cron / Worker admin endpoint / external script / Base44) | The Shopify log identifies only the API credential, not the host that used it. The deployed Worker's routes, crons and logs are BLOCKED, and its source is missing. | **BLOCKED** |
| Why (selection rule) | Not derivable from Shopify data. Drafted and kept sets overlap on every Shopify attribute: 2,563 drafted products had stock while 1,297 kept ones have none; creator app, creation month, SKU coverage and images all overlap. The kept set is limited to 6 suppliers (arosport 1,501, megasport 331, footlocker 81, decathlon 18, bashgal 11, energym 5), so the criterion most likely came from D1 state (eligibility / variant_state), which is BLOCKED. | UNKNOWN |
| Was it a supply-correct decision? | Partly. The kept 1,947 include 1,841 products with **no** variant that passes the deterministic gates, while **all 1,466 AUTO_READY variants on DRAFT products were drafted by this run** (mostly Footlocker). | VERIFIED (vs. today's supplier data) |
| Earlier, similar runs | SportPro Manager: 1 on 2026-09-18, 73 on 2026-09-23. ספורט פרו: 193 on 2026-08-19. Claude Connector: 118 in July–Aug. | VERIFIED |
| Can it happen again? | **Yes.** The SportPro Manager credential is still installed (its scopes are not readable: `appInstallations` → access denied), and nothing observable prevents a re-run. | INFERRED |

Full event list: `audit/production_mutations.csv` (column `batch` = B1 / B2).

---

## F. Safety audit
See `docs/SPORTPRO_SAFETY_AUDIT.md`.

## G. Data integrity audit
See `docs/SPORTPRO_DATA_QUALITY.md`.

---

## H. Final classification — every variant, exactly one state

Contract and gate order: `docs/SPORTPRO_ARCHITECTURE_V2.md` §3. Implementation: `src/core/eligibility.js` (covered by the 33-test suite). Global fail-closed inputs:
- mapping approvals = **not approved** (D1 BLOCKED)
- supplier checkout = **unverified** for every supplier

| State | All variants | Under ACTIVE products |
|---|---:|---:|
| **SELLABLE** | **0** | 0 |
| AUTO_READY | 1,805 | 339 |
| OWNER_APPROVAL | 98 | 34 |
| DATA_FIX | 214 | 214 |
| MAPPING_REQUIRED | 9,901 | 6,793 |
| SUPPLIER_REQUIRED | 1,962 | 72 |
| STOCK_BLOCKED | 3,566 | 2,427 |
| SHIPPING_BLOCKED | 969 | 783 |
| PROFIT_BLOCKED | 1,537 | 304 |
| RISK_BLOCKED | 585 | 79 |
| STALE | 0 | 0 |
| INVALID | 28 | 0 |
| UNKNOWN | 0 | 0 |
| **Total** | **20,665** | **11,045** |

### H.1 By supplier

| Supplier | Variants | AUTO_READY | OWNER_APPR. | DATA_FIX | MAPPING_REQ. | SUPPLIER_REQ. | STOCK | SHIPPING | PROFIT | RISK | INVALID |
|---|---|---|---|---|---|---|---|---|---|---|---|
| arosport | 9,244 | · | 28 | · | 7,522 | · | 1,482 | · | 147 | 64 | 1 |
| footlocker | 3,912 | 1,803 | 5 | · | 328 | · | 1,091 | · | 658 | 18 | 9 |
| megasport | 2,249 | 1 | 5 | 214 | 414 | · | 759 | 817 | 15 | 24 | · |
| bashgal | 2,010 | · | 13 | · | 868 | · | 126 | 86 | 580 | 323 | 14 |
| decathlon | 959 | · | · | · | · | 959 | · | · | · | · | · |
| dugit | 651 | · | 47 | · | 461 | · | 69 | · | 74 | · | · |
| יבוא אישי | 385 | · | · | · | · | 385 | · | · | · | · | · |
| energym | 254 | 1 | · | · | 81 | · | 16 | 27 | 63 | 66 | · |
| bealion | 242 | · | · | · | 164 | · | · | · | · | 78 | · |
| kdhockey | 198 | · | · | · | · | 198 | · | · | · | · | · |
| dmksports | 155 | · | · | · | · | 155 | · | · | · | · | · |
| untagged | 74 | · | · | · | · | 74 | · | · | · | · | · |
| probody | 69 | · | · | · | · | 69 | · | · | · | · | · |
| sportstock | 49 | · | · | · | 21 | · | 4 | 24 | · | · | · |
| championshop | 48 | · | · | · | 3 | · | 18 | 15 | · | 12 | · |
| לא זוהה | 47 | · | · | · | · | 47 | · | · | · | · | · |
| arena | 40 | · | · | · | 39 | · | 1 | · | · | · | · |
| sportpro | 35 | · | · | · | · | 31 | · | · | · | · | 4 |
| 9 small tags | 46 | · | · | · | · | 46 | · | · | · | · | · |

### H.2 Primary reasons (all variants)

| Count | State : reason |
|---:|---|
| 7,287 | MAPPING_REQUIRED : OPTION_NOT_OFFERED_BY_SUPPLIER (mostly AroSport generic S–XXL grids; Dugit EU vs UK sizes) |
| 3,565 | STOCK_BLOCKED : STOCK_UNAVAILABLE |
| 1,805 | AUTO_READY : AWAITING_MAPPING_RECORD |
| 1,468 | PROFIT_BLOCKED : PROFIT_BELOW_MIN |
| 1,156 | MAPPING_REQUIRED : NO_PRODUCT_MATCH (supplier product renamed or removed) |
| 959 | SUPPLIER_REQUIRED : NO_PUBLIC_CATALOG_FEED (decathlon) |
| 817 | SHIPPING_BLOCKED : MegaSport below 300 ₪ / non-apparel (cost unpublished) |
| 772 | MAPPING_REQUIRED : SHOPIFY_COLLAPSED_VARIANTS |
| 585 | RISK_BLOCKED : DUPLICATE_SUPPLIER_MAPPING |
| 390 | SUPPLIER_REQUIRED : PERSONAL_IMPORT_NO_SUPPLIER |
| 354 | MAPPING_REQUIRED : AMBIGUOUS_PRODUCT |
| 283 | MAPPING_REQUIRED : SUPPLIER_HAS_NO_VARIANTS |
| 263 | SUPPLIER_REQUIRED : SUPPLIER_NOT_ONBOARDED |
| 214 | DATA_FIX : DUPLICATE_SKU |
| 198 | SUPPLIER_REQUIRED : NO_PUBLIC_CATALOG_FEED (kdhockey) |
| 98 | OWNER_APPROVAL : MAPPING_NEEDS_OWNER_APPROVAL |
| 90 | SHIPPING_BLOCKED : OVERSIZE_OVER_20KG |
| 74 | SUPPLIER_REQUIRED : NO_SUPPLIER_TAG |
| 69 | PROFIT_BLOCKED : MARGIN_BELOW_MIN |
| 47 / 39 / 36 / 31 / 28 / 23 / 10 / 3 / 1 | SUPPLIER_UNIDENTIFIED / NO_VERIFIED_POLICY / SKU_OPTIONS_MISMATCH / OWN_BRAND_SOURCE_UNKNOWN / PRODUCT_ARCHIVED / WEIGHT_UNKNOWN / AMBIGUOUS_SKU / SKU_TITLE_CONFLICT / STOCK_UNKNOWN |

### H.3 Product level (furthest state any variant reaches)
422 products have at least one candidate variant (AUTO_READY / OWNER_APPROVAL / DATA_FIX). **Of the 1,947 ACTIVE products, only 106 do**: 50 AUTO_READY, 18 OWNER_APPROVAL, 38 DATA_FIX.

### H.4 Caveat on AUTO_READY economics
1,687 of 1,805 AUTO_READY variants have a net margin of 4–6%. They pass the documented minimum (≥ 10 ₪ and ≥ 4%), but with no buffer for returns, VAT treatment or payment-fee changes.
