// Pilot ranking. Stability first: the best pilot is a product we can keep selling, not the
// highest margin today. Ranking never changes SELLABLE (that is src/core/sellable.js only).
// Criteria in priority order (weight):
//  1 stable supplier price (25)   2 stock available (hard)   3 shipping known (hard)   4 exact SKU (hard)
//  5 verified brand (10)          6 margin (15, capped)      7 net profit (10, capped)
//  8 low risk (10)                9 no temporary promotion dependency (20)   10 variants available (10)
export const PILOT_WEIGHTS = Object.freeze({ stablePrice: 25, verifiedBrand: 10, margin: 15, net: 10, lowRisk: 10, noPromo: 20, variants: 10 });

/*
 c = { stock, shippingKnown, skuExact, priceChanges30d (number|null), supplierPrice, supplierCompareAt,
       brandVerified, marginPct, net, risk: LOW|MEDIUM|HIGH, sizesInStock, sizesTotal }
*/
export function pilotScore(c) {
  const hard = [];
  if (c.stock !== 'AVAILABLE') hard.push('STOCK_NOT_AVAILABLE');
  if (c.shippingKnown !== true) hard.push('SHIPPING_UNKNOWN');
  if (c.skuExact !== true) hard.push('SKU_NOT_EXACT');
  if (hard.length) return { eligible: false, score: 0, hard, parts: {} };
  const W = PILOT_WEIGHTS;
  const promo = Number(c.supplierCompareAt) > Number(c.supplierPrice);
  const parts = {
    // unknown price history counts as half-stable (not as stable)
    stablePrice: c.priceChanges30d == null ? W.stablePrice / 2 : c.priceChanges30d === 0 ? W.stablePrice : c.priceChanges30d === 1 ? W.stablePrice / 2 : 0,
    noPromo: promo ? 0 : W.noPromo,
    verifiedBrand: c.brandVerified === true ? W.verifiedBrand : 0,
    margin: Math.max(0, Math.min(Number(c.marginPct) || 0, 15)) / 15 * W.margin,
    net: Math.max(0, Math.min(Number(c.net) || 0, 50)) / 50 * W.net,
    lowRisk: c.risk === 'LOW' ? W.lowRisk : c.risk === 'MEDIUM' ? W.lowRisk / 2 : 0,
    variants: Math.min(Number(c.sizesInStock) || 0, 5) / 5 * W.variants,
  };
  const score = Math.round(Object.values(parts).reduce((a, b) => a + b, 0) * 100) / 100;
  return { eligible: true, score, hard: [], parts, promoDependent: promo };
}
