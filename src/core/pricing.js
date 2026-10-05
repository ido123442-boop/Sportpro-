// Pricing engine (handoff §11), versioned.
// Landed = supplier_cost + supplier_shipping
// Payment fees = selling_price * (2.5% + 2%) + 1 ILS
// Net = selling_price - Landed - Payment ; Margin = Net / selling_price ; Markup = (selling - cost) / cost
export const PRICING_POLICIES = Object.freeze({
  'B-2026-10-04': Object.freeze({
    version: 'B-2026-10-04',
    feePct: 0.045, feeFixed: 1,
    minProfit: 10, minMarginPct: 4, maxMarkupPct: 35,
    // Policy B names markup tiers 15% / 13% / 12% / 10% by supplier-cost band, but the band
    // boundaries were never documented. UNKNOWN -> not used; only floors and the cap are enforced.
    markupTiers: null,
    charm: '.90',
    marketCeiling: null, // never invented; only when reliable market data exists
  }),
});
export const CURRENT_POLICY = PRICING_POLICIES['B-2026-10-04'];
export const PRICING_POLICY = CURRENT_POLICY; // backwards-compatible alias

const r2 = (x) => Math.round(x * 100) / 100;

export function evaluateProfit({ sellingPrice, supplierCost, shippingCost }, policy = CURRENT_POLICY) {
  if (!(sellingPrice > 0)) return { pass: false, reason: 'SELLING_PRICE_INVALID', policy: policy.version };
  if (!(supplierCost > 0)) return { pass: false, reason: 'SUPPLIER_COST_UNKNOWN', policy: policy.version };
  if (shippingCost === null || shippingCost === undefined || !(shippingCost >= 0)) return { pass: false, reason: 'SHIPPING_COST_UNKNOWN', policy: policy.version };
  const landed = supplierCost + shippingCost;
  const fees = sellingPrice * policy.feePct + policy.feeFixed;
  const net = sellingPrice - landed - fees;
  const marginPct = (net / sellingPrice) * 100;
  const markupPct = ((sellingPrice - supplierCost) / supplierCost) * 100;
  const out = { landed: r2(landed), fees: r2(fees), net: r2(net), marginPct: r2(marginPct), markupPct: r2(markupPct), policy: policy.version };
  if (net < policy.minProfit) return { pass: false, reason: 'PROFIT_BELOW_MIN', ...out };
  if (marginPct < policy.minMarginPct) return { pass: false, reason: 'MARGIN_BELOW_MIN', ...out };
  return { pass: true, reason: null, ...out, markupAboveMax: markupPct > policy.maxMarkupPct };
}

// Smallest price of the form N.90 that is >= p (e.g. 101.2 -> 101.90, 101.95 -> 102.90)
export function charmUp(p) {
  const n = Math.ceil(r2(p - 0.9));
  return r2(n + 0.9);
}

// Minimum price that satisfies min profit AND min margin, rounded up to charm.
// Returns { price, feasible, reason } where feasible=false if it would exceed the max markup cap.
export function minProfitablePrice({ supplierCost, shippingCost }, policy = CURRENT_POLICY) {
  if (!(supplierCost > 0)) return { price: null, feasible: false, reason: 'SUPPLIER_COST_UNKNOWN' };
  if (shippingCost === null || shippingCost === undefined || !(shippingCost >= 0)) return { price: null, feasible: false, reason: 'SHIPPING_COST_UNKNOWN' };
  const landed = supplierCost + shippingCost;
  const keep = 1 - policy.feePct;
  const byProfit = (landed + policy.feeFixed + policy.minProfit) / keep;
  const byMargin = (landed + policy.feeFixed) / (keep - policy.minMarginPct / 100);
  let price = charmUp(Math.max(byProfit, byMargin));
  // guard against float edge cases
  while (!evaluateProfit({ sellingPrice: price, supplierCost, shippingCost }, policy).pass) price = r2(price + 1);
  const cap = supplierCost * (1 + policy.maxMarkupPct / 100);
  if (price > cap) return { price, feasible: false, reason: 'EXCEEDS_MAX_MARKUP', cap: r2(cap) };
  return { price, feasible: true, reason: null, cap: r2(cap) };
}
