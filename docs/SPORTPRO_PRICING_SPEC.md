# SPORTPRO — Pricing Spec

קוד: `src/core/pricingEngine.js`, שמקבל את המדיניות מ-`config/pricing_policy.json`, ו-`src/core/pricing.js` (נוסחאות בסיס). כלי: `tools/profit_simulator.mjs`.

## מצב המדיניות
- `PRICING_POLICY_STATUS = "PENDING_APPROVAL"`.
- מדרגות (`proposed_bands`): ‏0–100 → 15%, ‏100–250 → 13%, ‏250–500 → 12%, ‏500 ומעלה → 10%. הגבול התחתון כלול, העליון לא.
- `max_markup_pct = 35` (נאכף). רווח מינימלי 10 ₪, ‏margin מינימלי 4%, עמלת תשלום 4.5% + 1 ₪, ‏charm `.90`.
- אישור: `approval.approved_by = null`. הפקודה הנדרשת היא `APPROVE PRICING POLICY`. **שום קוד לא משנה את הסטטוס.**

## נוסחאות
```
fees   = price × 4.5% + 1
net    = price − cost − shipping − fees
margin = net / price
markup = (price − cost) / cost
```

## `quote({cost, shipping, policy, marketPrice, sellingPrice})`
1. עלות או משלוח לא ידועים → `BLOCK` (`COST_UNKNOWN` / `SHIPPING_UNKNOWN`).
2. **minimum_price:** המחיר הנמוך ביותר (charm `.90`) שעומד ברווח 10 ₪ **וגם** במרווח 4%.
3. **cap** = cost × 1.35. אם המינימום גבוה מה-cap → `MIN_PRICE_EXCEEDS_MAX_MARKUP`.
4. **recommended_price** = max(minimum, charm(cost × (1+tier))). אם התוצאה מעל ה-cap, חוזרים למינימום.
5. **מחיר שוק** נלקח בחשבון רק כש-`reliable === true`. אם המינימום גבוה ממחיר השוק → `MIN_PRICE_ABOVE_MARKET`. אחרת min(rec, market).
6. החישוב רץ על `sellingPrice` אם נמסר, ואחרת על recommended. תוצאות אפשריות: ‏`NEGATIVE_PROFIT`, ‏`PROFIT_BELOW_MIN`, ‏`MARGIN_BELOW_MIN`, ‏`MARKUP_ABOVE_MAX`, או `PASS`.
7. `final = true` רק כשהמדיניות **וגם** המדרגות במצב APPROVED. כרגע תמיד false.

## סימולציה (`node tools/profit_simulator.mjs --simulate`, משלוח לפי Foot Locker)
| cost | shipping | minimum_price | recommended_price | net_profit | margin | markup | result |
|---:|---:|---:|---:|---:|---:|---:|---|
| 100 | 14.9 | 131.9 | 131.9 | 10.06 | 7.63% | 31.9% | PASS (pending) |
| 250 | 0 | 274.9 | 280.9 | 17.26 | 6.14% | 12.36% | PASS (pending) |
| 500 | 0 | 547.9 | 550.9 | 25.11 | 4.56% | 10.18% | PASS (pending) |
| 1000 | 0 | 1094.9 | 1100.9 | 50.36 | 4.57% | 10.09% | PASS (pending) |
| 2500 | 0 | 2733.9 | 2750.9 | 126.11 | 4.58% | 10.04% | PASS (pending) |
| 5000 | 0 | 5465.9 | 5500.9 | 252.36 | 4.59% | 10.02% | PASS (pending) |

**הערה לבעלים:** במדרגה 10% (עלות של 500 ומעלה) המרווח יוצא כ-4.6%, קרוב מאוד לרצפה של 4%. ב-100 ₪ עם משלוח 14.90 ה-markup מגיע ל-31.9%, קרוב לתקרה. כדאי לשקול את זה לפני אישור.
