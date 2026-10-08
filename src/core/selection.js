// Product Selection Agent + price policy (read-only, deterministic).
// The selection agent only RANKS. It never makes anything SELLABLE: SELLABLE comes only from
// eligibility.classifyVariant, and the rank is computed after (and independent of) that gate.
import { CURRENT_POLICY, charmUp, evaluateProfit, minProfitablePrice } from './pricing.js';

// Markup tiers found in legacy D1 pricing_rules. NOT confirmed by the owner -> any price derived
// from them is a proposal only (status PENDING_OWNER_CONFIRMATION), never a final price.
export const LEGACY_D1_TIERS = Object.freeze({
  status: 'PENDING_OWNER_CONFIRMATION',
  bands: Object.freeze([
    Object.freeze({ from: 0, to: 100, pct: 15 }),
    Object.freeze({ from: 100, to: 250, pct: 13 }),
    Object.freeze({ from: 250, to: 500, pct: 12 }),
    Object.freeze({ from: 500, to: Infinity, pct: 10 }),
  ]),
});

const r2 = (x) => Math.round(x * 100) / 100;

export function tierFor(cost, tiers = LEGACY_D1_TIERS) {
  if (!(cost > 0)) return null;
  return tiers.bands.find((b) => cost >= b.from && cost < b.to) ?? null;
}

// Price policy proposal for one variant.
// marketCeiling: only when reliable market data exists (otherwise null -> not used).
export function pricePolicy({ supplierCost, shippingCost, marketCeiling = null }, policy = CURRENT_POLICY, tiers = LEGACY_D1_TIERS) {
  const min = minProfitablePrice({ supplierCost, shippingCost }, policy);
  if (!min.feasible) return { status: 'PRICE_BLOCKED', reason: min.reason, price: null, minPrice: min.price, final: false };
  const tier = tierFor(supplierCost, tiers);
  const tierPrice = tier ? charmUp(supplierCost * (1 + tier.pct / 100)) : null;
  let price = Math.max(min.price, tierPrice ?? 0);
  const cap = r2(supplierCost * (1 + policy.maxMarkupPct / 100));
  if (price > cap) return { status: 'PRICE_BLOCKED', reason: 'EXCEEDS_MAX_MARKUP', price: null, minPrice: min.price, cap, final: false };
  if (marketCeiling != null) {
    if (!(marketCeiling > 0)) return { status: 'PRICE_BLOCKED', reason: 'MARKET_CEILING_INVALID', price: null, final: false };
    if (min.price > marketCeiling) return { status: 'PRICE_BLOCKED', reason: 'MIN_PRICE_ABOVE_MARKET', price: null, minPrice: min.price, marketCeiling, final: false };
    price = Math.min(price, marketCeiling);
  }
  const p = evaluateProfit({ sellingPrice: price, supplierCost, shippingCost }, policy);
  if (!p.pass) return { status: 'PRICE_BLOCKED', reason: p.reason, price: null, final: false };
  const pending = tiers.status !== 'CONFIRMED';
  return {
    status: pending ? 'PROPOSED_PENDING' : 'PROPOSED', price, minPrice: min.price, cap, tierPct: tier?.pct ?? null,
    net: p.net, marginPct: p.marginPct, markupPct: p.markupPct, final: !pending,
    reason: pending ? 'MARKUP_TIERS_PENDING_OWNER_CONFIRMATION' : null,
  };
}

const SUSPICIOUS_SKU = /^(?:[A-Za-z0-9][A-Za-z0-9._-]{4,39})$/;

/*
 c = {
   gateState,                       // classifyVariant(...).state
   stock, sizesInStock,             // live
   supplierPrice, supplierCompareAt, priceChangedSinceScan,
   supplierImages, shopifyMedia, brand, sku, skuDuplicate,
   mappingConfidence, matchMethod, shippingStatus,
   net, marginPct, markupPct,
 }
 Returns { excluded, score, risk: LOW|MEDIUM|HIGH, demotions:[...] }
*/
export function selectionScore(c) {
  const demotions = [];
  const excl = (why) => ({ excluded: true, score: -Infinity, risk: 'HIGH', demotions: [why] });
  // hard exclusions: anything the gate would reject on facts
  if (c.stock !== 'AVAILABLE') return excl(c.stock === 'UNAVAILABLE' ? 'STOCK_UNAVAILABLE' : 'STOCK_UNKNOWN');
  if (c.shippingStatus !== 'VERIFIED') return excl('SHIPPING_UNCLEAR');
  if (!(c.net >= CURRENT_POLICY.minProfit) || !(c.marginPct >= CURRENT_POLICY.minMarginPct)) return excl('PROFIT_BELOW_FLOOR');
  if (!(c.markupPct <= CURRENT_POLICY.maxMarkupPct)) return excl('MARKUP_ABOVE_MAX');
  if (c.skuDuplicate) return excl('DUPLICATE_SKU');
  if (!(c.mappingConfidence >= 0.9)) return excl('MAPPING_CONFIDENCE_BELOW_0_90');

  let score = 0, riskPts = 0;
  const demote = (why, pts, risk = 0) => { demotions.push(why); score -= pts; riskPts += risk; };

  // positives
  if (c.matchMethod === 'SKU_EXACT') score += 30;
  score += Math.min(c.marginPct, 20) * 3;      // margin, capped
  score += Math.min(c.net, 60) / 2;            // net profit, capped
  score += Math.min(c.sizesInStock ?? 0, 6) * 2;
  if ((c.supplierImages ?? 0) > 0) score += 5;

  // demotions
  const discount = c.supplierCompareAt > c.supplierPrice ? (1 - c.supplierPrice / c.supplierCompareAt) * 100 : 0;
  if (discount >= 30) demote(`EXTREME_SUPPLIER_DISCOUNT_${Math.round(discount)}%`, 40, 2);
  else if (discount > 0) demote(`SUPPLIER_PROMO_PRICE_${Math.round(discount)}%`, 20, 1);
  if (c.priceChangedSinceScan) demote('UNSTABLE_PRICE', 20, 1);
  if (!((c.supplierImages ?? 0) > 0) || !((c.shopifyMedia ?? 0) > 0)) demote('MISSING_IMAGES', 25, 1);
  if (!c.brand) demote('MISSING_BRAND', 10, 1);
  if (!c.sku || !SUSPICIOUS_SKU.test(c.sku)) demote('SUSPICIOUS_SKU', 30, 2);
  if (c.net < 20) demote('LOW_PROFIT', 15, 0);
  if (c.marginPct < 6) demote('THIN_MARGIN', 15, 1);
  if (c.markupPct > 30) demote('MARKUP_NEAR_MAX', 10, 1);
  if ((c.sizesInStock ?? 0) < 2) demote('SINGLE_SIZE_IN_STOCK', 10, 1);

  return { excluded: false, score: r2(score), risk: riskPts === 0 ? 'LOW' : riskPts <= 2 ? 'MEDIUM' : 'HIGH', demotions };
}
