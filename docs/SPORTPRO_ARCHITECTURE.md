# SPORTPRO — Architecture (as built)

המסמך משקף את הקוד ב-branch `ccr-a4dc76e5-wrtk77`, נכון ל-2026-10-08. מחליף את `SPORTPRO_ARCHITECTURE_V2.md` כמקור לגבי הקוד.

```
Suppliers (GET only)                     Owner (human)
  src/suppliers/adapters.js                 approvals, mapping approval, pricing approval
        │ normalized records                          │
        ▼                                             ▼
  src/agents/selectionAgent.js  ──►  CANDIDATE / AUTO_READY / REVIEW_REQUIRED / BLOCKED   (no writes)
        │ uses                                         │
        ├─ core/duplicates.js                          │
        ├─ core/pricingEngine.js ◄─ config/pricing_policy.json (PENDING_APPROVAL)
        ├─ core/sellable.js      ◄─ ONLY authority for SELLABLE
        └─ core/pilotScore.js                          │
                                                       ▼
  core/actionGuard.authorizeAction:  kill switch → core/targetGuard → sellable → approvals/evidence
                                                       │ mirrored in
                                                       ▼
  worker/src/index.js (Cloudflare Worker, legacy D1 schema)
     guardAction: kill switch → assertNonProductionTarget → preconditions → is_test gate; audit_log on every block
     shopifyGraphQL: any "mutation" → guardAction("shopify_mutation")
```

## רכיבים
| שכבה | קבצים | הערות |
|---|---|---|
| ספקים | `src/suppliers/adapters.js`, ‏`src/core/registry.js`, ‏`shipping.js`, ‏`stock.js` | 8 adapters, ‏GET בלבד |
| נרמול והתאמה | `normalize.js`, ‏`match.js`, ‏`duplicates.js` | |
| מחיר | `pricing.js` (נוסחאות), ‏`pricingEngine.js` (מדיניות מקובץ) | |
| שער | `sellable.js`, ‏`actionGuard.js`, ‏`targetGuard.js`, ‏`killSwitch.js` | `eligibility.js` = דיווח בלבד |
| איכות מוצר | `productData.js` | validator לפני פרסום |
| ניטור | `health.js`, ‏`tools/health_check.mjs` | GREEN / YELLOW / RED |
| Agent | `src/agents/selectionAgent.js`, ‏`pilotScore.js` | |
| כלים | `tools/profit_simulator.mjs`, ‏`duplicates_report.mjs`, ‏`pipeline_dashboard.mjs`, ‏`pilot_candidates.mjs`, ‏`staging_preflight.mjs` | פלט ל-`audit/` ול-`dashboard/` (gitignored) |
| Worker | `worker/patch_worker.py` → `worker/src/index.js`, ‏`worker/wrangler.staging.toml.example` | **לא נפרס** |
| Staging data | `staging/seed/0001_footlocker.sql`, ‏`staging/mappings/*.json`, ‏`config/suppliers/footlocker.json` | staging בלבד |
| Schema חדש | `migrations/0001_supplier_first.sql` | לא הוחל בשום מקום |

## משתני סביבה של ה-Worker (שמות בלבד)
| שם | סוג | הערה |
|---|---|---|
| `SPORTPRO_ENV` | var | staging. כל ערך אחר חוסם כתיבות |
| `SHOPIFY_SHOP_DOMAIN` | var | חייב להיות `*.myshopify.com` שאינו production |
| `SHOPIFY_WRITES_ENABLED` | var | ברירת מחדל `"false"` |
| `PRODUCTION_CLIENT_ID_SHA256` | var | hash, לא secret. חובה ב-staging |
| `ADMIN_TOKEN`, ‏`SHOPIFY_CLIENT_ID`, ‏`SHOPIFY_CLIENT_SECRET`, ‏`WEBHOOK_SECRET` | secrets | ערכים חדשים ל-staging, לעולם לא מועתקים מ-production |

## בדיקות
‏237 טסטים (`npm test`), כולם עוברים. ה-Worker נבדק כקוד אמיתי מול SQLite עם סכמת D1 המקורית, ו-fetch מוחלף ונרשם.
