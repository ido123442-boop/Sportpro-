// Profit evaluation per the documented Sportpro pricing formula (handoff §11).
// Landed = supplier_cost + supplier_shipping
// Payment fees = selling_price * (2.5% + 2%) + 1 ILS
// Net = selling_price - Landed - Payment ; Margin = Net / selling_price
export const PRICING_POLICY = Object.freeze({ feePct: 0.045, feeFixed: 1, minProfit: 10, minMarginPct: 4, maxMarkupPct: 35 });

const r2 = (x) => Math.round(x * 100) / 100;

export function evaluateProfit({ sellingPrice, supplierCost, shippingCost }, policy = PRICING_POLICY) {
  if (!(sellingPrice > 0)) return { pass: false, reason: 'SELLING_PRICE_INVALID' };
  if (!(supplierCost > 0)) return { pass: false, reason: 'SUPPLIER_COST_UNKNOWN' };
  if (shippingCost === null || shippingCost === undefined || !(shippingCost >= 0)) return { pass: false, reason: 'SHIPPING_COST_UNKNOWN' };
  const landed = supplierCost + shippingCost;
  const fees = sellingPrice * policy.feePct + policy.feeFixed;
  const net = sellingPrice - landed - fees;
  const marginPct = (net / sellingPrice) * 100;
  const markupPct = ((sellingPrice - supplierCost) / supplierCost) * 100;
  const out = { landed: r2(landed), fees: r2(fees), net: r2(net), marginPct: r2(marginPct), markupPct: r2(markupPct) };
  if (net < policy.minProfit) return { pass: false, reason: 'PROFIT_BELOW_MIN', ...out };
  if (marginPct < policy.minMarginPct) return { pass: false, reason: 'MARGIN_BELOW_MIN', ...out };
  return { pass: true, reason: null, ...out, markupAboveMax: markupPct > policy.maxMarkupPct };
}
