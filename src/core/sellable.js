// SELLABLE engine — the ONLY authority that can say a variant may be sold / acted on.
// SELLABLE = true only if every condition holds; otherwise false with ALL failing reason codes.
// Inputs are facts; any `sellable` / `override` field passed in is ignored. Nothing on a frontend can
// set SELLABLE: it is recomputed from facts every time (see actionGuard.authorizeAction).
// eligibility.classifyVariant remains a REPORTING classifier (catalog groups A–I) and authorizes nothing.
import { normSku, normSize } from './normalize.js';
import { CURRENT_POLICY, evaluateProfit } from './pricing.js';
import { parseKillSwitch } from './killSwitch.js';
import { checkTarget } from './targetGuard.js';

export const REASONS = Object.freeze({
  SUPPLIER_UNKNOWN: 'SUPPLIER_UNKNOWN',
  SKU_MISMATCH: 'SKU_MISMATCH',
  VARIANT_MISMATCH: 'VARIANT_MISMATCH',
  PRICE_MISSING: 'PRICE_MISSING',
  STOCK_UNKNOWN: 'STOCK_UNKNOWN',
  OUT_OF_STOCK: 'OUT_OF_STOCK',
  SHIPPING_UNKNOWN: 'SHIPPING_UNKNOWN',
  PROFIT_BLOCKED: 'PROFIT_BLOCKED',
  MARGIN_BLOCKED: 'MARGIN_BLOCKED',
  MARKUP_ABOVE_MAX: 'MARKUP_ABOVE_MAX',
  RISK_BLOCKED: 'RISK_BLOCKED',
  LOW_CONFIDENCE: 'LOW_CONFIDENCE',
  DUPLICATE_MAPPING: 'DUPLICATE_MAPPING',
  PRODUCTION_TARGET: 'PRODUCTION_TARGET',
  KILL_SWITCH_ON: 'KILL_SWITCH_ON',
  // additional fail-closed codes
  LIVE_DATA_STALE: 'LIVE_DATA_STALE',
  PRICE_POLICY_INVALID: 'PRICE_POLICY_INVALID',
  ACTIVE_BLOCK: 'ACTIVE_BLOCK',
  EVALUATION_ERROR: 'EVALUATION_ERROR',
});

export const SELLABLE_POLICY = Object.freeze({
  requiredConfidence: 0.95, // AUTO_CANDIDATE band; anything lower needs a human, never auto-SELLABLE
  maxLiveAgeHours: 24,
  currency: 'ILS',
});

const R = REASONS;
const hours = (a, b) => (new Date(b) - new Date(a)) / 36e5;

