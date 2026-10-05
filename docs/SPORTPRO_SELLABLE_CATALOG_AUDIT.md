# SPORTPRO — SOURCE OF TRUTH + SELLABLE CATALOG AUDIT

**צילום מצב:** ‏Shopify ב-2026-10-04 23:25 UTC (ללא שינוי מאז 15:58 באותו יום). קטלוגי הספקים נסרקו ב-2026-10-04 23:27–23:28 UTC. האימות החי בוצע ב-2026-10-04 בין 23:35 ל-00:40 UTC. הסיווג הורץ ב-2026-10-05 04:51 UTC.
**אין שום כתיבה ל-Production.** לא שונו סטטוסים, מחירים או מלאי, לא אושרו מיפויים, לא בוצעו רכישות ולא נשלחו webhooks. גם ה-Kill Switch לא נבדק ולא שונה, כי אין אליו גישה.

תוויות: **VERIFIED** (נבדק ישירות) · **INFERRED** (נובע מראיות מאומתות) · **UNKNOWN** (אין ראיה) · **BLOCKED** (אין גישה).

---

## 1. Architecture
- היעד: Supplier → Supplier DB → Discovery → Match → Live Verification → Shipping → Pricing → Risk → SELLABLE GATE → Shopify. Shopify הוא פלט בלבד, ו-D1 הוא מקור האמת. פירוט מלא ב-`docs/SPORTPRO_ARCHITECTURE_V2.md`.
- **קיים ונבדק (VERIFIED, ‏99 טסטים עוברים):**
  - ‏`src/core/`: ‏match, ‏eligibility, ‏pricing, ‏shipping, ‏stock, ‏registry, ‏skuProposals, ‏syncPlanner, ‏orderGate, ‏approvalGuard.
  - ‏`migrations/0001_supplier_first.sql`: כל 14 הטבלאות A–N, וגם ‏`shopify_sync_queue` ו-‏`sku_proposals`. האילוצים נאכפים במסד ונבדקים בטסטים על SQLite.
- **לא נפרס (לפי הנחיה):** אין Worker חדש ולא בוצעה מיגרציה על D1.

## 2. Current production state
| רכיב | מצב | תווית |
|---|---|---|
| Worker production ‏`sportpro-automation` | חי, ‏`/health` מחזיר `ok` | VERIFIED (2026-10-01) |
| קוד המקור של ה-Worker | **לא נמצא באף repository נגיש** | VERIFIED absent |
| D1 production, ‏cron, ‏bindings, ‏secrets | — | BLOCKED (אין `CLOUDFLARE_API_TOKEN`) |
| Kill Switch | — | BLOCKED (אין admin token) |
| כותבים ל-Shopify | 4 אפליקציות API (ראו סעיף 20) | VERIFIED |
| הזמנות ב-Shopify | 0 בחלון הנראה | VERIFIED |
| שינויי מוצרים מאז 2026-10-01 10:22 UTC | אין | VERIFIED (export מלא, 0 הבדלים) |

## 3. Current staging state
‏`sportpro-automation-staging` חי. דפי ה-dashboard שלו זהים byte-for-byte לאלה של production (VERIFIED). מכאן INFERRED: אותו build, ו-Shopify אחד בלבד, כלומר **staging עלול לכתוב ל-Shopify של production**. ה-bindings וה-D1 של staging: ‏BLOCKED.

## 4. Shopify state (VERIFIED)
| מדד | ערך |
|---|---|
| מוצרים | 7,114 — ACTIVE 1,947 · DRAFT 5,147 · ARCHIVED 20 |
| וריאנטים | 20,665 (מתחת ל-ACTIVE: 11,045) |
| SKU קיים / חסר | 6,043 / 14,622 |
| ערכי SKU כפולים | 264, על 1,883 וריאנטים |
| ברקודים | 0 |
| מעקב מלאי כבוי | 9,906 וריאנטים |
| כמות > 0 | 6,028 (ערכים סינתטיים 1/2/10; אף ספק לא חושף כמויות) |
| **ניתנים לקנייה עכשיו** | **7,194 וריאנטים ב-1,489 מוצרים** |
| …מתוכם לא זמינים אצל הספק | **3,391** |
| …מתוכם מתומחרים בהפסד (משלוח ידוע) | **1,673**: חציון ‎−18.69 ₪, הגרוע ‎−376.88 ₪, ‏‎−34,265 ₪ אם כל אחד נמכר פעם אחת (אומדן) |
| פרסום בערוצים | ACTIVE: ‏Online Store 1,947, ‏POS 1,907 (גיבוי מלא לצורך rollback) |

