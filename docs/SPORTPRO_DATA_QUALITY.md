> **Superseded for numbers (2026-10-05)** by `docs/SPORTPRO_SELLABLE_CATALOG_AUDIT.md` (new matching engine + live verification). Key corrections: AroSport "option not offered" was mostly a shoe-width dimension, not only a generic size grid; purchasable-but-supplier-unavailable is 3,391 and loss-making 1,673 (more variants are now matched); the Claude Shopify connector itself is one of the four writers.

# SPORTPRO — Data Quality (Phase 0)

Snapshot 2026-10-04. Every number is VERIFIED from `audit/shopify_variants.csv` / `audit/supplier_catalog.csv` unless labelled otherwise.

## 1. Integrity checklist

| Check | Result |
|---|---|
| Duplicate SKUs | **264** SKU values shared by **1,883** variants (1,793 on ACTIVE products). Max reuse: one SKU on 20 variants. |
| Missing SKUs | **14,622** of 20,665 variants (70.8%). AroSport: 6 of 9,244 variants have a SKU, even though AroSport's feed has SKUs on 34,298 of 34,318 variants. |
| Missing barcodes | **20,665 / 20,665**. No supplier publishes barcodes either, so barcode matching is not available anywhere. |
| Duplicate supplier mappings | **585** Shopify variants map to a supplier variant that another Shopify variant also maps to (duplicate listings of the same item). |
| Products with supplier tag but no matched variant | **4,099** products (1,103 ACTIVE) |
| Supplier product no longer in supplier feed | **1,156** variants (`NO_PRODUCT_MATCH`). Renamed or removed at supplier. |
| Mappings with no current supplier product (D1) | BLOCKED (D1 not readable) |
| ACTIVE products without any sellable-candidate variant | **1,841** of 1,947 |
| Candidate variants whose parent is DRAFT | **1,530** (1,466 AUTO_READY + 64 OWNER_APPROVAL). **All 1,466 AUTO_READY were drafted on 2026-10-01.** |
| Stale supplier prices / stock | 0 at audit time (fresh scan, < 1 h). Nothing in Shopify records when a price was last checked, so Shopify-side freshness is unknowable. |
| Unsupported suppliers | decathlon, kdhockey (no feed); dmksports, probody, rhinoshop, sportcom, פרופר ספורט, ספורטי, ג'ינה פלוס, אור ספורט, דור ספורט, Rawlings (not onboarded); יבוא אישי, Titleist Direct, לא זוהה, sportpro, untagged (no supplier). **1,962 variants.** |
| Archived | 20 products / 28 variants |

## 2. Variant structure does not mirror the supplier (the main blocker)

Of 9,901 MAPPING_REQUIRED variants:

| Reason | Variants | What happened | Deterministic fix? |
|---|---:|---|---|
| OPTION_NOT_OFFERED_BY_SUPPLIER | 7,287 | Shopify offers a size the supplier does not. AroSport: a generic S/M/L/XL/XXL grid applied regardless of the real sizes (e.g. supplier sells XS–XL, we sell S–XXL). Dugit: we list EU 40–45, supplier lists UK 4–9. | Partly. Variants absent from the supplier can be removed (deterministic). EU↔UK conversion needs a per-brand size chart (owner decision). |
| NO_PRODUCT_MATCH | 1,156 | Title not found in supplier feed | No: needs re-discovery |
| SHOPIFY_COLLAPSED_VARIANTS | 772 | Shopify has one "Default" variant; supplier sells colors, sizes or resistance levels | Yes: rebuild variants from the supplier (structural write) |
| AMBIGUOUS_PRODUCT | 354 | Several supplier products share the exact title | No: owner picks |
| SUPPLIER_HAS_NO_VARIANTS | 283 | Supplier sells one unsized item; we sell sizes | Yes: collapse to one variant |
| SKU_OPTIONS_MISMATCH / AMBIGUOUS_SKU / SKU_TITLE_CONFLICT | 49 | Identifier evidence contradicts itself | No: owner review |

## 3. Pricing vs. supplier cost (matched variants, 8,788)

| Shopify price ÷ supplier cost | Variants |
|---|---:|
| < 1.00 (selling below supplier price) | 368 |
| 1.00–1.10 | 3,943 |
| 1.10–1.20 | 3,847 |
| ≥ 1.20 | 629 |

- Net loss (with verified shipping and fees): **3,181** matched variants, of which **1,486 are on ACTIVE products** and 1,319 are purchasable.
- Main driver: AroSport's 29 ₪ flat shipping on items priced at about cost + 10% (1,251 of the ACTIVE loss-makers are AroSport). This is the structural problem the handoff predicted (§11).
- AUTO_READY margins are thin: 1,687 of 1,805 are 4–6% net.

## 4. Inventory semantics

| Fact | Value |
|---|---|
| Supplier feeds exposing a quantity | **0 of 10**. Shopify feeds give `available` (bool); Woo gives `is_in_stock` (bool) and `low_stock_remaining` (null). |
| Shopify variants with qty > 0 | 6,028 |
| Pattern by creating app | *ספורט פרו*: qty 2 (2,188), 10 (1,058), 1 (730). *Claude Connector*: roughly uniform 1–10 (e.g. 8 → 241, 6 → 181, 3 → 171). |
| Inventory tracking disabled | 9,906 variants (9,870 created by *ספורט פרו*) |
| Shopify qty > 0 while supplier UNAVAILABLE | 307 (142 ACTIVE) |
| Shopify qty ≤ 0 while supplier AVAILABLE | 4,293 (1,656 ACTIVE) |

**Conclusion (INFERRED, strong):** Shopify quantities are synthetic placeholders written by the importing apps. They carry no supplier meaning and contradict the AVAILABLE / UNAVAILABLE / UNKNOWN model. The exact code that wrote them is BLOCKED (source missing). Per instructions, they have **not** been normalized.

Proposed target semantics (not applied): quantity is not a supplier fact. Shopify availability should be derived from eligibility: SELLABLE → purchasable, everything else → not purchasable. That can be expressed either as tracked inventory with a fixed buffer plus `DENY`, or as product status, decided at the listing-policy stage.

## 5. Other data defects

- 5 tag occurrences containing a leaked Python dict repr (`'name'` ×3, `{'id'` ×2), from an import serialization bug.
- 51 products with no supplier tag; 47 tagged "לא זוהה" (unidentified).
- Supplier identity exists only as a free-text tag. There is no stored supplier URL, product ID, variant ID or SKU, so every mapping in this audit had to be re-derived by matching.
- BashGal and EnergyM publish identical shipping-policy text (INFERRED: same operator). Supplier deduplication should be considered.
