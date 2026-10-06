# SPORTPRO — TAKEOVER AUDIT (Phase 0, READ ONLY)

ריצה: 2026-10-06 07:11–11:05 UTC. **שום כתיבה ל-Production.** לא שונו הרשאות, Kill Switch, מיפויים, סטטוסים, מחירים או מלאי, ולא הופעל cron.
פעולות שבוצעו: שאילתות קריאה ב-Shopify, משימת ייצוא אחת (`bulkOperationRunQuery`, שלא משנה נתונים), ובקשות GET לאתרי ספקים ול-Workers.

תוויות: **VERIFIED** · **INFERRED** · **UNKNOWN** · **BLOCKED**.

## A. אימות טענות היסטוריות (לכל מספר: מקור, זמן ושיטה)

| טענה | ערך היום | תווית | מקור | זמן (UTC) | שיטה |
|---|---|---|---|---|---|
| 7,114 מוצרים | **7,114** | VERIFIED | Shopify Admin | 07:11 | `productsCount(limit:null)` precision EXACT, וגם ייצוא מלא ב-10:54 |
| 1,947 ACTIVE | **1,947** | VERIFIED | Shopify | 07:11 | `productsCount(query:"status:active")` + ייצוא |
| 5,147 DRAFT | **5,147** | VERIFIED | Shopify | 07:11 | `status:draft` + ייצוא |
| 20 ARCHIVED | **20** | VERIFIED | Shopify | 07:11 | `status:archived` + ייצוא |
| 20,039 וריאנטים | **20,665** (ההיסטורי שגוי) | VERIFIED | Shopify | 07:11 / 10:54 | `productVariantsCount` + ייצוא |
| 4,707 תיקוני SKU הוחלו | **לא נכון**: יש 6,043 וריאנטים עם SKU ו-14,622 בלי | VERIFIED (סותר) | ייצוא Shopify | 10:54 | ספירת `sku` לא ריק |
| 0 ברקודים | **0** | VERIFIED | ייצוא | 10:54 | `barcode` |
| 9,906 בלי מעקב מלאי | **9,906** | VERIFIED | ייצוא | 10:54 | `inventoryItem.tracked=false` |
| 7,194 ניתנים לקנייה | **7,194** (ב-1,489 מוצרים) | VERIFIED | ייצוא | 10:54 | ACTIVE ∧ (tracked=false ∨ qty>0) |
| 3,391 לא זמינים אצל ספק | **3,389** | VERIFIED | סריקת ספקים + ייצוא | 10:54 | וריאנט מותאם, ספק `available=false` |
| 1,673 בהפסד | **1,800** | VERIFIED | אימות חי + ייצוא | 11:01 | `evaluateProfit` עם משלוח ידוע, net<0 |
| 0 SELLABLE | **0** | VERIFIED | `eligibility.js` | 11:01 | לאף ספק אין checkout מאומת, ואין אישור מיפוי קריא |
| 715 mappings | — | **BLOCKED** | D1 | — | אין `CLOUDFLARE_API_TOKEN` |
| 8,435 candidates | — | **BLOCKED** | D1 | — | כנ"ל |
| 20,041 variant_state | — | **BLOCKED** | D1 | — | כנ"ל |
| 827 מיפויים כפולים | **847** | VERIFIED | `rebuild.mjs` | 11:01 | אותו וריאנט ספק משויך ליותר מוריאנט Shopify אחד |
| שינויים ב-Shopify מאז 2026-10-04 | **0** | VERIFIED | השוואת ייצואים | 10:54 | sha256 זהה ‏`0441bed7c462345f…` |
| אירוע אחרון על מוצר | 2026-10-01 10:22:01 (SportPro Manager) | VERIFIED | `events` | 07:11 | `events(reverse:true)` |

## B. התשובות ל-20 השאלות

**1. מה קיים**
- **VERIFIED:**
  - repository אחד, `ido123442-boop/Sportpro-` (ציבורי), עם הענפים ‏`main`, ‏`ccr-a4dc76e5-wrtk77` (העבודה הזאת) ו-‏`ccr-e8d58ef1-yhjgjd` (בוט מסחר שלא קשור).
  - שני Workers.
  - חנות Shopify ‏`xayj9j-q9` (‏Basic, ‏ILS, מיקום אחד: "הצבר 15").
  - 10 feeds ציבוריים של ספקים.
  - הקוד החדש: `src/core` (‏100 טסטים), מיגרציית D1 שלא הוחלה, וכלי audit.