## 5. D1 state
**BLOCKED.** הטענות ההיסטוריות (715 מיפויים, 8,435 מועמדים, 20,041 ‏variant_state, ‏4,707 תיקוני SKU) לא אומתו. הטענה על תיקוני ה-SKU **סותרת את Shopify**: יש בו 6,043 SKU, כמעט בדיוק המספר שלפני ה"תיקונים".

## 6. Supplier state (VERIFIED, סריקה 2026-10-04 23:28)
| ספק | מתועד | פלטפורמה | מוצרים | וריאנטים | זמינים | לא זמינים | UNKNOWN | עם SKU | משלוח | checkout |
|---|---|---|---:|---:|---:|---:|---:|---:|---|---|
| footlocker | לא | Shopify | 3,861 | 25,518 | 16,743 | 8,775 | 0 | 25,518 | VERIFIED: חינם מ-199 ₪, אחרת 14.90 ₪ | לא אומת |
| arosport | כן | Shopify | 4,819 | 34,318 | 6,500 | 27,818 | 0 | 34,298 | VERIFIED: ‏29 ₪ | לא אומת |
| megasport | כן | Shopify | 1,843 | 10,861 | 5,440 | 5,421 | 0 | 10,857 | CONDITIONAL: חינם ≥300 ₪ על APPAREL/footwear; כל השאר UNKNOWN | לא אומת |
| dugit | כן | Shopify | 2,977 | 9,899 | 4,680 | 5,219 | 0 | 8,775 | VERIFIED: ‏30 ₪, חינם מעל 250 ₪ | לא אומת |
| energym | כן | Shopify | 1,890 | 3,199 | 2,760 | 439 | 0 | 3,166 | CONDITIONAL: ‏35 ₪ עד 20 ק"ג | לא אומת |
| bashgal | כן | Shopify | 1,642 | 2,918 | 2,462 | 456 | 0 | 2,911 | CONDITIONAL: ‏35 ₪ עד 20 ק"ג | לא אומת |
| arena | כן | Woo | 255 | 1,345 | 891 | 0 | 454* | 923 | UNKNOWN | לא אומת |
| championshop | לא | Woo | 656 | 873 | 602 | 271 | 0 | 526 | UNKNOWN | לא אומת |
| sportstock | כן | Woo | 764 | 764 | 671 | 93 | 0 | 764 | UNKNOWN | לא אומת |
| bealion | לא | Woo | 205 | 551 | 551 | 0 | 0 | 2 | CONDITIONAL: חינם מעל 249 ₪ | לא אומת |
| kdhockey | כן | Wix | — | — | — | — | — | — | UNKNOWN | אין feed |
| decathlon | כן | — | — | — | — | — | — | — | UNKNOWN | אין feed |

\* ב-Arena הועשרו 920 מתוך 1,342 וריאציות ברמת הווריאציה; השאר UNKNOWN לפי fail-closed. השפעה זניחה: ב-Shopify יש רק 40 וריאנטים של Arena.
מטבע: כל 6 ספקי ה-Shopify מציגים `Shopify.currency={"active":"ILS","rate":"1.0"}` (VERIFIED). ב-WooCommerce המטבע מגיע מה-API ‏(`currency_code`).

## 7. Mapping state (מנוע חדש, דטרמיניסטי; אף מיפוי לא אושר)
| מחלקה | וריאנטים | שיטות |
|---|---:|---|
| AUTO_CANDIDATE (≥0.95) | 7,020 | SKU_EXACT 5,460 · BRAND_MODEL_SIZE_COLOR 1,560 |
| HIGH_CONFIDENCE (0.90–0.949) | 5,933 | BRAND_MODEL_SIZE 3,129 · TITLE_EXACT_OPTIONS 1,782 · TITLE_EXACT_SIZE_ONLY 1,022 |
| MANUAL_REVIEW (0.75–0.899) | 149 | FUZZY_TITLE |
| REJECT (<0.75) | 14 | FUZZY_TITLE |
| AMBIGUOUS / CONFLICT | 502 / 39 | — |
| ללא התאמה | 7,008 | ספק לא נתמך (1,962) + אין התאמה |

