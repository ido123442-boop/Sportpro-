# SPORTPRO — Master Command run (Audit/Staging → first product)

תאריך: 2026-10-08, ‏03:00–03:20 UTC. **לא בוצעה שום כתיבה ל-Shopify, ל-Cloudflare או ל-D1.** אין deploy, אין רכישה ואין checkout אמיתי.
רשימת המועמדים עצמה נמצאת רק ב-`audit/pilot_candidates.csv` (ב-.gitignore), כי ה-repository ציבורי. כאן מופיעים נתונים מצטברים בלבד.

## Phase 1 — Security re-check
| בדיקה | מצב | ראיה |
|---|---|---|
| Cloudflare token ישן | **פעיל** (לא נעשה בו שימוש) | ביטול נכשל ב-403 ב-Phase 1A, ולא נעשה ניסיון נוסף. הבעלים צריך למחוק ידנית |
| Repo visibility | **PUBLIC** | `list_repos` ב-2026-10-08 |
| קוד מתוקן ב-git | כן | `worker/patch_worker.py` → `worker/src/index.js` |
| secrets ב-git (כל ההיסטוריה) | 0 | סריקת `git log -p --all` אחרי cfut_, ‏shpat_, ‏shpss_, ‏shpca_ ומפתחות פרטיים |
| mint-token | הוסר (410) | test `mint-token is gone` |
| acknowledge_low_conf | 0 מופעים | grep + test |
| Kill Switch fail-closed | כן | 19+2 טסטים ב-`test/worker.test.js` |
| guard מרכזי | **תוקן עכשיו** | ראו למטה |
| purchase דורש 2 אישורים | כן | `two_approvals_required` |
| **פרוס?** | **לא.** ה-Workers הפרוסים עדיין מריצים את הקוד הישן | — |

**פער שנמצא ותוקן (קוד בלבד):** הנתיבים הכספיים ב-Worker בדקו Kill Switch ואישורים, אבל לא עברו בשער SELLABLE. נוסף `guardAction(db, env, action, ctx)` אחד לכל הפעולות `approval_1`, ‏`approval_2`, ‏`checkout_draft`, ‏`purchase` ו-`shopify_mutation`. הסדר: Kill Switch, אחר כך תנאי הפעולה, ואז SELLABLE. מכיוון שהסכמה הישנה ב-D1 לא יודעת לחשב SELLABLE, **הזמנה אמיתית (`is_test != 1`) נחסמת תמיד** (`sellable_gate_required`, ‏423). רק הזמנות בדיקה יכולות להתקדם (staging E2E). פעולה לא מוכרת נחסמת.

## Phase 2 — Staging isolation
**BLOCKED.** החנות המחוברת היא `www.sportpro.shop` (Basic plan, production). לא נמצאה Development Store. לא הופעל `switch-shop`, כי הוא מבטל את הטוקן הנוכחי. שני ה-Workers עדיין מצביעים על `xayj9j-q9.myshopify.com`.

## Phases 3–5 — Discovery → Selection (חי, 2026-10-08 03:07 UTC)
- מאגר: 171 מוצרים / 849 וריאנטים של Foot Locker IL. כולם SKU_EXACT ייחודי, confidence 1.0.
- LIVE: ‏849/849 ענו HTTP 200. ‏841 AVAILABLE, ‏8 UNAVAILABLE, ‏0 נעלמו, 0 שינויי מחיר.
- שער SELLABLE: ‏788 AUTO_READY, ‏53 PROFIT_BLOCKED (markup מעל 35%), ‏8 STOCK_BLOCKED. ‏**SELLABLE = 0.**
- Selection Agent (`src/core/selection.js`): מדרג רק אחרי השער ולעולם לא משנה מצב.
  - **מסיר:** מלאי UNKNOWN או UNAVAILABLE, משלוח לא ודאי, confidence מתחת ל-0.90, SKU כפול, חריגה מהתקרה.
  - **מוריד בדירוג:** מבצע אצל הספק (compare_at), הנחה קיצונית (30% ומעלה), מחיר לא יציב, חוסר תמונות או מותג, SKU חשוד, רווח נמוך, מרווח דק, markup קרוב לתקרה, ומידה יחידה במלאי.
- **תיקון לדירוג של 10/7:** שני המועמדים המובילים הקודמים (NB) נמכרים אצל Foot Locker ב-40% הנחה. כשהמבצע יסתיים, העלות תעלה מעל מחיר המכירה שלנו. הם הורדו בדירוג.
- מדיניות מחיר: מדרגות D1 (15/13/12/10%) מחושבות כהצעה בלבד, במצב `PROPOSED_PENDING` ו-`final=false`.

## Phase 6 — Supplier checkout (מועמד #1)
עגלה → checkout → **נעצר לפני כל הזנת פרטים ותשלום.** ‏`cart/add` החזיר 200. הוריאנט נכון (מידה 35, SKU זהה), המחיר 319.90 ₪, ומדינת היעד ישראל. משלוח עד הבית חינם, וסה"כ 319.90 ₪ כולל מע"מ. בסוף העגלה רוקנה (`cart/clear` החזיר 200). לא נשלח טופס ולא נוצרה הזמנה.
**מסקנה:** נתיב ה-checkout של הספק זמין, עם מחיר, משלוח וסה"כ תואמים. זו **לא** ולידציה מלאה: רכישה בפועל, אישור הזמנה ומעקב משלוח עדיין לא נבדקו.

## ממצאי נתונים ב-Shopify (קריאה בלבד)
- `compareAtPrice` בכל 10 המועמדים הוא בערך המחיר כפול 1.2. זה מחיר "לפני הנחה" סינתטי, וסיכון של מחיר ייחוס מטעה.
- `vendor` = "SportPro" ברוב המוצרים במקום המותג האמיתי.

## Phase 7–9
לא בוצעו. Staging לא מבודד, ולכן אין E2E ואין production.