- **BLOCKED:** ‏D1, ‏cron, ‏secrets, ‏Base44.

**2. מה רץ**
- **VERIFIED:** ‏`sportpro-automation` ו-`sportpro-automation-staging` עונים ב-`/health` ‏`{"ok":true,"service":"sportpro-automation-v2"}`. הדפים ‏`/verify`, ‏`/orders`, ‏`/admin` זהים בשתי הסביבות (אותם sha256), ו-`/api/*` מחזיר 401 בלי token.
- **INFERRED:** אותו build בשתי הסביבות.
- **UNKNOWN:** האם יש תהליך רקע פעיל. אין אירועי Shopify מאז 2026-10-01.

**3. איפה הקוד**
- **VERIFIED absent:** הקוד לא נמצא באף repository שהחשבון חושף.
- **UNKNOWN:** האם הוא ב-Base44, במחשב מקומי או רק כ-bundle פרוס ב-Cloudflare.
- את ה-bundle הפרוס אפשר להוריד ב-`GET /accounts/{id}/workers/scripts/{name}/content` ברגע שיהיה token.
- **לא חיפשתי ב-GitHub הציבורי מחוץ ל-repository המורשה**, לפי הגבלות הסשן.

**4. מי יכול לכתוב ל-Shopify**
- **VERIFIED:** ארבע אפליקציות API כתבו בפועל:

| אפליקציה | api_client_id | מה כתבה | טווח זמן |
|---|---|---|---|
| Shopify Claude Connector App | 341262598145 | 2,109 יצירות מוצרים, 257 שינויי סטטוס | 2026-07-15 → 08-09 |
| ספורט פרו | 409032753153 | 5,005+ יצירות, 10,638+ פרסומים, **999 מחיקות** (08-28) | 2026-08-11 → 08-28 |
| ספורט פרו סופי | 416810893313 | דפים, קולקציות, 98 שינויי סטטוס | 2026-09-18 → 09-22 |
| SportPro Manager | 423502872577 | 4,857 שינויי סטטוס, 7,897 הסרות פרסום | 2026-09-18 → 10-01 |

- **ה-scopes של ה-connector של Claude (VERIFIED):** 59 בסך הכל, מתוכם 27 write ו-32 read (פירוט בסעיף D).
- **UNKNOWN / BLOCKED:** ה-scopes של שלוש האפליקציות האחרות (`appInstallations` → access denied), והאם עוד אפליקציות מותקנות.

**5. מי יכול לשנות D1:** ‏**BLOCKED.** ‏INFERRED: ה-Worker, דרך ה-binding שלו, וכל מי שמחזיק token של חשבון Cloudflare.

**6. Cron jobs:** ‏**BLOCKED** (Cloudflare `schedules`). הדפוס של 2026-10-01 07:35–07:43 (כ-600 בדקה, בקצב קבוע) מעיד על **לולאה מסקריפט**. אם זה cron, ‏Worker, ‏script חיצוני או Base44: ‏UNKNOWN.

**7. Webhooks**
- **VERIFIED:** ל-connector של Claude יש 0 webhooks. רשימת webhooks מוגבלת לאפליקציה ששואלת.
- ה-webhooks של SportPro Manager ושל שאר האפליקציות: **BLOCKED**, כי Shopify לא חושף webhooks של אפליקציה אחרת.

**8. אילו ספקים פעילים (catalog feed עובד)**
- **VERIFIED, ‏10 ספקים:** ‏MegaSport, ‏AroSport, ‏BashGal, ‏Dugit, ‏EnergyM, ‏Footlocker (Shopify), ‏Arena, ‏SportStock, ‏Bealion, ‏Championshop (WooCommerce).
- **בלי feed:** ‏KDHockey (Wix), ‏Decathlon.
- **אף ספק לא checkout-verified.**