**תיקון לדוח הקודם:** מרבית ה-OPTION_NOT_OFFERED אצל AroSport (שדווחו קודם כ-7,287) נבעו מממד **רוחב** בנעליים: הספק מציג "40 / רוחב רגיל" ואנחנו "40". המנוע החדש מזהה מקרים כאלה כ-size-only, וממיין אותם ל-HIGH_CONFIDENCE שדורש אישור בעלים.
**כפילויות:** ‏827 וריאנטים (406 קבוצות) הם אותו פריט ספק שרשום פעמיים ב-Shopify כשני מוצרים נפרדים. לדוגמה: "מחבט פאדל Tretorn Supreme Strike II" ו-"מחבט פאדל - Tretorn Supreme Strike II".

## 8. Stock state
- המצב היחיד שנעשה בו שימוש הוא AVAILABLE / UNAVAILABLE / UNKNOWN. **אף ספק לא חושף כמות** (VERIFIED). ב-WooCommerce: ‏`is_in_stock=true` עם backorder או `is_purchasable=false` מסווג **UNKNOWN**, לא AVAILABLE.
- אימות חי: ‏2,729 ריצות ‏`SHOPIFY_PRODUCT_JS` (כולן: הווריאנט קיים, ה-URL תקין, AVAILABLE) ועוד 1,662 ריצות ‏`WOO_STORE_API_VARIATION` ‏(1,529 AVAILABLE, ‏101 UNAVAILABLE, ‏32 UNKNOWN).
- 6,137 וריאנטים במצב STOCK_UNAVAILABLE. מתוכם, 3,373 ניתנים לקנייה עכשיו ב-Shopify.

## 9. Shipping state
975 וריאנטים במצב SHIPPING_BLOCKED:
- MegaSport, מתחת ל-300 ₪ או קטגוריה שאינה ביגוד/הנעלה: 820.
- BashGal ו-EnergyM, מעל 20 ק"ג: 92.
- משקל לא ידוע: 23.
- ספקי Woo בלי מדיניות משלוח: 40.

**באג שנמצא ותוקן במהלך הבדיקה:** הקוד השתמש בסוג המוצר **של Shopify** כשלספק לא היה סוג מוצר. כך קיבל מכשיר "קרוס אובר GDCC-200" (עלות 10,699 ₪, ומסווג אצלנו "ביגוד") משלוח חינם. התיקון: רק ראיית ספק (`DIVISION:` של MegaSport) קובעת זכאות. נוסף טסט.

## 10. Pricing state
- מדיניות ‏`B-2026-10-04`: עמלות 4.5% + 1 ₪, רווח מינימלי 10 ₪, מרווח מינימלי 4%, תקרת markup ‏35%, מחירי charm ‏‎.90.
- **מדרגות ה-markup ‏15/13/12/10% לא מיושמות**, כי גבולות טווחי העלות שלהן מעולם לא תועדו (UNKNOWN).
- מצב רווח:
  - PROFIT_BLOCKED: ‏2,271 (‏2,082 רווח מתחת למינימום, 189 מרווח מתחת למינימום).
  - מתוכם 1,765 אפשר לתקן בתמחור מחדש בתוך תקרת 35%.
  - 506 **לא רווחיים מבנית**.
- הקבוצה B (מוכנים אחרי תיקון): חציון רווח נטו 30.81 ₪ לווריאנט. אבל אצל 2,046 מתוך 2,728 המרווח רק 4–6%, כמעט על הרצפה.

## 11. Risk state
| סיכון | כמות |
|---|---:|
| כפילות מיפוי לספק (אותו פריט פעמיים) | 827 |
| SKU כפול ב-Shopify | 214 (בקבוצה B) מתוך 1,883 בסך הכל |
| התנגשות SKU מול אפשרויות / כותרת | 39 / 3 |
| ספקים חסומים (אין feed) | Decathlon 959, ‏KDHockey ‏198 |
| ספקים שאינם ספקים (יבוא אישי, לא זוהה, sportpro, ללא תג) | 542 |

## 12. Current SELLABLE count
**0 וריאנטים.** לאף ספק אין checkout מאומת, ואין אישורי מיפוי קריאים מ-D1. זה המצב הנכון לפי fail-closed.

## 13. Current BLOCKED count
**20,665 וריאנטים**, כל אחד בדיוק בקבוצה אחת:

| קבוצה | כל הווריאנטים | מתחת ל-ACTIVE |
|---|---:|---:|
| A — VERIFIED SELLABLE | 0 | 0 |
| B — SELLABLE AFTER FIX | **2,728** (‏688 מוצרים) | 1,201 (‏372 מוצרים) |
| C — NEEDS MATCH | 5,737 | 2,641 |
| D — NEEDS STOCK | 6,137 | 4,995 |
| E — NEEDS SHIPPING | 975 | 784 |
| F — PROFIT BLOCKED | 2,271 | 1,039 |
| G — NO SUPPLIER | 1,962 | 72 |
| H — DATA QUALITY | 855 | 313 |
| I — UNKNOWN / STALE | 0 | 0 |

