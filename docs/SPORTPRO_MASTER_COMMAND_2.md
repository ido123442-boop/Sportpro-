# SPORTPRO — Master Command 2: blockers → readiness gate

תאריך: 2026-10-08. **אין כתיבה ל-Shopify production, אין deploy, אין שינוי ב-secrets ואין רכישה.** כל השינויים הם קוד, קונפיגורציה וטסטים ב-repo.

## Phase 1 — Repo security
**REPO VISIBILITY: PUBLIC** (`list_repos`, 2026-10-08).

**פעולה ידנית:** GitHub → `ido123442-boop/Sportpro-` → Settings → General → Danger Zone → Change repository visibility → Make private. לאחר מכן לאשר את השם.

| סריקה | היקף | תוצאה |
|---|---|---|
| Shopify / Cloudflare / GitHub / AWS / Slack / OpenAI / Google keys, private keys | כל ההיסטוריה (`git log -p --all`), 3 branches, ‏0 tags | **0** |
| אותו דפוס בכל commit (`git grep` על `rev-list --all`) | tracked files בכל הגרסאות | **0** |
| הצבות password/secret/token עם ערך מילולי | היסטוריה | **0** |
| קבצי נתונים (csv, jsonl, dumps, env, keys, archives) | tracked | אין. שני קבצי DDL בלבד, בלי שורות נתונים |
| נתוני לקוחות | tracked | אין. ‏`TEST_CUSTOMER` בקוד ה-Worker הוא לקוח בדיקה בדוי |
| מידע אישי של מפעיל | tracked | כתובת המייל של חשבון ה-wrangler מופיעה 3 פעמים ב-`docs/SPORTPRO_TAKEOVER_AUDIT.md`. זה לא secret, אבל זה PII ב-repo ציבורי. הפיכת ה-repo לפרטי פותרת את זה. הסרה מההיסטוריה תדרוש שכתוב היסטוריה, ולכן לא בוצעה |