**9. מוצרים אצל כל ספק** (‏VERIFIED, סריקה 2026-10-06 10:54 UTC)

| ספק | מוצרים | וריאנטים | AVAILABLE | UNAVAILABLE | UNKNOWN | וריאנטים ב-Shopify |
|---|---:|---:|---:|---:|---:|---:|
| footlocker | 3,924 | 25,910 | 17,115 | 8,795 | 0 | 3,912 |
| arosport | 4,828 | 34,404 | 6,579 | 27,825 | 0 | 9,244 |
| megasport | 1,860 | 10,884 | 5,449 | 5,435 | 0 | 2,249 |
| dugit | 2,977 | 9,848 | 4,626 | 5,222 | 0 | 651 |
| energym | 1,918 | 3,211 | 2,817 | 394 | 0 | 254 |
| bashgal | 1,663 | 2,925 | 2,521 | 404 | 0 | 2,010 |
| arena | 256 | 1,352 | 306 | 0 | 1,046* | 40 |
| championshop | 656 | 873 | 340 | 515 | 18* | 48 |
| sportstock | 764 | 764 | 672 | 92 | 0 | 49 |
| bealion | 207 | 552 | 240 | 0 | 312* | 242 |
| kdhockey / decathlon | — | — | — | — | — | 198 / 959 |

\* ההעשרה ברמת הווריאציה ב-WooCommerce הייתה חלקית בזמן הסיווג. השאר UNKNOWN לפי fail-closed.

**10. כמה mappings קיימים**
- ב-D1: **BLOCKED.**
- במערכת החדשה (הצעות בלבד, **אף אחת לא מאושרת**): ‏AUTO_CANDIDATE 6,996 · ‏HIGH_CONFIDENCE 5,935 · ‏MANUAL_REVIEW 151 · ‏REJECT 15 · ‏AMBIGUOUS 500 · ‏CONFLICT 39 · ללא התאמה 7,029.

**11. כמה SELLABLE:** **0** (‏VERIFIED, 11:01 UTC).

**12. כמה BLOCKED:** **20,665**, כל וריאנט בקבוצה אחת:

| קבוצה | כל הווריאנטים | מתחת ל-ACTIVE |
|---|---:|---:|
| B — מוכן אחרי תיקון | 2,544 (619 מוצרים) | 1,019 (304 מוצרים) |
| C — צריך התאמה | 5,759 | 2,649 |
| D — צריך מלאי | 6,099 | 4,988 |
| E — צריך משלוח | 1,002 | 815 |
| F — רווח חסום | 2,424 | 1,189 |
| G — אין ספק | 1,962 | 72 |
| H — איכות נתונים | 875 | 313 |

פירוט B: ‏AUTO_READY 1,812 (‏Footlocker 1,794) · ‏OWNER_APPROVAL 551 (‏AroSport 483) · ‏DATA_FIX 181 (‏MegaSport).

**13. מה מסוכן**
- **הכי דחוף:** ‏3,389 וריאנטים ניתנים לקנייה בזמן שהספק לא מחזיק אותם, ו-1,800 מתומחרים בהפסד (חציון ‎−17.93 ₪, הגרוע ‎−376.88 ₪).
- 4 אפליקציות כותבות. אחת מהן מחקה 999 מוצרים, ואחרת העבירה 4,783 מוצרים ל-DRAFT בלי רישום שנראה לעין.
- ה-connector של Claude מחזיק 27 scopes של כתיבה, כולל themes, ‏checkout, הזמנות ומוצרים.
- staging כנראה כותב לאותה חנות Shopify (‏INFERRED).
- ה-UI של `/verify` שולח `acknowledge_low_conf:true`.
- ה-repository ציבורי.
- הקוד לא נמצא ב-git.

**14. מה חסר**
- גישה ל-Cloudflare, ‏D1 ו-Base44, וקוד המקור.
- checkout מאומת לאף ספק.
- מדיניות משלוח עבור MegaSport מתחת לסף, ‏Arena, ‏SportStock ו-Championshop.
- גבולות מדרגות ה-markup (‏`config/pricing_policy.json`: ‏`UNKNOWN`).
- מזהה ספק מובנה ב-Shopify. היום יש רק תג טקסט, בלי URL, ‏ID או SKU של הספק.

