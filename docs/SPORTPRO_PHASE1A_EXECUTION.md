# SPORTPRO — Phase 1A Execution (Security + Pre-Pilot)

תאריך: 2026-10-07, ‏09:27–10:10 UTC. **אין כתיבה ל-Shopify, אין deploy (לא ל-production ולא ל-staging), אין שינוי ב-D1, אין רכישה, ו-Kill Switch לא שונה.**

## 1. Backup + verify
| בדיקה | תוצאה |
|---|---|
| ארכיון `sportpro_backup_2026-10-06T2245Z.tar.gz` | קיים. sha256 `2bbaf118…a9a13` זהה לזה שנמסר |
| שלמות | 224/224 קבצים, 0 אי-התאמות hash, 0 קבצים לא רשומים |
| ספירות שורות | 27/27 טבלאות: שורות שיוצאו = `COUNT(*)` = מספר שורות JSONL |
| secrets בגיבוי | 0 (cfut_, ‏shpat_, ‏shpss_, ‏shpca_, ‏private keys) |
| secrets בכל היסטוריית git | 0 |
| שינוי ב-Cloudflare מאז הגיבוי | אין: אותו deployment אחרון (2026-10-01 18:49), אותם secrets ואותו cron |

## 2. Cloudflare token
**נכשל.** ‏`DELETE /user/tokens/{id}` החזיר 403 "Unauthorized to access requested resource", כי לטוקן אין הרשאת API Tokens:Edit. הטוקן **עדיין פעיל**. לא נוצר טוקן חדש. הטוקן לא הודפס ולא נשמר, וקובץ הטוקן הישן נמחק (shred) כבר ב-Phase 1A הקודם. **הבעלים חייב לבטל אותו ידנית.**

## 3. Git
| בדיקה | תוצאה |
|---|---|
| הפיכה לפרטי | **נכשל.** אין כלי מורשה בסשן ששולט ב-visibility (GitHub MCP בלי repo settings, ‏`gh` חסום). הבעלים צריך לבצע ב-Settings → General → Danger Zone → Change visibility |
| secrets בהיסטוריה | 0 |
| קבצים שלא צריכים להיות ב-git | אין CSV, JSONL, dumps או גיבויים. נוספו: קוד ה-Worker (בלי secrets), סכמת D1 (DDL בלבד), טסטים |

## 4. Shopify credentials (קריאה בלבד, ערכים לא מוצגים)
| Credential | איפה | מי משתמש | מה יישבר אם יוחלף |
|---|---|---|---|
| SHOPIFY_CLIENT_ID / SHOPIFY_CLIENT_SECRET | secrets ב-prod וב-staging | `getAdminToken` (client_credentials), שמשמש רק את `GET /api/verify-shopify`. ‏mint-token (הוסר בקוד, עדיין פרוס) | ב-Worker: רק `/api/verify-shopify` ו-`mint-token` הפרוס. **שום תהליך עסקי.** מחוץ ל-Worker: כל סקריפט או סוכן שמחזיק את ה-secret (INFERRED: מי שהריץ את אירוע 1/10). אם זו אותה אפליקציה בשתי הסביבות, צריך לעדכן את שתיהן |
| ADMIN_TOKEN | secrets ב-prod וב-staging | `checkAuth` לכל `/api/*`. הדשבורדים `/verify`, ‏`/orders`, ‏`/admin` (localStorage בדפדפן). סקריפטים חיצוניים (audit_log מראה actors כמו kaelo-recovery-*) | הדשבורדים דורשים הזנה מחדש, וסקריפטים חיצוניים ננעלים. **זה גם משבית את mint-token הפרוס** |
| WEBHOOK_SECRET | prod + staging | אימות HMAC של webhooks מ-Shopify | webhooks נדחים עד שה-secret מעודכן גם ב-Shopify. כרגע לא נרשמו webhooks |
| SHOPIFY_ADMIN_TOKEN | staging בלבד | **אף אחד** (0 הפניות בקוד) | כלום |
| SHOPIFY_ADMIN_API_TOKEN (plain_text) | גרסאות prod v03–v04 (2026-08-11) | לא בשימוש בגרסה הנוכחית | ערך מפורמט `shpss_` חשוף בהיסטוריית הגרסאות. אם תקף, יש לבטל את ה-secret באפליקציה המתאימה |

