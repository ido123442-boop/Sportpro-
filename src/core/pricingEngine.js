// Configurable pricing engine. Policy comes from config/pricing_policy.json (never hard-coded here).
// Tiers stay PENDING_APPROVAL until the owner approves: any recommended price is then final=false.
// Formula: fees = price*feePct + feeFixed ; net = price - cost - shipping - fees ;
//          margin = net/price ; markup = (price - cost)/cost.
import fs from 'node:fs';
import { charmUp } from './pricing.js';

const r2 = (x) => Math.round(x * 100) / 100;

export function policyFromConfig(cfg) {
  if (!cfg || typeof cfg !== 'object') throw new Error('pricing_policy_missing');
  const num = (v, name) => { const n = Number(v); if (!Number.isFinite(n)) throw new Error(`pricing_policy_invalid:${name}`); return n; };
  const bands = cfg.markup_tiers?.proposed_bands ?? cfg.markup_tiers?.found_in_legacy_d1?.bands ?? null;
  return Object.freeze({
    version: String(cfg.version ?? 'UNKNOWN'),
    status: String(cfg.PRICING_POLICY_STATUS ?? 'PENDING_APPROVAL'),
    feePct: num(cfg.payment_fee_pct, 'payment_fee_pct') / 100,
    feeFixed: num(cfg.payment_fee_fixed_ils, 'payment_fee_fixed_ils'),
    minProfit: num(cfg.min_net_profit_ils, 'min_net_profit_ils'),
    minMarginPct: num(cfg.min_net_margin_pct, 'min_net_margin_pct'),
    maxMarkupPct: num(cfg.max_markup_pct, 'max_markup_pct'),
    charm: cfg.charm_suffix === '.90' ? '.90' : null,
    tiers: Array.isArray(bands) ? Object.freeze(bands.map((b) => Object.freeze({ min: Number(b.min), max: b.max == null ? Infinity : Number(b.max), pct: Number(b.markup_target_pct) }))) : null,
    tiersStatus: String(cfg.markup_tiers?.status ?? 'UNKNOWN'),
  });
}

export function loadPolicy(path = new URL('../../config/pricing_policy.json', import.meta.url)) {
  return policyFromConfig(JSON.parse(fs.readFileSync(path, 'utf8')));
}

export function economics(price, cost, shipping, policy) {
  const fees = price * policy.feePct + policy.feeFixed;
  const net = price - cost - shipping - fees;
  return { fees: r2(fees), net: r2(net), margin: r2((net / price) * 100), markup: r2(((price - cost) / cost) * 100) };
}

const floorsOk = (price, cost, shipping, policy) => { const e = economics(price, cost, shipping, policy); return e.net >= policy.minProfit && e.margin >= policy.minMarginPct; };
const round = (p, policy) => (policy.charm === '.90' ? charmUp(p) : r2(Math.ceil(p * 100) / 100));

/*
 quote({ cost, shipping, policy, marketPrice: { amount, reliable } | null, sellingPrice? })
 -> { cost, shipping, minimum_price, recommended_price, selling_price, fees, net_profit, margin, markup,
      status: PASS|BLOCK, reason, final, policy_status }
 If sellingPrice is given, economics are for that price; otherwise for recommended_price.
*/
export function quote({ cost, shipping, policy, marketPrice = null, sellingPrice = null }) {
  const out = { cost: cost ?? null, shipping: shipping ?? null, minimum_price: null, recommended_price: null, selling_price: null, fees: null, net_profit: null, margin: null, markup: null, status: 'BLOCK', reason: null, final: false, policy_status: policy?.status ?? 'UNKNOWN' };
  const block = (reason) => ({ ...out, reason });
  if (!policy) return block('POLICY_MISSING');
  if (!(Number(cost) > 0)) return block('COST_UNKNOWN');
  if (shipping === null || shipping === undefined || !(Number(shipping) >= 0)) return block('SHIPPING_UNKNOWN');
  const c = Number(cost), s = Number(shipping);
  const keep = 1 - policy.feePct;
  let min = round(Math.max((c + s + policy.feeFixed + policy.minProfit) / keep, (c + s + policy.feeFixed) / (keep - policy.minMarginPct / 100)), policy);
  for (let i = 0; i < 1000 && !floorsOk(min, c, s, policy); i++) min = round(min + 1, policy);
  if (!floorsOk(min, c, s, policy)) return block('NO_PRICE_FOUND');
  const cap = r2(c * (1 + policy.maxMarkupPct / 100));
  out.minimum_price = min;
  if (min > cap) return { ...out, reason: 'MIN_PRICE_EXCEEDS_MAX_MARKUP', cap };
  const tier = policy.tiers?.find((b) => c >= b.min && c < b.max) ?? null;
  let rec = Math.max(min, tier ? round(c * (1 + tier.pct / 100), policy) : min);
  if (rec > cap) rec = min; // tier would break the cap: fall back to the floor price
  const reliableMarket = marketPrice && marketPrice.reliable === true && Number(marketPrice.amount) > 0;
  if (reliableMarket) {
    if (min > Number(marketPrice.amount)) return { ...out, reason: 'MIN_PRICE_ABOVE_MARKET', cap };
    rec = Math.min(rec, Number(marketPrice.amount));
  }
  out.recommended_price = rec;
  const price = sellingPrice != null ? Number(sellingPrice) : rec;
  if (!(price > 0)) return block('SELLING_PRICE_INVALID');
  const e = economics(price, c, s, policy);
  const res = { ...out, selling_price: price, fees: e.fees, net_profit: e.net, margin: e.margin, markup: e.markup, cap, tier_pct: tier?.pct ?? null };
  if (e.net < policy.minProfit) return { ...res, reason: e.net <= 0 ? 'NEGATIVE_PROFIT' : 'PROFIT_BELOW_MIN' };
  if (e.margin < policy.minMarginPct) return { ...res, reason: 'MARGIN_BELOW_MIN' };
  if (e.markup > policy.maxMarkupPct) return { ...res, reason: 'MARKUP_ABOVE_MAX' };
  return { ...res, status: 'PASS', reason: policy.status === 'APPROVED' ? null : 'POLICY_PENDING_APPROVAL', final: policy.status === 'APPROVED' && policy.tiersStatus === 'APPROVED' };
}

export const SIMULATION_COSTS = Object.freeze([100, 250, 500, 1000, 2500, 5000]);
export function simulate(policy, { costs = SIMULATION_COSTS, shippingFor = () => 0 } = {}) {
  return costs.map((cost) => quote({ cost, shipping: shippingFor(cost), policy }));
}