**15. מה אני ממליץ למחוק** (רק אחרי backup ואישור)
- **בקוד:** אין מה למחוק.
- **בחנות:**
  - הרישום הכפול באחת מכל 406 קבוצות הכפילויות (847 וריאנטים).
  - מוצרים בלי ספק (יבוא אישי, "לא זוהה", ‏Decathlon ו-KDHockey בלי feed), כ-1,962 וריאנטים. העדפה להעביר ל-ARCHIVED ולא למחוק, כדי לשמר היסטוריה.
- **הרשאות:** כל scope של כתיבה שאינו של הכותב היחיד.
- **לא למחוק:** ‏D1 ודאטה של Base44.

**16. מה לשמר**
- ‏D1 הישן כ-history: מיפויים, אודיט והזמנות.
- ה-bundle הפרוס.
- הדפים `/verify`, ‏`/orders`, ‏`/admin` כבסיס ל-UI.
- אימות לפני routing.
- אישור דו-שלבי, Kill Switch ודרישת ראיות רכישה.
- נוסחת התמחור.
- התגים `ספק:` כראיה.
- קובצי ה-backup: מוצרים, אירועים ופרסומים.

**17. מה צריך לבנות מחדש**
- קטלוג ספקים כמקור אמת (טבלאות A–N).
- טבלת מיפויים חדשה עם ייחודיות לכל צד.
- שער SELLABLE כסמכות יחידה.
- כותב יחיד ל-Shopify עם תור מאושר.
- יצירת מוצרים מתוך הספק במקום יבוא המוני.
- Dashboard ב-Worker.
- הפרדה מלאה בין staging ל-production.

**18. Phase 1 — גישה והקפאה (רק קריאה וגיבוי)**
1. הבעלים מוסיף `CLOUDFLARE_API_TOKEN` (קריאה ל-Workers ול-D1) ו-`CLOUDFLARE_ACCOUNT_ID`.
2. הורדת ה-bundle של שני ה-Workers ושמירתו ב-git (repository פרטי), יחד עם settings, ‏bindings ו-schedules.
3. ‏`wrangler d1 export` של כל DB לאחסון פרטי, עם schema, ספירות שורות, בדיקות שלמות וכפילויות.
4. בדיקה אם ה-cron או ה-endpoint ב-Worker מחזיקים את ה-token של SportPro Manager.
5. הצגת תוכנית הרשאות לכל ארבע האפליקציות (כמו בסעיף D) ואז **המתנה לאישור**.
6. ‏reconciliation בין 715 המיפויים הישנים להצעות החדשות. התוצאות: מסכים / לא מסכים / קיים רק בישן / חדש.

**19. Phase 2 — מערכת חדשה ב-staging**
1. ‏D1 נפרד ל-staging, ‏`migrations/0001_supplier_first.sql`.
2. Agents A–M כ-modules (רובם קיימים כקוד טהור ב-`src/core`). ה-SELLABLE GATE מחליט; ה-Agents רק מציעים.
3. Cron ב-staging בלבד: סריקה מלאה כל 24 שעות, מלאי ומחיר כל 1–6 שעות, ובדיקה חוזרת לפני כל הזמנה.
4. Dashboard ב-`/admin/catalog`.
5. שאר ההחלטה על החנות הקיימת (RISK_MINIMUM: ‏375 מוצרים, או STRICT: ‏1,947) תיפתח רק אחרי snapshot, ‏dry-run, ‏diff, ‏rollback ואישור.