פירוט B: ‏AUTO_READY 1,818 (‏Footlocker 1,800) · ‏OWNER_APPROVAL 696 (‏AroSport 628) · ‏DATA_FIX 214 (‏MegaSport, ‏SKU כפול).
**1,575 מתוך 1,947 המוצרים הפעילים אינם כוללים אף וריאנט בקבוצה B.**

## 14. Exact reason for every major blocker
| וריאנטים | מצב : סיבה | מה ישחרר |
|---:|---|---|
| 6,137 | STOCK_BLOCKED : STOCK_UNAVAILABLE | חידוש מלאי אצל הספק (בדיקה יומית) |
| 3,147 | MAPPING_REQUIRED : OPTION_NOT_OFFERED_BY_SUPPLIER | הסרת מידות שהספק לא מציע, או טבלת מידות (EU↔UK) |
| 2,082 | PROFIT_BLOCKED : PROFIT_BELOW_MIN | תמחור מחדש (1,765 אפשריים), או ויתור על המוצר |
| 1,818 | AUTO_READY : AWAITING_MAPPING_RECORD | רישום מיפוי, ואחר כך פיילוט checkout |
| 1,157 | SUPPLIER_REQUIRED : SUPPLIER_BLOCKED (Decathlon / KDHockey) | ספק חלופי |
| 894 | MAPPING_REQUIRED : SHOPIFY_COLLAPSED_VARIANTS | בניית הווריאנטים מחדש לפי הספק |
| 827 | RISK_BLOCKED : DUPLICATE_SUPPLIER_MAPPING | השארת רישום אחד |
| 820 | SHIPPING_BLOCKED : MegaSport cost unpublished | אימות דמי המשלוח של MegaSport |
| 696 | OWNER_APPROVAL : MAPPING_NEEDS_OWNER_APPROVAL | אישור בעלים ב-/verify |
| 695 | MAPPING_REQUIRED : NO_PRODUCT_MATCH | גילוי מחדש |
| 492 | MAPPING_REQUIRED : AMBIGUOUS_PRODUCT | בחירה של הבעלים |
| 390 / 263 / 74 / 47 / 31 | SUPPLIER_REQUIRED : יבוא אישי / לא onboarded / ללא תג / לא זוהה / מותג פרטי | זיהוי ספק |
| 299 | MAPPING_REQUIRED : SUPPLIER_HAS_NO_VARIANTS | איחוד לווריאנט אחד |
| 214 | DATA_FIX : DUPLICATE_SKU | ‏SKU ייחודי מהספק |
| 189 | PROFIT_BLOCKED : MARGIN_BELOW_MIN | תמחור מחדש |
| 147 + 14 | MAPPING_REQUIRED : MANUAL_REVIEW / LOW_CONFIDENCE | בדיקה ידנית |

הרשימה המלאה, שורה לכל וריאנט עם סיבה ותיקון: ‏`audit/blocked.csv`, ‏`audit/variants_classified.csv`.

## 15. Top 500 fixes
‏`audit/top500_fixes.csv`. כל 500 הם במאמץ 1 (פעולה אחת של הבעלים), כולם עם ספק שמחזיק במלאי, ורווח צפוי מצטבר של **70,292 ₪** (סכום על פני הווריאנטים, אם כל אחד נמכר פעם אחת):
- APPROVE_MAPPING: ‏240 מוצרים (בעיקר נעלי On ו-Hoka מ-AroSport).
- REPRICE_TO: ‏226 מוצרים (העלאת מחיר אל המחיר הרווחי המינימלי, בתוך תקרת 35%).
- SET_UNIQUE_SKU: ‏34 מוצרים (MegaSport).

413 מהם ACTIVE ו-87 DRAFT. בסך הכל יש 3,410 מוצרים שאפשר לתקן: מאמץ 1: ‏1,208, מאמץ 2: ‏435, מאמץ 3 (בנייה מחדש של וריאנטים): ‏1,767.

