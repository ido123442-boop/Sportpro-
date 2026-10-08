# SPORTPRO — Product Quality

קוד: `src/core/productData.js`. טסטים: `test/productData.test.js` ו-`test/engines.test.js`.

## `validateListingForPublish(listing, ctx)`
`autoPublishAllowed` תמיד false. כל BLOCK מונע פרסום.

| שדה | BLOCK | WARN |
|---|---|---|
| title | `TITLE_MISSING`, ‏`TITLE_TOO_LONG` (מעל 255), ‏`TITLE_IS_STORE_NAME` | |
| description | `DESCRIPTION_MISSING_OR_TOO_SHORT` (פחות מ-20 תווים של טקסט) | |
| images | `IMAGES_MISSING` (לפחות תמונה אחת ב-https) | |
| brand | `BRAND_UNKNOWN` (אין מותג מאומת אצל הספק, או שהוא שם החנות), ‏`BRAND_MISMATCH` | |
| vendor | `VENDOR_NOT_BRAND` (vendor חייב להיות המותג המאומת) | |
| product type | `PRODUCT_TYPE_INVALID` (רק ערכים מתוך `PRODUCT_TYPE_MAP`) | |
| collection | `COLLECTION_MISSING`, ‏`COLLECTION_UNKNOWN` | |
| SKU | `SKU_MISSING`, ‏`SKU_NOT_SUPPLIER_SKU` | |
| barcode | `BARCODE_INVALID` (checksum של GTIN) | `BARCODE_MISSING` |
| variant options | `VARIANT_OPTIONS_INVALID` (שם חסר, ערכים ריקים או כפולים) | |
| price | `PRICE_INVALID`, ‏`PRICE_NOT_SELLABLE_PRICE` | |
| compare_at | `COMPARE_AT_WITHOUT_REAL_REFERENCE`, ‏`COMPARE_AT_NOT_ABOVE_PRICE` | |
| inventory | `INVENTORY_POLICY_NOT_DENY`, ‏`INVENTORY_NOT_TRACKED` | |
| shipping | `SHIPPING_UNKNOWN`, ‏`REQUIRES_SHIPPING_FALSE` | |
| SEO title / description | `SEO_TITLE_MISSING`, ‏`SEO_DESCRIPTION_MISSING` | מעל 70 / מעל 320 תווים |
| handle | `HANDLE_INVALID` (‏`[a-z0-9-]`), ‏`HANDLE_NOT_UNIQUE` | |

## compare_at
- **אסור** compare_at סינתטי, כמו המחיר כפול 1.2.
- מותר רק כשהוא זהה ל-compare_at שנצפה אצל הספק, עם מקור מתועד (`compareAtSource`), **וגם** גבוה ממחיר המכירה. בכל מקרה אחר: `null`.
- `auditListing` מזהה בנתוני production את `COMPARE_AT_SYNTHETIC_X1_2` ואת `VENDOR_IS_STORE_NAME_OR_EMPTY`.

## מצב production (קריאה בלבד, 2026-10-08) — לא שונה
- בכל 10 המועמדים `compareAtPrice` שווה בערך למחיר כפול 1.2.
- vendor = "SportPro" ברוב המוצרים.

הנתונים האלה ייכשלו ב-validator ולא יפורסמו כך.

## מוצר הפיילוט (לפי נתוני הספק)
vendor ו-brand = **VANS**, ‏type "נעליים", ‏barcode ‏700053288836 (checksum תקין), ‏4 תמונות. לספק אין compare_at, ולכן `compare_at = null`.