**20. Pilot (Footlocker)**
- **מקור הרשימה:** ‏`audit/pilot_candidates.csv`, ‏10 מוצרים. כולם עברו: התאמת SKU_EXACT, ‏SKU ייחודי, אימות חי AVAILABLE (‏2026-10-06 ~11:00), משלוח VERIFIED, רווח עובר את הסף, ועלות ספק בין 150 ל-450 ₪.
- **הרשימה:** ‏SHOX Z, ‏Dunk Low Retro Premium, ‏Pregame Fleece ×3, ‏FREE RIDE, ‏SWOOSH GO, ‏CAMPUS 00s LED LIGHTS, ‏COURT BOROUGH, ‏Essential טיץ.
- **אזהרה (INFERRED):** המרווח הגבוה אצל חלקם (עד כ-31%) נובע ממבצע אצל הספק. העלות ירדה לעומת המחיר שלנו, ולכן היא תנודתית.
- **תהליך:**
  1. בדיקה חוזרת של הזמינות.
  2. עגלה ידנית אצל Footlocker עד מסך התשלום, **בלי לשלם**.
  3. רישום ראיות: דמי משלוח בפועל ושדות הכתובת.
  4. **רכישה אמיתית אחת רק באישור מפורש שלך.**
  5. מעקב → ‏fulfillment → ‏`checkout_verified=true` עם ראיה.
- **חוסם נוסף:** אף אחד מה-10 לא יופעל לפני ש-checkout של Footlocker אומת.

## C. מיפוי למצבים שביקשת (§10)
| המצב בבקשה | במערכת |
|---|---|
| DISCOVERED | שורה ב-`supplier_catalog.csv` |
| MATCHED / HIGH_CONFIDENCE / NEEDS_REVIEW | `match_class`: ‏AUTO_CANDIDATE / ‏HIGH_CONFIDENCE / ‏MANUAL_REVIEW |
| VERIFIED | `live_verified=true` |
| PRICE_READY / STOCK_READY / SHIPPING_READY / PROFIT_READY | עברו את שערי 5–8 (‏DATA_FIX, ‏OWNER_APPROVAL, ‏AUTO_READY) |
| CHECKOUT_READY | ‏AUTO_READY: חסר ‏`CHECKOUT_UNVERIFIED` |
| SELLABLE | ‏SELLABLE |
| BLOCKED + קוד | NO_SUPPLIER = ‏SUPPLIER_REQUIRED · ‏NO_MAPPING / ‏AMBIGUOUS_MAPPING = ‏MAPPING_REQUIRED · ‏DUPLICATE_MAPPING = ‏RISK_BLOCKED:DUPLICATE_SUPPLIER_MAPPING · ‏STOCK_UNKNOWN / ‏STOCK_UNAVAILABLE · ‏SHIPPING_UNKNOWN · ‏PROFIT_BLOCKED:PROFIT_BELOW_MIN · ‏MARGIN_BLOCKED = ‏PROFIT_BLOCKED:MARGIN_BELOW_MIN · ‏CHECKOUT_UNVERIFIED · ‏STALE_DATA = ‏STALE · ‏DATA_ERROR = ‏INVALID / ‏UNKNOWN |

## D. ה-Connector של Claude ל-Shopify — scopes (אין שינוי אוטומטי)
- **קיים (59):** 27 write ו-32 read.
- **נדרש ל-audit בקריאה בלבד (9):** ‏`read_products`, ‏`read_inventory`, ‏`read_locations`, ‏`read_publications`, ‏`read_orders`, ‏`read_all_orders`, ‏`read_fulfillments`, ‏`read_shipping`, ‏`read_legal_policies`.
- **להסיר: כל 27 ה-write.** ‏write_checkout_branding_settings, ‏write_checkouts, ‏write_content, ‏write_customers, ‏write_discounts, ‏write_draft_orders, ‏write_files, ‏write_fulfillments, ‏write_inventory, ‏write_locales, ‏write_locations, ‏write_marketing_events, ‏write_markets, ‏write_merchant_managed_fulfillment_orders, ‏write_metaobject_definitions, ‏write_metaobjects, ‏write_online_store_navigation, ‏write_order_edits, ‏write_orders, ‏write_price_rules, ‏write_products, ‏write_publications, ‏write_returns, ‏write_shipping, ‏write_themes, ‏write_translations, ‏write_validations.
- **להסיר: 23 read שלא נדרשים**, כולל read_customers (מידע אישי של לקוחות).
- **UNKNOWN:** האם ה-connector (אפליקציה של Shopify) מאפשר בחירת scopes בודדים. אם לא: לנתק אותו ולהקים custom app לקריאה בלבד ל-audit.
- **הערה:** גם ייצוא bulk הוא קריאה בלבד מבחינת נתונים, ועובד עם read scopes.
