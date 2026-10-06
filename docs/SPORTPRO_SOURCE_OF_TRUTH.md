# SPORTPRO — Source of Truth

עודכן: 2026-10-06. מחליף את הגרסה מ-2026-10-04.

## 1. היררכיה (מחייבת)

| דרגה | מקור | סמכות על | איפה זה חי היום |
|---|---|---|---|
| 1 | **LIVE SUPPLIER DATA** | האם הווריאנט קיים, מחיר הספק, מטבע, זמינות (AVAILABLE/UNAVAILABLE/UNKNOWN) | GET חי: ‏`/products/<handle>.js` ב-Shopify, ‏`/wp-json/wc/store/v1/products/<variation_id>` ב-WooCommerce. ‏`tools/live_verify.mjs` → ‏`verification_runs` |
| 2 | **SUPPLIER REGISTRY** | מי הספק, איך סורקים, מדיניות משלוח וראיות, שיטת checkout ואם אומתה | ‏`src/core/registry.js` → טבלת `supplier_catalog` |
| 3 | **SUPPLIER PRODUCT / VARIANT RECORD** | SKU, ‏barcode, מידה, צבע, מותג ודגם של הספק (raw + normalized), היסטוריה | ‏`tools/scan_suppliers.mjs` → ‏`supplier_products`, ‏`supplier_variants`, ‏`supplier_prices`, ‏`supplier_stock` |
| 4 | **VERIFIED MAPPING** | איזה וריאנט Shopify שייך לאיזה וריאנט ספק | ‏`src/core/match.js` → ‏`product_matches` (ייחודי לכל צד) |
| 5 | **SELLABLE GATE** | האם מותר למכור | ‏`src/core/eligibility.js` → ‏`sellable_decisions` |
| 6 | **SHOPIFY LISTING** | מה מוצג ללקוח: כותרת, מחיר מכירה, סטטוס, פרסום | Shopify. **רק הכותב היחיד** מעדכן, לפי `shopify_sync_queue` מאושר |
| 7 | **SHOPIFY INVENTORY DISPLAY** | שליטה בכפתור "הוסף לסל" בלבד | Shopify inventory, **נגזר** מ-SELLABLE. לעולם לא קלט |

כלל: דרגה נמוכה לעולם לא גוברת על דרגה גבוהה. Shopify (דרגות 6–7) **אף פעם** אינו מקור לגבי מלאי ספק, מחיר ספק, זמינות, משלוח ספק, SKU ספק או וריאציות ספק. Shopify הוא שכבת המכירה בלבד.

## 2. עובדות אסורות מ-Shopify (נאכף בקוד)
- סוג המוצר ב-Shopify לא משמש לקביעת משלוח. MegaSport משתמש ב-`DIVISION:` של הספק (נבדק: ‏`test/core.test.js`).
- כמויות המלאי ב-Shopify לא משמשות לקביעת זמינות. אצל הספקים קיים רק tri-state, והסכמה לא מאפשרת שמירת כמות (‏`supplier_stock`).
- SKU של Shopify הוא **ראיה** להתאמה, לא אמת. ‏SKU שסותר את המידה מסווג CONFLICT.

## 3. מקורות שאינם אמת
- דוחות Base44 ודוחות היסטוריים: CONTEXT בלבד. כל מספר מהם שלא אומת מחדש מסומן UNKNOWN או BLOCKED ב-`docs/SPORTPRO_TAKEOVER_AUDIT.md`.
- D1 הישן: היסטוריה בלבד. יעבור reconciliation למערכת החדשה ולא "יתוקן" במקום (כרגע BLOCKED, אין גישה).

## 4. ראיות ושחזור
- ‏snapshot של Shopify מ-2026-10-06 10:54 UTC, ‏sha256 ‏`0441bed7c462345f…`. זהה ל-snapshot מ-2026-10-04 23:25.
- סריקת ספקים מ-2026-10-06 10:54 UTC.
- אימות חי מ-2026-10-06 10:56–11:01 UTC.
- שחזור: `node tools/scan_suppliers.mjs <dir>/suppliers` → ‏`node tools/rebuild.mjs <dir> audit` → ‏`node tools/live_verify.mjs audit/live_candidates.json <dir>/live.jsonl` → ‏`node tools/rebuild.mjs <dir> audit <dir>/live.jsonl`.
- קובצי CSV לא נשמרים ב-git כל עוד ה-repository ציבורי.
