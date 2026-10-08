# SPORTPRO — Pilot Plan

## מועמד ראשי
**U AUTHENTIC / 35, VANS, SKU VEE3BKA040, Foot Locker IL** (score 79.4, מקום 1 גם ב-Agent וגם בבחירה הידנית).

| עלות | משלוח | מחיר מכירה | עמלות | נטו | margin | markup |
|---:|---:|---:|---:|---:|---:|---:|
| 319.90 | 0 | 373.89 (נוכחי) / 358.90 (מומלץ, PENDING) | 17.83 | 36.16 | 9.67% | 16.88% |

- **אימות חי:** 16/16 מידות במלאי, ללא מבצע אצל הספק, barcode תקין.
- **Checkout אצל הספק:** הגענו עד דף התשלום בלבד. משלוח לישראל 0 ₪, וסה"כ 319.90 ₪ כולל מע"מ.
- **מועמדי גיבוי:**
  - CLOUD PLAY 2 / 27.5 (ON): ‏79.32.
  - SAMBA OG MULE / 36 (ADIDAS): ‏71.8, מרווח דק.

## שלבים (לפי סדר, כל אחד דורש את הקודם)
| # | שלב | מי | מצב |
|---|---|---|---|
| 1 | Dev Store + staging app + credentials חדשים | בעלים | **BLOCKED** (לא קיים) |
| 2 | staging D1 חדש + schema + `staging/seed/0001_footlocker.sql` | Claude, אחרי אישור | מוכן |
| 3 | Worker ל-staging (`wrangler.staging.toml` + preflight + `PRODUCTION_CLIENT_ID_SHA256`) | Claude, אחרי אישור | מוכן, ‏dry-run עבר |
| 4 | יצירת מוצר ב-dev store לפי `validateListingForPublish` (vendor ‏VANS, ללא compare_at) | Claude | BLOCKED (1) |
| 5 | מיפוי CANDIDATE ב-staging, ואישור אנושי ב-/verify | בעלים | BLOCKED (4) |
| 6 | הזמנת בדיקה → approval #1 → checkout-draft → approval #2 → סימולציית רכישה (ללא תשלום) | Claude + בעלים | הסימולציה עברה ב-SQLite (MC2-10). בסביבה חיה BLOCKED |
| 7 | rollback של מוצר staging, בדיקת audit, אין וריאנטים יתומים | Claude | BLOCKED (4) |
| 8 | Kill Switch ON → ניסיון לכל כתיבה → כולן נחסמות | Claude | בקוד PASS, בחי BLOCKED |
| 9 | אישור מדיניות מחירים (`APPROVE PRICING POLICY`) | בעלים | PENDING |
| 10 | החלטה: הזמנת פיילוט אמיתית אחת מהספק (319.90 ₪) כדי לאמת אישור הזמנה ומעקב | בעלים | פתוח |
| 11 | שער מוכנות, ואז `APPROVE FIRST PRODUCTION PRODUCT` | בעלים | לא הגיע |
| 12 | הרחבה הדרגתית: 3 → 10 → 25 → 50, עם health checks (`tools/health_check.mjs`) | | עתידי |

## קריטריוני עצירה בפיילוט
- מחיר הספק משתנה ביותר מ-2%.
- המידה אוזלת.
- משלוח שונה מ-0.
- הזמנה לא מאושרת אצל הספק תוך 24 שעות.
- כל חסימה של guard שלא הייתה צפויה.

בכל אחד מהמקרים: Kill Switch ON, ורק אחר כך בדיקה.
