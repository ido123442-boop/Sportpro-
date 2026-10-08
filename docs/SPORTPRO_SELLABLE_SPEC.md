# SPORTPRO — SELLABLE Spec

קוד: `src/core/sellable.js` (`evaluateSellable`). טסטים: `test/sellable.test.js` (40). שימוש: `actionGuard.authorizeAction`, ‏`agents/selectionAgent.js` ו-`tools/profit_simulator.mjs`.

## הגדרה
SELLABLE=true **רק אם כל התנאים מתקיימים**. אחרת SELLABLE=false, ומוחזרים **כל** קודי הסיבה, לא רק הראשון.

| תנאי | קוד כשנכשל | פירוט |
|---|---|---|
| supplier_verified | `SUPPLIER_UNKNOWN` | `supplier.verified === true` (קטלוג, משלוח ו-checkout מאומתים) |
| sku_exact | `SKU_MISMATCH` | `normSku(shopifySku) === normSku(supplierSku)`, ושניהם קיימים |
| variant_verified | `VARIANT_MISMATCH` | `variantVerified === true`, הוריאנט קיים חי, והמידות תואמות אחרי נרמול |
| live_price_available | `PRICE_MISSING` | מחיר גדול מ-0, ב-ILS |
| live_stock_available | `STOCK_UNKNOWN` / `OUT_OF_STOCK` | רק `AVAILABLE` עובר |
| נתונים טריים | `LIVE_DATA_STALE` | בדיקה חיה לפני פחות מ-24 שעות, ולא בעתיד |
| shipping_known | `SHIPPING_UNKNOWN` | VERIFIED או CONDITIONAL, עם cost ידוע ו-`conditionSatisfied !== false` |
| price_policy_valid | `PRICE_POLICY_INVALID` | policy עם רצפות ותקרה מספריות, ומחיר מכירה גדול מ-0 |
| profit_positive + מינימום | `PROFIT_BLOCKED` | net גדול מ-0 **וגם** לפחות 10 ₪. כשאי אפשר לחשב: חסום |
| margin_above_minimum | `MARGIN_BLOCKED` | לפחות 4% |
| markup ≤ 35% | `MARKUP_ABOVE_MAX` | ‏`(price−cost)/cost` |
| risk_pass | `RISK_BLOCKED` | `risk.pass === true` (חסר נחשב נכשל) |
| confidence | `LOW_CONFIDENCE` | לפחות **0.95** (`SELLABLE_POLICY.requiredConfidence`) |
| no duplicate | `DUPLICATE_MAPPING` | `duplicate === false` במפורש. ערך לא ידוע נחשב כפילות |
| no active block | `ACTIVE_BLOCK` | `blocks` ריק |
| target | `PRODUCTION_TARGET` | כש-`target` נמסר: `checkTarget` חייב לאשר |
| kill switch | `KILL_SWITCH_ON` | רק OFF מפורש. חסר או לא תקין נחשב ON |
| חריגה | `EVALUATION_ERROR` | כל exception מחזיר false |

## עקרונות
- **אין דרך לכפות true.** שדות כמו `sellable`, ‏`override` או `reasons` בקלט לא נקראים, והפלט frozen. ‏`authorizeAction` לוקח את Kill Switch ואת target מה-settings ומה-ctx, **לא** מתוך הקלט של המוצר (טסט: "kill switch smuggled").
- **אין frontend שמחליט.** ה-Worker לא מקבל SELLABLE מהלקוח. כל עוד השער לא מחובר לסכמת D1, כל הזמנה אמיתית נחסמת (`sellable_gate_required`).
- **מדרגות התמחור** (PENDING_APPROVAL) לא נכנסות לשאלה האם מחיר נתון כשר. נבדקות רק הרצפות והתקרה. המדרגות קובעות את המחיר **המומלץ** (ראו PRICING_SPEC).
- **`eligibility.classifyVariant`** הוא סיווג לדוחות בלבד, ואינו סמכות.
