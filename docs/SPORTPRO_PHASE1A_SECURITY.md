# SPORTPRO — Phase 1A: Security Freeze & Backup (קריאה בלבד)

תאריך: 2026-10-06, ‏22:41–22:55 UTC. **לא בוצעה שום פעולה שמשנה production, ‏Shopify, ‏D1 או Cloudflare.** אין ב-git ערך של אף secret, ואין קובצי גיבוי.

## 1. Cloudflare token
| בדיקה | תוצאה | תווית |
|---|---|---|
| טוקן חדש בסביבה (`CLOUDFLARE_API_TOKEN`) | **לא קיים** | VERIFIED |
| הטוקן שהודבק בצ'אט | **עדיין פעיל**: ‏`/user/tokens/verify` מחזיר active. לא בוצע Roll | VERIFIED |
| הרשאות שנבדקו בפועל (GET) | Workers settings, schedules, deployments, versions, versions+modules, ‏D1 list, ‏D1 query (SELECT) — הכול עבר | VERIFIED |
| האם הטוקן READ ONLY | **לא ניתן לאמת**: ‏`/user/tokens/{id}` מחזיר Unauthorized. בדיקת write דורשת mutation, ולכן לא בוצעה | UNKNOWN |
| שמירה | קובץ הטוקן מהסבב הקודם נמחק (`shred`). מעכשיו הטוקן מועבר רק כמשתנה סביבה לפקודה בודדת. נסרק: לא קיים באף קובץ, בגיבוי או ב-git | VERIFIED |

## 2. Backup
`sportpro_backup_2026-10-06T2245Z.tar.gz`, ‏4.49MB, ‏sha256 `2bbaf1180cf96c97b0539064deb802d79ca01a98288fdd67659da146662a9a13`. נשלח לבעלים; **לא נמצא ב-git**.

| רכיב | תוכן |
|---|---|
| production Worker | settings, ‏bindings (שמות בלבד), ‏schedules, ‏deployments, ‏**15/15 גרסאות עם הקוד האמיתי של כל גרסה** |
| staging Worker | כנ"ל, ‏**46/46 גרסאות** |
| D1 `sportpro-orders` (production) | ‏schema + טבלה 1 |
| D1 `sportpro-orders-staging` | ‏schema + 26 טבלאות, כל השורות, ‏`d1_migrations` (0 שורות) |
| row counts | 27 טבלאות. מספר השורות שיוצאו שווה ל-`COUNT(*)` בכל אחת |
| hashes | `_MANIFEST.json`: ‏sha256 לכל אחד מ-224 הקבצים (sha256 של המניפסט לפני הסרת הסוד: ‏`278ef19d…`) |
| redaction | ערך secret אחד שנמצא ב-plain_text הוחלף ב-prefix, אורך ו-hash (ראו §4) |

הערה טכנית: ‏`/workers/scripts/{name}/content/v2?version=` **מתעלם** מפרמטר הגרסה ומחזיר תמיד את הקוד הנוכחי. את הקוד ההיסטורי האמיתי מחזיר רק `/workers/workers/{name}/versions/{id}?include=modules`, וממנו נלקח הגיבוי.

## 3. Repository
| בדיקה | תוצאה |
|---|---|
| remote | `github.com/ido123442-boop/Sportpro-` |
| branch | `ccr-a4dc76e5-wrtk77` (מסונכרן עם origin); ‏`main` = commit התחלתי |
| visibility | **PUBLIC** |
| commit אחרון | `3750a3d` (2026-10-06 11:12 UTC) |
| working tree | נקי |
| secrets בכל ההיסטוריה (`git log --all -p`) | **לא נמצאו** (cfut_, ‏shpat_, ‏shpss_, ‏shpca_, ‏sk_live, ‏AKIA, ‏private keys, ‏ghp_, ‏Bearer) |
| קובצי נתונים ב-git | אין CSV, ‏JSONL, ‏SQL dumps או גיבויים. ‏`audit/summary.json` מכיל ספירות בלבד |
| מידע רגיש-למחצה ב-docs | כתובת המייל של חשבון Cloudflare ומזהי api_client_id של Shopify. אלה **לא** secrets, אבל ב-repo ציבורי עדיף להסיר אותם. הסרה מההיסטוריה מחייבת rewrite, ולכן ממתינה לאישור |