/*
 input = {
   now,
   killSwitch: raw stored value (required; missing => KILL_SWITCH_ON),
   target: { environment, shopDomain, shopId, clientIdSha256, productionFingerprints, productionApproved } | undefined,
   supplier: { code, verified },                       // verified = catalog + shipping + checkout path verified
   mapping:  { shopifySku, supplierSku, shopifySize, supplierSize, variantVerified, confidence, duplicate },
   live:     { price, currency, stock: AVAILABLE|UNAVAILABLE|UNKNOWN, checkedAt, variantExists },
   shipping: { status: VERIFIED|CONDITIONAL|UNKNOWN|EXCEPTION, cost, conditionSatisfied },
   pricing:  { sellingPrice, policy },                  // policy defaults to CURRENT_POLICY
   risk:     { pass, reasons },
   blocks:   [active block reasons],
 }
*/
export function evaluateSellable(input) {
  const reasons = new Set();
  let metrics = null;
  try {
    const { now = new Date().toISOString(), killSwitch, target, supplier = {}, mapping = {}, live = {}, shipping = {}, pricing = {}, risk = {}, blocks = [] } = input ?? {};

    if (parseKillSwitch(killSwitch).state !== 'OFF') reasons.add(R.KILL_SWITCH_ON);
    if (target !== undefined) { const t = checkTarget(target); if (!t.allowed) reasons.add(R.PRODUCTION_TARGET); }

    if (!supplier.code || supplier.verified !== true) reasons.add(R.SUPPLIER_UNKNOWN);

    const sSku = normSku(mapping.shopifySku), pSku = normSku(mapping.supplierSku);
    if (!sSku || !pSku || sSku !== pSku) reasons.add(R.SKU_MISMATCH);
    const sSize = normSize(mapping.shopifySize ?? ''), pSize = normSize(mapping.supplierSize ?? '');
    if (mapping.variantVerified !== true || live.variantExists === false || (sSize || pSize ? sSize !== pSize : false)) reasons.add(R.VARIANT_MISMATCH);
    if (!(Number(mapping.confidence) >= SELLABLE_POLICY.requiredConfidence)) reasons.add(R.LOW_CONFIDENCE);
    if (mapping.duplicate !== false) reasons.add(R.DUPLICATE_MAPPING); // unknown duplicate status is not "no duplicate"

    const cost = Number(live.price);
    const priceOk = live.price !== null && live.price !== undefined && cost > 0 && live.currency === SELLABLE_POLICY.currency;
    if (!priceOk) reasons.add(R.PRICE_MISSING);
    if (live.stock === 'UNAVAILABLE') reasons.add(R.OUT_OF_STOCK);
    else if (live.stock !== 'AVAILABLE') reasons.add(R.STOCK_UNKNOWN);
    if (!live.checkedAt || !(hours(live.checkedAt, now) <= SELLABLE_POLICY.maxLiveAgeHours) || hours(live.checkedAt, now) < -0.1) reasons.add(R.LIVE_DATA_STALE);

    const shipKnown = (shipping?.status === 'VERIFIED' || shipping?.status === 'CONDITIONAL') && shipping.cost !== null && shipping.cost !== undefined && Number(shipping.cost) >= 0 && shipping.conditionSatisfied !== false;
    if (!shipKnown) reasons.add(R.SHIPPING_UNKNOWN);

    const policy = pricing.policy ?? CURRENT_POLICY;
    const policyOk = policy && Number.isFinite(policy.minProfit) && Number.isFinite(policy.minMarginPct) && Number.isFinite(policy.maxMarkupPct) && Number(pricing.sellingPrice) > 0;
    if (!policyOk) reasons.add(R.PRICE_POLICY_INVALID);
    if (policyOk && priceOk && shipKnown) {
      const p = evaluateProfit({ sellingPrice: Number(pricing.sellingPrice), supplierCost: cost, shippingCost: Number(shipping.cost) }, { ...policy, maxMarkupPct: Infinity });
      metrics = { sellingPrice: Number(pricing.sellingPrice), cost, shipping: Number(shipping.cost), fees: p.fees, net: p.net, marginPct: p.marginPct, markupPct: p.markupPct, policy: policy.version ?? null };
      if (!(p.net > 0) || p.net < policy.minProfit) reasons.add(R.PROFIT_BLOCKED);
      if (p.marginPct < policy.minMarginPct) reasons.add(R.MARGIN_BLOCKED);
      if (p.markupPct > policy.maxMarkupPct) reasons.add(R.MARKUP_ABOVE_MAX);
    } else {
      reasons.add(R.PROFIT_BLOCKED); // profit cannot be proven
    }

    if (risk.pass !== true) reasons.add(R.RISK_BLOCKED);
    if (Array.isArray(blocks) && blocks.filter(Boolean).length) reasons.add(R.ACTIVE_BLOCK);
    else if (!Array.isArray(blocks)) reasons.add(R.ACTIVE_BLOCK);
  } catch (e) {
    reasons.add(R.EVALUATION_ERROR);
  }
  const list = [...reasons];
  return Object.freeze({ sellable: list.length === 0, reasons: Object.freeze(list), metrics: metrics ? Object.freeze(metrics) : null });
}