## Phase 2 — Credential rotation plan (לא בוצע שום rotate)
| # | Credential | Purpose | Environment | Valid? | Rotation | Impact of rotation |
|---|---|---|---|---|---|---|
| 1 | Cloudflare API token שהודבק בצ'אט | גישת API לחשבון Cloudflare | חשבון | **פעיל** (בדיקה אחרונה 2026-10-07; ניסיון ביטול החזיר 403) | **חובה, מיידי:** למחוק ב-My Profile → API Tokens | אף קוד לא משתמש בו. אין השפעה |
| 2 | `SHOPIFY_CLIENT_ID` / `SHOPIFY_CLIENT_SECRET` | client_credentials grant ל-Admin API (`getAdminToken`) | prod + staging Workers (אותם ערכים, INFERRED) | UNKNOWN (לא נבדק כדי לא להנפיק טוקן) | **חובה:** rotate secret באפליקציה ב-Dev Dashboard, ואחרי זה עדכון ב-Worker הנכון בלבד | בקוד הפרוס: `/api/verify-shopify` ו-mint-token הישן מפסיקים לעבוד. **אין תהליך עסקי שתלוי בהם.** כל סקריפט חיצוני שמחזיק את ה-secret ננעל, וזו המטרה |
| 3 | `ADMIN_TOKEN` | Bearer לכל `/api/*` | prod + staging | בתוקף (INFERRED) | **חובה:** ערך חדש לכל סביבה, לא משותף | הדשבורדים (`/verify`, ‏`/orders`, ‏`/admin`) דורשים הזנה מחדש. סקריפטים חיצוניים (actors `kaelo-recovery-*`) ננעלים. **ב-prod זה גם סוגר את mint-token הפרוס** |
| 4 | `WEBHOOK_SECRET` | HMAC ל-webhooks מ-Shopify | prod + staging | UNKNOWN | מומלץ | webhooks נדחים עד העדכון. כרגע לא רשומים webhooks |
| 5 | `SHOPIFY_ADMIN_TOKEN` | **אין שימוש** (0 הפניות) | staging בלבד | UNKNOWN | **למחוק** את ה-secret | אין |
| 6 | `SHOPIFY_ADMIN_API_TOKEN` (plain_text, ‏`shpss_…`) | היסטורי | prod v03–v04 (2026-08-11) | UNKNOWN | אם זה ה-secret של אפליקציה פעילה, נדרש rotate באותה אפליקציה (#2) | ערך חשוף בהיסטוריית הגרסאות של Cloudflare |
| 7 | אפליקציה "ספורט פרו" (api-client-10820) | בוצעו בה 999 מחיקות ב-8/28 | Shopify | UNKNOWN (`installation:null`) | **להסיר (uninstall)** אם עדיין מותקנת | אין תלות ידועה |
| 8 | אפליקציה "ספורט פרו סופי" (api-client-11809) | לא ידוע | Shopify | UNKNOWN | **להסיר** אם עדיין מותקנת | אין תלות ידועה |
| 9 | אפליקציה "SportPro Manager" | ביצעה ACTIVE→DRAFT ל-4,783 מוצרים ב-10/1 | Shopify | UNKNOWN | **להסיר**, או rotate ל-client secret. כנראה אותה אפליקציה כמו #2 | אם זו #2: ראו שם |
| 10 | Claude Connector (341262598145) | הגישה של הסשן הזה (OAuth, ‏59 scopes, מתוכם 27 write) | Shopify production | **בתוקף** | לצמצם scopes או להסיר אחרי ה-takeover | Claude מאבד גישת קריאה ל-production |

**סדר ביצוע מומלץ** (כולו ידני, אצל הבעלים):
1. #1.
2. #7–#9: Shopify Admin → Settings → Apps and sales channels / Develop apps. להסיר כל אפליקציה שאינה בשימוש.
3. #2 ו-#3 ב-production, יחד עם deploy של הקוד המתוקן (Phase 4) או לפניו.
4. #5.
5. לסביבת staging החדשה מנפיקים credentials חדשים לגמרי. לא מעתיקים מ-production.

## Phase 3 — Staging isolation: **STOP**
אין Development Store. החנות היחידה המחוברת היא `www.sportpro.shop` (Basic plan, production). לא הופעל `switch-shop`, ושום Worker לא הועבר לחנות אחרת.

**הוראות ליצירה (ידני):**
1. **Development Store**
   - https://partners.shopify.com (או Shopify Dev Dashboard) → Stores → Add store → Create development store.
   - מטרה: "Create a store to test and build". שם לדוגמה: `sportpro-dev`. מדינה: ישראל, מטבע ILS.
   - אין לייבא לקוחות או הזמנות מ-production.
2. **Staging app**
   - Dev Dashboard → Apps → Create app (`sportpro-staging`).
   - scopes מינימליים: `read_products`, ‏`write_products`, ‏`read_inventory`, ‏`write_inventory`, ‏`read_orders`. בלי `write_orders` ובלי customers.
   - להתקין **רק** על `sportpro-dev`.
3. **Staging client ID/secret**
   - מה-app של שלב 2. בשום מקרה לא להשתמש ב-credentials של production.
4. **Staging admin access**
   - Admin של ה-dev store נשאר אצל הבעלים.
   - Claude יקבל גישה דרך connector נפרד ל-dev store, או דרך ה-Worker בלבד.
5. **Staging D1 חדש**
   - `wrangler d1 create sportpro-staging-iso`, ואז החלה של `worker/schema/legacy_staging_schema.sql` ושל `staging/seed/0001_footlocker.sql`.
   - **לא** להשתמש ב-D1 הישן fa32a45c, כי הוא מכיל נתוני חנות production.
6. **Staging Worker**
   - `worker/wrangler.staging.toml.example` → `wrangler.staging.toml`, עם שם חדש: `sportpro-automation-staging-iso`.
   - חובה ש-`node tools/staging_preflight.mjs` יעבור.
7. **Staging secrets**
   - `wrangler secret put` עבור ADMIN_TOKEN (חדש), ‏SHOPIFY_CLIENT_ID, ‏SHOPIFY_CLIENT_SECRET ו-WEBHOOK_SECRET מה-staging app.
8. את ה-Worker הישן `sportpro-automation-staging`, שמחובר ל-production, יש לכבות או למחוק.

## Phase 4 — Staging deployment prepared (לא נפרס)
- **Guard מרכזי** (`guardAction`): Kill Switch → `SPORTPRO_ENV === "staging"` → חנות שאינה production (`xayj9j-q9`, ‏`sportpro.shop`) → תנאי הפעולה → SELLABLE.
  - כל חסימה נרשמת ב-`audit_log` (`GUARD_BLOCKED`).
  - הזמנה אמיתית נחסמת תמיד.
  - כשאי אפשר לקרוא את ה-settings, התוצאה היא 423 ולא קריסה.
- **Template + preflight:** `worker/wrangler.staging.toml.example` ו-`tools/staging_preflight.mjs`.
  - ה-preflight חוסם: דומיין production, ‏D1 של production, ‏D1 הישן, שם ה-Worker של production, ‏cron, ‏writes=true כברירת מחדל ו-secrets בקובץ.
- **Build:** ‏`wrangler deploy --dry-run` עבר. ‏265.71 KiB, ‏bindings: DB, ‏PROCUREMENT_LOCK ו-vars של staging. **לא בוצע deploy.**
- **Tests: 175/175.** 15 התרחישים הנדרשים: `MC2-1` עד `MC2-15` ב-`test/worker.test.js`.

## Phase 5 — Foot Locker (staging בלבד)
- הגדרת ספק: `config/suppliers/footlocker.json`.
- seed ל-staging D1: `staging/seed/0001_footlocker.sql`.
  - status=`REVIEW_REQUIRED`, ‏`active=0`.
  - אין מיפוי ואין Shopify IDs.
  - נבדק מול הסכמה, והרצה חוזרת לא משנה דבר (idempotent).
- תבנית מיפוי ל-VEE3BKA040: `staging/mappings/footlocker_VEE3BKA040.json`. status=`CANDIDATE`, ‏approved=false. נוצרת אחרי שהמוצר קיים ב-dev store.

## Phase 6 — Pricing policy
`config/pricing_policy.json`:
- `PRICING_POLICY_STATUS = "PENDING_APPROVAL"`.
- מדרגות 15/13/12/10% עם גבולות 100/250/500.
- `max_markup_pct = 35`, נאכף (`MARKUP_ABOVE_MAX`).
- הקוד מחזיר `PROPOSED_PENDING` ו-`final=false`. אין שינוי שקט.
- פקודת האישור הנדרשת: `APPROVE PRICING POLICY`.

## Phase 8 — Brand / product data
- `src/core/productData.js`:
  - vendor = המותג שאומת אצל הספק. שם החנות לעולם לא נחשב מותג.
  - compare-at רק ממחיר ייחוס אמיתי ומתועד, אחרת null.
  - סוג המוצר עובר דרך מיפוי מפורש.
  - `auditListing` מזהה את שתי הבעיות ב-production.
- **מוצר הפיילוט** (נבדק חי ב-2026-10-08 13:25 UTC):
  - vendor ספק = **VANS**, barcode ‏700053288836, ‏type "נעליים", ‏4 תמונות.
  - לספק אין compare_at, ולכן ב-staging יהיה compare-at=null.
  - ב-production כרגע: vendor=SportPro ו-compareAt=448.67 (המחיר כפול 1.2). לא שונה.

## Phase 9 — Production readiness
| CHECK | STATUS | EVIDENCE |
|---|---|---|
| Repo private | **FAIL** | `list_repos`: visibility=public |
| Secrets rotated | **FAIL** | אף credential לא הוחלף. ה-Cloudflare token פעיל |
| Production isolated | **FAIL** | ה-Worker של staging מצביע על `xayj9j-q9.myshopify.com`. ה-Workers של prod מריצים קוד ישן (mint-token חי) |
| Staging Development Store | **FAIL** | לא קיימת. החנות המחוברת היחידה היא production |
| Staging app | **FAIL** | לא קיימת |
| Staging D1 | **FAIL** | לא נוצר. ה-seed והסכמה מוכנים ונבדקו |
| Staging Worker | **FAIL** | לא נפרס. ה-build dry-run וה-preflight עברו |
| Kill Switch | PASS (קוד) / **FAIL** (פרוס) | MC2-1..5, ‏MC2-11. הקוד הפרוס עדיין קורא `'ON'` כ-OFF |
| SELLABLE Gate | PASS (קוד) | MC2-6, ‏12–15, ‏actionGuard tests |
| Two approvals | PASS (קוד) | MC2-7, ‏MC2-10 |
| No bypass | PASS (קוד) / **FAIL** (פרוס) | guard יחיד עם audit. הקוד הפרוס עוקף |
| Supplier mapping | **FAIL** | 0 מיפויים מאושרים. התבנית במצב CANDIDATE |
| Supplier live price | PASS | 319.90 ₪, ‏2026-10-08 13:25 UTC |
| Supplier live stock | PASS | available=true (סיכום ריצה: 16/16 מידות) |
| Supplier shipping | PASS | `shipping_rates.json` לישראל: 0.00 ₪ |
| Supplier checkout | **PARTIAL** | הגענו לדף התשלום. לא בוצעה הזמנה אמיתית |
| Pricing policy | **FAIL** | PENDING_APPROVAL |
| Brand correctness | PASS (staging data) / **FAIL** (production) | VANS אומת אצל הספק. ב-production כתוב SportPro |
| Product creation | **FAIL** | לא נבדק. אין dev store |
| Order flow | PARTIAL | סימולציה מלאה ב-SQLite (MC2-10). לא נבדק בסביבה אמיתית |
| Rollback | **FAIL** | לא נבדק בחנות |
| Audit logging | PASS (קוד) | `GUARD_BLOCKED`, ‏`CHECKOUT_DRAFT_CREATED` ועוד (MC2-9, ‏MC2-10) |
| Backup | PASS | ‏224/224 קבצים, ‏sha `2bbaf118…`, אומת ב-2026-10-07 |

**NOT READY**