## 4. Secrets audit (ערכים לעולם לא מוצגים)
| Secret | איפה מוגדר | קיים | בשימוש בקוד הנוכחי | הערות |
|---|---|---|---|---|
| ADMIN_TOKEN | prod + staging (secret_text) | EXISTS ×2 | **USED**: ‏`checkAuth`, כל `/api/*` | נוסף ל-prod ב-2026-10-01 07:29:41. בלי זהות משתמש |
| SHOPIFY_CLIENT_ID | prod + staging | EXISTS ×2 | **USED**: ‏client_credentials | prod: 2026-10-01 07:29:44; staging: 2026-09-24 |
| SHOPIFY_CLIENT_SECRET | prod + staging | EXISTS ×2 | **USED** | prod: 2026-10-01 07:29:46, ונוסף עדכון secret ב-07:31:07 |
| WEBHOOK_SECRET | prod + staging | EXISTS ×2 | **USED**: ‏HMAC | prod מאז 2026-08-11 |
| SHOPIFY_ADMIN_TOKEN | staging בלבד | EXISTS | **UNUSED** (0 הפניות) | נוסף 2026-09-27 08:54 |
| **SHOPIFY_ADMIN_API_TOKEN** | prod גרסאות v03–v04 (2026-08-11), **plain_text** | בגרסאות היסטוריות | לא בגרסה הנוכחית | ⚠️ **ערך בפורמט `shpss_` (client secret של אפליקציית Shopify) נשמר כטקסט גלוי**, וקריא לכל בעל גישת קריאה ל-Workers. האם הוא עדיין תקף: UNKNOWN |
| Cloudflare API token | צ'אט (הודבק) | פעיל | — | **חשוף** |
| SportPro Manager credentials | Shopify Dev Dashboard (app `sportpro-manager`) | — | INFERRED: אלה ה-CLIENT_ID/SECRET של ה-Worker (client_credentials) | ראו §5 |
| supplier credentials | — | **אין** | — | כל ה-feeds ציבוריים, ואין secrets של ספקים |

## 5. Shopify write access (אין שינוי)
| כותב | handle | מפתח | מותקן כרגע | scopes | ניתן לבטל או לצמצם |
|---|---|---|---|---|---|
| Shopify Claude Connector App | shopify-claude-mcp-app | Shopify | **כן** (VERIFIED) | 59: ‏27 write + 32 read (VERIFIED) | הסרה ב-Admin → Apps, או ניתוק ה-connector ב-Claude. האם אפשר לבחור scopes בודדים: UNKNOWN |
| ספורט פרו | api-client-10820 | Sportpro | `installation: null` | UNKNOWN | כן, כאפליקציית Dev Dashboard של החנות: ‏uninstall או revoke |
| ספורט פרו סופי | api-client-11809 | Sportpro | `installation: null` | UNKNOWN | כנ"ל |
| SportPro Manager | sportpro-manager | Sportpro | `installation: null` | UNKNOWN | כנ"ל, וגם rotate ל-client secret |

- `installation: null` לאפליקציה אחרת יכול לנבוע מהסרה **או** ממגבלת נראות של ה-connector. **UNKNOWN עד בדיקה ב-Shopify Admin → Settings → Apps and sales channels.**
- **INFERRED:** הקוד מנפיק טוקן ב-client_credentials, ולכן ה-Worker כותב בזהות האפליקציה שה-CLIENT_ID שלה מוגדר בו. סביר ש-SportPro Manager. הכתיבות של SportPro Manager ב-2026-09-18 וב-09-23 קדמו לרגע שבו לאחד מה-Workers היו פרטי גישה ל-Shopify (staging קיבל אותם ב-09-24, ‏production ב-10-01). מכאן שאותם credentials שימשו גם **מחוץ ל-Worker**.

