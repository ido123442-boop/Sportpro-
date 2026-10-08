# SPORTPRO — Security Matrix

מצב: 2026-10-08. הקוד נבדק ב-`worker/src/index.js`, שנבנה מ-`worker/patch_worker.py`, וב-`src/core/`. **שום דבר לא נפרס.** ה-Workers הפרוסים עדיין מריצים את הקוד הישן (`worker/recovered/index.v15.js`).

## 1. סדר הבדיקות בכל פעולה כספית או כתיבה (Worker)
```
request → checkAuth (401) → D1 binding exists (503)
        → [route] killSwitchBlock (423, audited)
        → load supplier_order
        → guardAction(action):  kill switch OFF? → assertNonProductionTarget → action preconditions → is_test (SELLABLE gate placeholder)
        → route preconditions (status, two approvals, purchase evidence)
        → write
```
`guardAction` הוא השער היחיד. כל חסימה נרשמת ב-`audit_log` (`action='GUARD_BLOCKED'`, ‏`entity_type=<action>`). פעולה שלא מופיעה ברשימה נחסמת.

## 2. Matrix
| נתיב / ניסיון עקיפה | הגנה | תוצאה | טסט |
|---|---|---|---|
| Approval #1 / #2 מה-UI עם דגלים מזויפים (`sellable`, ‏`force`, ‏`skip_guard`, ‏`acknowledge_low_conf`) | guardAction; הדגלים לא נקראים | 423 `sellable_gate_required` + audit | `BYPASS frontend approval` |
| Purchase ישיר דרך API | Kill Switch, ‏guardAction, שני אישורים, הוכחת רכישה | 423 / 409 / 400 | MC2-4, ‏MC2-7, ‏`BYPASS direct API purchase` |
| Checkout-draft ישיר | Kill Switch, ‏guardAction, שלב 1 מאושר | 423 / 409 | MC2-3, ‏`BYPASS direct ... checkout-draft` |
| Shopify mutation ישירה (כולל `# comment\nmutation`, ‏`MUTATION`, ‏query+mutation) | המילה `mutation` בכל מקום בטקסט → guardAction(`shopify_mutation`) | throw, ‏0 קריאות רשת, audit | MC2-5, ‏`BYPASS direct Shopify mutation` |
| Settings חסרים (טבלה חסרה) | `readKillSwitch` → INVALID; ‏`getSettings` עטוף | 423 + audit | MC2-11, ‏`BYPASS missing settings` |
| Kill Switch ON | parser קשיח | 423 + audit | MC2-1..5 |
| Kill Switch malformed (`garbage`, ‏`{"active":"no"}`, ‏`''`) | רק `{"active":false}` / `0` / `"OFF"` מאפשרים | 423 + audit | `BYPASS Kill Switch ON / malformed` |
| כתובת חנות production (`https://www.sportpro.shop/`, אותיות גדולות, ‏`xayj9j-q9`) | assertNonProductionTarget (נרמול) | 423 `STAGING_TARGETS_PRODUCTION_SHOP` | `BYPASS production shop URL` |
| staging שמצביע ל-production | אותו דבר | 423 | MC2-8 |
| staging עם client id של production | השוואת sha256 מול `PRODUCTION_CLIENT_ID_SHA256` | 423 `STAGING_USES_PRODUCTION_CREDENTIALS` | `BYPASS ... production credentials` |
| רשימת fingerprints לא מוגדרת | fail closed | 423 `PRODUCTION_FINGERPRINTS_UNSET` | כנ"ל |
| PRODUCTION + חנות production | אין מדיניות כתיבה ל-production בקוד | 423 `PRODUCTION_WRITES_NOT_APPROVED` | parity matrix |
| PRODUCTION + חנות dev | | 423 `PRODUCTION_ENV_TARGETS_NON_PRODUCTION_SHOP` | parity matrix |
| D1 חסר (binding) | בדיקה אחרי auth | 503 `d1_unavailable_fail_closed`. ‏**audit לא אפשרי בלי D1** | `BYPASS missing D1` |
| ספק חסר | JOIN suppliers | 404, בלי שינוי מצב | `BYPASS missing supplier` |
| מחיר / מלאי / משלוח חסרים, markup מעל 35%, רווח שלילי, מיפוי כפול, confidence נמוך | `src/core/sellable.js`. ב-Worker הזמנה אמיתית נחסמת תמיד | SELLABLE=false | `test/sellable.test.js` (40), ‏MC2-6, ‏MC2-12..15 |
| `/api/test/*` (סימולטור) מחוץ ל-staging מבודד | assertNonProductionTarget | 423 + audit | `BYPASS simulator routes` |
| mint-token | הוסר | 410 | `mint-token is gone` |
| acknowledge_low_conf | הוסר מה-UI ומהשרת | 409 `confidence_below_0_90` | `discovery approve` |

## 3. סריקה סטטית (טסט `STATIC`)
- `INSERT INTO approvals`, ‏`INSERT INTO supplier_purchases`, ‏`SET status='CHECKOUT_READY'` ו-`SET status='PURCHASED'`: לכל אחד יש **מקום יחיד** בקוד, וכל אחד מגיע אחרי קריאה ל-`guardAction` של אותה פעולה.
- אין `scheduled` handler. ‏`W.scheduled === undefined`. **ה-cron היתום `*/5` עדיין מוגדר על ה-Worker של prod** (אין לו handler, ולכן הוא לא מריץ קוד). מחיקתו היא פעולה ידנית בצד Cloudflare.
- קריאות רשת יוצאות, 4 בסך הכול:
  - OAuth token (client_credentials)
  - Admin GraphQL: מקום יחיד, `shopifyGraphQL`
  - GET לספק Shopify (`.js`)
  - GET לספק Woo
- אין מסמכי GraphQL mutation מוטמעים בקוד.

## 4. ליבה (src/core)
| מודול | תפקיד |
|---|---|
| `sellable.js` | **הסמכות היחידה** ל-SELLABLE. 15 קודי סיבה חובה ועוד 4 של fail-closed. מתעלם מדגלים מזויפים |
| `actionGuard.js` | ‏authorizeAction: action → settings → Kill Switch → target → SELLABLE → תנאי הפעולה |
| `targetGuard.js` | ‏checkTarget / assertNonProductionTarget (מראה של ה-Worker. נבדק ב-parity test על 60 צירופים) |
| `killSwitch.js` | parser משותף. זהה ל-Worker (test) |
| `eligibility.js` | **דיווח בלבד** (קבוצות A–I). לא מאשר שום פעולה |

## 5. פתוח (דורש פעולה ידנית או deploy)
| # | פריט | מצב |
|---|---|---|
| 1 | Repo ציבורי | פתוח |
| 2 | Cloudflare token שהודבק | פעיל |
| 3 | Shopify client secret / ADMIN_TOKEN לא הוחלפו | פתוח |
| 4 | הקוד הפרוס ישן (mint-token חי, Kill Switch שבור) | פתוח, דורש deploy מאושר |
| 5 | cron יתום `*/5` על prod | פתוח |
| 6 | Audit כשאין D1 | לא אפשרי מטבעו. החסימה עדיין מתבצעת |