## 5. Kill Switch — תיקון בקוד (`worker/src/index.js`, דרך `worker/patch_worker.py`)
- **פענוח חד-משמעי:** רק `{"active":false}`, ‏`{"active":0}` או `"OFF"` מאפשרים. ‏`ON` ו-`{"active":true|1}` חוסמים, וכך גם **כל ערך אחר**: חסר, malformed, ערך לא ברור או שגיאת קריאה (`INVALID`).
- **נבדק לפני:** approval #1, ‏approval #2, ‏checkout-draft, ‏purchase, וכל Shopify mutation (`shopifyGraphQL`). בנוסף mutations חסומות לגמרי, אלא אם `SHOPIFY_WRITES_ENABLED="true"` **וגם** Kill Switch במצב OFF. ב-webhook: הזמנה נכנסת לתור בלבד, אלא אם המצב OFF במפורש.
- **purchase דורש עכשיו שני אישורים קיימים** בטבלת approvals, בלי תלות בעמודת הסטטוס.
- `POST /api/kill-switch`: ‏`active` חייב להיות boolean. כיבוי דורש `confirm:"DISABLE_KILL_SWITCH"`. ה-UI הקיים יכול רק להדליק. הכתיבה היא upsert של JSON קנוני, ולכן עובדת גם על הערך הישן `'ON'`.
- `GET /api/kill-switch`: מחזיר `kill_switch_state` (ON / OFF / INVALID) ואת הסיבה.
- **לא נפרס.** הערך ב-D1 של staging נשאר `'ON'`, ובקוד המתוקן הוא נקרא נכון כ-ON.

## 6. mint-token + acknowledge_low_conf
- `/api/recovery/mint-token`: מחזיר **410 endpoint_removed** לכל method, בלי פנייה ל-Shopify OAuth. אימות (401) עדיין קודם לניתוב.
- `acknowledge_low_conf`: הוסר מה-UI. בשרת, confidence נמוך מ-0.90 נדחה תמיד (`confidence_below_0_90`), בלי עקיפה מהלקוח.

## 7. Tests — **143/143 עוברים** (היו 100)
- `test/worker.test.js` (19): מריץ את **קוד ה-Worker האמיתי** (המתוקן) מול SQLite עם סכמת D1 המקורית. אין גישת רשת; fetch מוחלף ונרשם. **הרצה מול הקוד המקורי: 15/19 נכשלים**, כלומר הטסטים באמת תופסים את הבאגים.
- `test/actionGuard.test.js` (23): שער מרכזי `authorizeAction`. מכסה: Kill Switch ON / malformed / missing, ‏settings חסרים, Kill Switch OFF בלי SELLABLE, ספק לא מאומת, live stock או live price חסרים, נתונים ישנים, משלוח לא ידוע, רווח או מרווח לא מספיקים, מיפוי לא מאושר, purchase בלי שני אישורים, ושה-parser של ה-core זהה לזה של ה-Worker.
- נוסף: חריגה מתקרת markup של 35% נחסמת (`MARKUP_ABOVE_MAX`, עם מחיר יעד להורדה), בהתאם למנוע הישן (PRICE_REVIEW). תוקנה לולאה אינסופית שהשינוי הזה חשף ב-`minProfitablePrice`.

## 8. Staging isolation
**STAGING עדיין מחובר ל-PRODUCTION — אין לבצע mutations.** (`SHOPIFY_SHOP_DOMAIN = xayj9j-q9.myshopify.com` בשני ה-Workers, נקרא ב-2026-10-07 09:29 UTC.) לא בוצעה שום כתיבה. נדרשת חנות Shopify Development Store נפרדת ואפליקציה נפרדת עבור staging.

## 9. SELLABLE
**0.** אף ספק לא אומת ל-checkout, ואין מיפוי מאושר. השער (`eligibility.js` + `actionGuard.js`) דורש: מיפוי מאושר, אימות חי, מחיר ומלאי חיים, התאמת וריאנט, משלוח מאומת, רווח ומרווח בתוך התקרה, risk, Kill Switch במצב OFF, ושני אישורים לרכש.

## 10. Footlocker pilot — הכנה בלבד
- **מאגר:** 171 מוצרים / 849 וריאנטים (AUTO_READY, ‏SKU_EXACT ייחודי, עלות 120–500 ₪).
- **אימות חי:** 2026-10-07 09:33–09:35 UTC. 846 AVAILABLE, ‏3 UNAVAILABLE, ‏0 נעלמו, 0 שינויי מחיר.
- **עוברים את השער הדטרמיניסטי:** 159 מוצרים. ‏**154 מהם במרווח 4–5% בלבד**, ו-12 נפסלו על חריגה מתקרת 35% (מבצעים אצל Footlocker).
- **הבחירה:** מרווח ≥8% קודם, ואז לפי רווח נטו, עם ≥2 מידות במלאי ודגמים שונים.
- **הרשימה עצמה:** בדוח בצ'אט. לא ב-git, כי ה-repository ציבורי.
