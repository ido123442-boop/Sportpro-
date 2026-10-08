# SPORTPRO — Selection Agent

קוד: `src/agents/selectionAgent.js`. דירוג: `src/core/pilotScore.js`. כפילויות: `src/core/duplicates.js`. טסטים: `test/engines.test.js`.

## Pipeline
`DISCOVER → NORMALIZE → DEDUP → MATCH → LIVE_VERIFY → STOCK → SHIPPING → PRICE → PROFIT → RISK → SELLABLE`

| שלב | מימוש |
|---|---|
| DISCOVER / NORMALIZE | רשומות מ-`src/suppliers/adapters.js` |
| DEDUP | `findDuplicates`: ‏EXACT_DUPLICATE, ‏LIKELY_DUPLICATE או UNIQUE |
| MATCH | SKU מדויק (מנורמל) מול snapshot של Shopify לקריאה בלבד. אין listing → CANDIDATE |
| LIVE_VERIFY…PROFIT | `evaluateSellable` + `quote` (pricingEngine) |
| RISK | brand לא מאומת, מבצע אצל הספק, LIKELY_DUPLICATE |
| SELLABLE | `src/core/sellable.js` בלבד |

## סטטוסים (רק אלה)
| סטטוס | מתי |
|---|---|
| `CANDIDATE` | אין listing ב-Shopify, או שעוד לא בוצעה בדיקה חיה |
| `AUTO_READY` | אין סיבת חסימה ברמת המוצר. **ממתין לאישור אנושי.** ייתכן שעדיין SELLABLE=false בגלל סיבות מערכת (ספק לא מאומת, Kill Switch, target) |
| `REVIEW_REQUIRED` | רק סיבות סיכון, או confidence בין 0.75 ל-0.95 |
| `BLOCKED` | כל סיבה עובדתית אחרת (מלאי, משלוח, מחיר, רווח, markup, SKU, כפילות) |

## מה ה-Agent לא יכול לעשות
- אין לו handle ל-Shopify או ל-D1, ואין פונקציית publish או approve. הטסט בודק שה-module מייצא רק `AGENT_STATUSES`, ‏`STAGES`, ‏`runSelectionAgent` ו-`summarizeAgent`.
- הפלט frozen. ‏`APPROVED` ו-`PUBLISHED` לא קיימים כסטטוס.
- **רק אישור אנושי** (מחוץ ל-Agent) מקדם מוצר לפרסום, ותמיד דרך `authorizeAction`.

## דירוג פיילוט (`pilotScore`)
יציבות קודמת ל-margin. משקלות:

| קריטריון | משקל |
|---|---|
| מחיר יציב | 25 |
| ללא תלות במבצע | 20 |
| margin (עד 15%) | 15 |
| מותג מאומת | 10 |
| net (עד 50 ₪) | 10 |
| סיכון נמוך | 10 |
| מידות במלאי (עד 5) | 10 |

תנאי סף שחייבים להתקיים: מלאי AVAILABLE, משלוח ידוע, SKU מדויק. היסטוריית מחיר לא ידועה מקבלת חצי ניקוד, לא ניקוד מלא.

## הרצה על נתוני LIVE (‏849 וריאנטים של Foot Locker, נבדקו ב-2026-10-08 03:07 UTC)
- AUTO_READY ‏699 · REVIEW_REQUIRED ‏89 · BLOCKED ‏61 · ‏SELLABLE **0** (Kill Switch=ON, ואף ספק עוד לא אומת).
- BLOCKED: ‏MARKUP_ABOVE_MAX ‏55, ‏OUT_OF_STOCK ‏8.
- דגלי סיכון: SUPPLIER_PROMOTION ‏99, ‏LIKELY_DUPLICATE ‏98 (אותו כותרת ומידה בצבעים שונים).
- מקום 1: **U AUTHENTIC / 35 (VANS, VEE3BKA040), score 79.4.** זהה לבחירה הידנית הקודמת.