## 16. Top 500 products to publish
- ‏`audit/top500_publish.csv`: ממוין לפי מוכנות, ואחר כך ביטחון ורווח.
- ‏`audit/top500_profit.csv`: ממוין לפי רווח.
- בסך הכל 688 מוצרים / 2,728 וריאנטים עברו את כל השערים הדטרמיניסטיים ואת האימות החי.
- **כל אחד מהם עדיין חסר שני דברים:** פיילוט checkout אצל הספק, ורישום או אישור של המיפוי. לכן אף אחד מהם **לא** מוכן לפרסום.
- הרכב רשימת 500 המובילים: ‏Footlocker 305, ‏AroSport 94, ‏Dugit 47, ‏MegaSport 40, ‏BashGal 13, ‏EnergyM 1. מתוכם 316 DRAFT ו-184 ACTIVE.

## 17. Multi-agent architecture
7 Agents (פירוט ב-ARCHITECTURE_V2 §9):
1. Supplier discovery
2. Product discovery: 5,928 הזדמנויות NEW_PRODUCT ו-159 הזדמנויות ALTERNATE_SUPPLIER כבר הופקו, ב-`audit/supplier_opportunities.csv`.
3. Matching
4. Live verification
5. Profit
6. Quality / risk
7. Catalog manager: הוא היחיד שמזין את תור הכתיבה, וגם זה רק אחרי אישור.

החלטות השער דטרמיניסטיות. ‏AI רק מציע.

## 18. Automation architecture
Cron יומי (רענון קטלוג → התאמה → אימות חי → משלוח → רווח → שער → diff), ‏sweep לנתונים ישנים כל 15 דקות, ‏TTL של 24 שעות לנתוני ספק ו-30 יום למדיניות משלוח. מעבר SELLABLE → TEMPORARILY_BLOCKED → SELLABLE רק אחרי אימות טרי. פירוט ב-ARCHITECTURE_V2 §10.

## 19. Order flow
Webhook (‏HMAC) → הזמנה ייחודית → PAID → מיפוי מאושר → מלאי חי AVAILABLE → מחיר חי (עד 5% מעל הצפוי, ILS) → משלוח ידוע → רווח → **PROCEED_TO_DRAFT** → אישור 1 → עגלת ספק → אישור 2 → checkout אנושי → ראיות רכישה → מעקב משלוח → fulfillment. כל כשל עוצר את התהליך. ‏Kill Switch במצב לא ידוע נחשב ON. מימוש: ‏`src/core/orderGate.js`, עם 15 טסטים למסלול ההזמנה.

## 20. Security
| ממצא | תווית |
|---|---|
| **ה-connector שבו משתמשים ה-sessions של Claude, "Shopify Claude Connector App" (client 341262598145), מחזיק הרשאות כתיבה רחבות:** ‏write_products, ‏write_inventory, ‏write_orders, ‏write_fulfillments, ‏write_checkouts, ‏write_themes ועוד. זו האפליקציה שיצרה 2,109 מוצרים ושינתה סטטוסים ביולי–אוגוסט. | VERIFIED |
| כותבים נוספים: "ספורט פרו" (client 409032753153; יצירה, פרסום, **מחיקת 999 מוצרים** ב-2026-08-28), "ספורט פרו סופי" (416810893313), "SportPro Manager" (423502872577; ‏4,783 שינויי ACTIVE→DRAFT ב-2026-10-01) | VERIFIED |
| מי מחזיק את הטוקן של SportPro Manager (‏Worker, ‏Base44 או script) | BLOCKED |
| ה-UI של `/verify` שולח `acknowledge_low_conf:true` בכל אישור | VERIFIED. התיקון: `approvalGuard.js` + אילוץ במסד (MANUAL_REVIEW/REJECT לא ניתנים לאישור) |
| ה-repository ‏**ציבורי** | VERIFIED. קובצי CSV ו-HTML מוחרגים מ-git |
| ‏`.env.example` עם שמות בלבד | נוסף |
| שום סוד לא הודפס או נשמר | VERIFIED |

## 21. Migration status from Base44
- **BASE44_DEPENDENCY: לא ניתן למדידה (BLOCKED).**
- אין גישה ל-Base44, ומקור הקוד של ה-Worker לא נמצא.
- דפי ה-Worker הציבוריים לא מפנים ל-Base44 (VERIFIED).
- מה ניתן להציל: ה-Worker הפרוס (הורדה דרך Cloudflare API ברגע שיהיה טוקן), ‏D1 (export), ודפי ה-UI.
- הקוד החדש ב-`src/core` ממשיך את הלוגיקה הקיימת ולא מחליף אותה בעיוורון: נוסחת התמחור, אישור דו-שלבי, Kill Switch, ראיות רכישה.

