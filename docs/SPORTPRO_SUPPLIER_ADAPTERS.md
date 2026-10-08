# SPORTPRO — Supplier Adapters

קוד: `src/suppliers/adapters.js`. רישום הספקים: `src/core/registry.js`. משלוח: `src/core/shipping.js`. מלאי: `src/core/stock.js`. ‏**GET בלבד.** ה-fetch מוזרק, כך שהנרמול נבדק offline (`test/engines.test.js`).

## רשומה אחידה
`supplier, product_id, variant_id, handle, title, sku, barcode, options, size, price, compare_at, currency, stock, shipping{status,cost,rule}, brand, product_type, images, url, last_checked, reliability{status, checkout_verified, risk, measured}`

מידע חסר הוא `'UNKNOWN'` (או null למספרים). **לעולם לא מנחשים.**

| ספק | פלטפורמה | discovery | live | barcode | brand | משלוח | בדיקה חיה 2026-10-08 |
|---|---|---|---|---|---|---|---|
| Foot Locker | Shopify | `/products.json` | `/products/{handle}.js` | מ-`.js` | vendor | VERIFIED (חינם מ-199, אחרת 14.90) | 200 |
| AroSport | Shopify | כנ"ל | כנ"ל | מ-`.js` | vendor | VERIFIED (29) | 200 |
| BashGal | Shopify | כנ"ל | כנ"ל | מ-`.js` | vendor | CONDITIONAL (35, דורש משקל) | 200 |
| Dugit | Shopify | כנ"ל | כנ"ל | מ-`.js` | vendor | VERIFIED (30, חינם מעל 250) | 200 |
| MegaSport | Shopify | כנ"ל | כנ"ל | מ-`.js` | vendor | CONDITIONAL (חינם מ-300 בביגוד והנעלה, לפי DIVISION). אחרת UNKNOWN | 200 |
| EnergyM | Shopify | כנ"ל | כנ"ל | מ-`.js` | vendor | CONDITIONAL (35, דורש משקל) | 200 |
| Arena Israel | Woo Store API | `/wp-json/wc/store/v1/products` | `/products/{variation_id}` | UNKNOWN | `brands[0]` או UNKNOWN | **UNKNOWN** | 200 |
| SportStock | Woo Store API | כנ"ל | כנ"ל | UNKNOWN | כנ"ל | **UNKNOWN** | 200 |

## כללים
- **Shopify:** `products.json` מחזיר מחיר כמחרוזת ב-₪, ו-`.js` מחזיר אגורות (מספר). ה-adapter מזהה לבד. ב-`products.json` אין barcode, ולכן UNKNOWN.
- **Woo:** מוצר variable (הורה) מתפרק לרשומה לכל וריאציה. מחיר, מלאי ו-SKU הם UNKNOWN עד בדיקת וריאציה (`needs_variation_check`), כי מחיר ההורה הוא טווח. מוצר simple או וריאציה מקבלים רשומה מלאה. `compare_at` נקבע לפי `regular_price` כשהוא גבוה מ-`price`, כלומר מחיר ייחוס אמיתי של הספק.
- **מלאי:** ‏Shopify: ‏`available` boolean. ‏Woo: AVAILABLE רק אם in_stock **וגם** purchasable **וגם** לא backorder.
- **reliability.measured = UNKNOWN** לכל הספקים: אין עדיין היסטוריית הזמנות. אף ספק לא `checkout_verified`.
- **תוקן היום:** שני באגים ב-Woo, שהתגלו בבדיקה החיה:
  - `variation: ""` בהורה.
  - שם התכונה "מידות למוצר".

  נוסף טסט.