## 6. Cron
| בדיקה | תוצאה |
|---|---|
| קיים | כן, `*/5 * * * *` על **`sportpro-automation` (production)**. נוצר 2026-10-01 07:29:39, עודכן 18:49:47 |
| staging | אין cron |
| scheduled handler בגרסה הנוכחית | **אין** (handlers: ‏`fetch` בלבד; metadata וקוד) |
| scheduled handler בגרסה כלשהי | **אין באף אחת מ-61 הגרסאות** (prod 15, ‏staging 46). נבדק ב-metadata וב-regex על הקוד |
| כתיבה ל-Shopify בקוד | **אין באף גרסה** (productUpdate, ‏productSet, ‏productChangeStatus, ‏publishableUnpublish, ‏inventorySetQuantities, ‏productDelete) |

## 7. mint-token
- **נתיב:** `POST /api/recovery/mint-token`.
- **מי יכול לקרוא:** כל מי שמחזיק את `ADMIN_TOKEN`, בכל אחד מה-Workers (אותו קוד). הבדיקה היא השוואת מחרוזת בלבד. אין rate limit, אין IP allowlist ואין audit.
- **מה הוא עושה:** `POST https://{SHOPIFY_SHOP_DOMAIN}/admin/oauth/access_token` עם `grant_type=client_credentials`, ומחזיר את **access_token** בגוף התשובה.
- **מה הטוקן מאפשר:** **Shopify Admin API access token** עם כל ה-scopes של האפליקציה, כולל כתיבה אם הן מוגדרות. ה-scopes עצמם: UNKNOWN.
- **מתי נוסף:** **2026-10-01 18:48 UTC** (prod v14, ‏staging v45), כלומר **אחרי** אירוע ה-DRAFT של 07:35. **תיקון לדוח הקודם:** האירוע לא השתמש ב-mint-token.

## 8. Kill Switch
| בדיקה | תוצאה |
|---|---|
| ערך ב-D1 staging | `'ON'` (מחרוזת), 2026-09-27 09:13:33 |
| ערך ב-D1 production | **אין**: הטבלה `system_settings` לא קיימת |
| מה הקוד מצפה | JSON עם `active` (`{"active":1}`) |
| `GET /api/kill-switch` | `JSON.parse('ON')` נכשל ולכן מוחזר **`active=false`**. הדשבורד מציג "SYSTEM RUNNING" |
| `POST /api/kill-switch` | `json_set('ON', …)` נכשל ב-**malformed JSON** (שוחזר ב-SQLite). **אי אפשר להחליף מצב דרך ה-UI** |
| האם ON עוצר | **לא.** ‏`ingestOrder` בודק `settings.kill_switch?.active`, שהוא undefined, ולכן לא חוסם. ‏checkout-draft, ‏purchase, ‏approvals ו-verify/approve **לא בודקים Kill Switch בכלל** |
| האם OFF מאפשר | כן, אבל זה חסר משמעות: גם ON לא חוסם |
| מה כן חוסם היום | רכש דורש mapping במצב `MANUAL_VERIFIED` (יש 0), ספק ACTIVE, שני אישורים ידניים וראיות רכישה. ב-production אין טבלאות, ולכן webhook ייכשל |
| כתיבה ל-Shopify | ה-Kill Switch לא נוגע בה בכלל. הקוד ממילא לא כותב ל-Shopify |

## 9. מטריצת בידוד staging ↔ production
| ממד | production | staging | מבודד? |
|---|---|---|---|
| חנות Shopify | `xayj9j-q9.myshopify.com` | **אותה חנות** | ❌ |
| קוד | sha256 `64991b27…` | **זהה** | ❌ |
| D1 | `sportpro-orders` (טבלה 1) | `sportpro-orders-staging` (26 טבלאות) | ✅ נפרד (אבל prod לא מאותחל) |
| Durable Object | namespace נפרד | namespace נפרד | ✅ |
| שמות secrets | 4 | 4 + SHOPIFY_ADMIN_TOKEN | — |
| ערכי secrets (ADMIN_TOKEN, CLIENT_ID/SECRET, WEBHOOK_SECRET) | — | — | **UNKNOWN**: הערכים לא נחשפים ב-API |
| אפליקציית Shopify (identity) | client_credentials | client_credentials | **INFERRED: אותה אפליקציה** |
| cron | `*/5` (no-op) | אין | — |
| compatibility | 2024-09-23, ‏nodejs_compat | זהה | — |
| supplier credentials | אין | אין | — |
| deployer | אותו חשבון wrangler | אותו חשבון | — |
