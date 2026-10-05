// Order-line gate: decides whether a paid Shopify order line may proceed to a supplier purchase DRAFT.
// It can only ever return PROCEED_TO_DRAFT (owner approval still required) or STOP.
// No step here purchases anything.
import { evaluateProfit } from './pricing.js';

export function evaluateOrderLine(ctx) {
  const stop = (reason) => ({ decision: 'STOP', reason });
  try {
    const { killSwitchActive, order = {}, line = {}, mapping, live, shipping, seenIdempotencyKeys, now, ttlHours = 1 } = ctx;
    if (killSwitchActive !== false) return stop('KILL_SWITCH_ACTIVE'); // unknown kill-switch state counts as ON
    if (!order.hmacVerified) return stop('WEBHOOK_HMAC_NOT_VERIFIED');
    const key = `${order.id}:${line.id}`;
    if (!order.id || !line.id) return stop('MISSING_IDS');
    if (seenIdempotencyKeys?.has(key)) return stop('DUPLICATE_ORDER_LINE');
    if (order.financialStatus !== 'PAID') return stop(order.financialStatus === 'PENDING' ? 'PAYMENT_PENDING' : 'PAYMENT_NOT_CAPTURED');
    if (!mapping || mapping.status !== 'MAPPING_APPROVED') return stop('NO_APPROVED_MAPPING');
    if (!live || !live.checkedAt || (new Date(now) - new Date(live.checkedAt)) / 36e5 > ttlHours) return stop('LIVE_CHECK_STALE');
    if (live.variantExists !== true) return stop('SUPPLIER_VARIANT_GONE');
    if (live.stock !== 'AVAILABLE') return stop(live.stock === 'UNAVAILABLE' ? 'STOCK_UNAVAILABLE' : 'STOCK_UNKNOWN');
    if (live.currency !== 'ILS') return stop('CURRENCY_NOT_VERIFIED');
    if (!(live.cost > 0)) return stop('PRICE_UNKNOWN');
    if (mapping.expectedCost && live.cost > mapping.expectedCost * 1.05) return stop('SUPPLIER_PRICE_INCREASED');
    if (!shipping || shipping.cost === null || shipping.cost === undefined) return stop('SHIPPING_UNKNOWN');
    const p = evaluateProfit({ sellingPrice: line.unitPrice, supplierCost: live.cost, shippingCost: shipping.cost });
    if (!p.pass) return stop(`PROFIT_BLOCKED:${p.reason}`);
    return { decision: 'PROCEED_TO_DRAFT', idempotencyKey: key, requires: ['OWNER_APPROVAL_1', 'SUPPLIER_CART', 'OWNER_APPROVAL_2', 'PURCHASE_EVIDENCE'], profit: p };
  } catch (e) {
    return stop(`EVALUATION_ERROR:${e?.message ?? e}`);
  }
}

// Purchase recording guard: a supplier purchase can be recorded only with evidence, once.
export function canRecordPurchase({ supplierOrder, evidence, killSwitchActive }) {
  if (killSwitchActive !== false) return { ok: false, reason: 'KILL_SWITCH_ACTIVE' };
  if (!supplierOrder || supplierOrder.state !== 'CHECKOUT_READY') return { ok: false, reason: 'INVALID_STATE' };
  if (supplierOrder.approvals?.stage2 !== 'APPROVED') return { ok: false, reason: 'STAGE2_APPROVAL_MISSING' };
  if (!evidence?.supplierOrderNumber || !evidence?.transactionConfirmation) return { ok: false, reason: 'PURCHASE_EVIDENCE_MISSING' };
  if (supplierOrder.purchasedAt) return { ok: false, reason: 'ALREADY_PURCHASED' };
  return { ok: true };
}