## 22. Remaining blockers
1. ‏`CLOUDFLARE_API_TOKEN` + ‏`CLOUDFLARE_ACCOUNT_ID` (קריאה בלבד), כדי לקרוא קוד, ‏D1, ‏cron, ‏bindings ו-Kill Switch.
2. מיקום קוד המקור (Base44, מחשב מקומי או repository אחר).
3. ה-repository ציבורי, וצריך להפוך אותו לפרטי. רק בעל ה-repository יכול לעשות את זה.
4. צמצום כותבי Shopify לכותב אחד. זה כולל הורדת הרשאות של ה-connector של Claude לקריאה בלבד.
5. ‏checkout של ספק לא אומת לאף ספק. נדרש פיילוט אמיתי ידני; המועמד הטוב ביותר הוא Footlocker.
6. גבולות מדרגות ה-markup של מדיניות B.
7. מדיניות משלוח: MegaSport מתחת לסף, ‏Arena, ‏SportStock, ‏Championshop.

## 23. Exact next commands
**חלק א' — בלי שום כתיבה (אבצע מיד כשתהיה גישה):**
```bash
wrangler whoami
curl -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" https://api.cloudflare.com/client/v4/accounts/$CLOUDFLARE_ACCOUNT_ID/workers/scripts/sportpro-automation/content        # source
curl -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" https://api.cloudflare.com/client/v4/accounts/$CLOUDFLARE_ACCOUNT_ID/workers/scripts/sportpro-automation/settings       # bindings
curl -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" https://api.cloudflare.com/client/v4/accounts/$CLOUDFLARE_ACCOUNT_ID/workers/scripts/sportpro-automation/schedules      # crons
wrangler d1 list && wrangler d1 export <db> --remote --output <private>/backup.sql
curl -H "Authorization: Bearer $SPORTPRO_PROD_ADMIN_TOKEN" https://sportpro-automation.sportkaraspro.workers.dev/api/kill-switch
node tools/scan_suppliers.mjs <dir>/suppliers && node tools/rebuild.mjs <dir> audit && node tools/live_verify.mjs audit/live_candidates.json <dir>/live.jsonl && node tools/rebuild.mjs <dir> audit <dir>/live.jsonl
```
**חלק ב' — ההחלטה הראשונה שדורשת את האישור שלך (Production write). הוכן כ-dry-run בלבד:**

| אפשרות | פעולה | כמות | סיבה | Rollback |
|---|---|---|---|---|
| **RISK_MINIMUM** (מומלץ) | שינוי מ-ACTIVE ל-DRAFT | **367 מוצרים** (‏AroSport 332, ‏Footlocker 24, ‏EnergyM 5, ‏BashGal 3, ‏MegaSport 3), שמכילים 1,164 וריאנטים שאפשר לקנות היום | כל וריאנט שאפשר לקנות במוצרים האלה לא זמין אצל הספק או מתומחר בהפסד: 141 לא זמינים בלבד, 34 בהפסד בלבד, 192 גם וגם | ‏`audit/rollback_RISK_MINIMUM.csv`: מחזיר את הסטטוס ACTIVE ואת הפרסום ב-Online Store ‏(304971710771, ‏367) וב-POS ‏(304971743539, ‏354) |
| STRICT | שינוי מ-ACTIVE ל-DRAFT | **כל 1,947** | אין אף מוצר SELLABLE | ‏`audit/rollback_STRICT.csv` |

הפרוטוקול לפני ביצוע: snapshot טרי, הרצה מחדש של התור, ‏`reconcileBeforeWrite` (דילוג על מה שכבר הוחל, סירוב במקרה של drift), ביצוע בקבוצות של 50 עם בדיקה אחרי כל קבוצה, ועצירה בשגיאה הראשונה. כל זה רק דרך כותב יחיד. הביצוע **לא** יתבצע דרך ה-connector של Claude, אלא אם תאשר את זה במפורש כחריג חד-פעמי.

## 24. No production writes unless explicitly approved
בריצה הזאת נעשו רק פעולות קריאה:
- 2 משימות ייצוא ב-Shopify: מוצרים ופרסומים. ניסיון אחד של ‏`bulkOperationCancel` לבטל ייצוא שכבר הסתיים נדחה. (בריצות הקודמות היו עוד ייצואי מוצרים ואירועים, כולם לקריאה בלבד.)
- בקשות GET לאתרי ספקים.

אף מוצר, מחיר, מלאי או סטטוס לא שונה.
