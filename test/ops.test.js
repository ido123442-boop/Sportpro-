import test from 'node:test';
import assert from 'node:assert/strict';
import { buildSkuProposals } from '../src/core/skuProposals.js';
import { planSync, reconcileBeforeWrite, rollbackSet } from '../src/core/syncPlanner.js';
import { evaluateOrderLine, canRecordPurchase } from '../src/core/orderGate.js';

// ---------- SKU proposals ----------
const item = (o) => ({ shopifyVariantId: 'v1', currentSku: null, supplier: 'footlocker', supplierVariantId: 's1', supplierSku: 'AB1', confidence: 1, cls: 'AUTO_CANDIDATE', sizeEvidence: 'EXACT', method: 'SKU_EXACT', ...o });
test('sku proposal passes all uniqueness checks -> WRITE_CANDIDATE (still approval_required)', () => {
  const [p] = buildSkuProposals([item()], new Map(), new Map([['footlocker:AB1', 1]]));
  assert.equal(p.status, 'WRITE_CANDIDATE'); assert.equal(p.approval_required, true);
});
test('sku collision with an existing Shopify SKU -> REVIEW', () => {
  const [p] = buildSkuProposals([item()], new Map([['AB1', 1]]), new Map([['footlocker:AB1', 1]]));
  assert.equal(p.collision_status, 'COLLIDES_WITH_EXISTING_SHOPIFY_SKU'); assert.equal(p.status, 'REVIEW');
});
test('same SKU proposed to two variants -> REVIEW', () => {
  const ps = buildSkuProposals([item(), item({ shopifyVariantId: 'v2' })], new Map(), new Map([['footlocker:AB1', 1]]));
  assert.ok(ps.every((p) => p.collision_status === 'PROPOSED_TO_MULTIPLE_VARIANTS'));
});
test('supplier SKU not unique / size not exact / not auto-candidate -> REVIEW', () => {
  assert.equal(buildSkuProposals([item()], new Map(), new Map([['footlocker:AB1', 2]]))[0].collision_status, 'SUPPLIER_SKU_NOT_UNIQUE');
  assert.equal(buildSkuProposals([item({ sizeEvidence: 'SIZE_ONLY' })], new Map(), new Map([['footlocker:AB1', 1]]))[0].status, 'REVIEW');
  assert.equal(buildSkuProposals([item({ cls: 'HIGH_CONFIDENCE' })], new Map(), new Map([['footlocker:AB1', 1]]))[0].status, 'REVIEW');
});
test('already correct SKU -> NO_CHANGE', () => {
  assert.equal(buildSkuProposals([item({ currentSku: 'ab1' })], new Map([['AB1', 1]]), new Map([['footlocker:AB1', 1]]))[0].status, 'NO_CHANGE');
});

// ---------- sync planner ----------
const prod = (id, status, variants) => ({ productId: id, title: id, status, variants });
test('STRICT: no sellable variant -> DRAFT; sellable -> ACTIVE; unchanged rows omitted', () => {
  const { queue, rollback } = planSync([
    prod('a', 'ACTIVE', [{ state: 'STOCK_BLOCKED' }]),
    prod('b', 'DRAFT', [{ state: 'SELLABLE' }]),
    prod('c', 'ACTIVE', [{ state: 'SELLABLE' }]),
    prod('d', 'ARCHIVED', [{ state: 'SELLABLE' }]),
  ], { generatedAt: 't' });
  assert.deepEqual(queue.map((q) => [q.product_id, q.desired_state]), [['a', 'DRAFT'], ['b', 'ACTIVE']]);
  assert.deepEqual(rollback.map((r) => [r.product_id, r.restore_status]), [['a', 'ACTIVE'], ['b', 'DRAFT']]);
});
test('RISK_MINIMUM: drafts only ACTIVE products whose every purchasable variant is unavailable or loss-making', () => {
  const { queue } = planSync([
    prod('x', 'ACTIVE', [{ purchasable: true, supplierStock: 'UNAVAILABLE' }, { purchasable: true, supplierStock: 'AVAILABLE', profitNet: -5 }]),
    prod('y', 'ACTIVE', [{ purchasable: true, supplierStock: 'UNAVAILABLE' }, { purchasable: true, supplierStock: 'AVAILABLE', profitNet: 20 }]),
    prod('z', 'ACTIVE', [{ purchasable: false, supplierStock: 'UNAVAILABLE' }]),
  ], { policy: 'RISK_MINIMUM', generatedAt: 't' });
  assert.deepEqual(queue.map((q) => q.product_id), ['x']);
});
test('decision ids are deterministic (idempotent planning)', () => {
  const ps = [prod('a', 'ACTIVE', [{ state: 'STOCK_BLOCKED' }])];
  assert.equal(planSync(ps, { generatedAt: 't1' }).queue[0].decision_id, planSync(ps, { generatedAt: 't2' }).queue[0].decision_id);
});
test('reconcile before write: skip already applied, refuse drift', () => {
  const q = [{ product_id: 'a', current_state: 'ACTIVE', desired_state: 'DRAFT', decision_id: '1' }, { product_id: 'b', current_state: 'ACTIVE', desired_state: 'DRAFT', decision_id: '2' }, { product_id: 'c', current_state: 'ACTIVE', desired_state: 'DRAFT', decision_id: '3' }];
  const r = reconcileBeforeWrite(q, new Map([['a', 'ACTIVE'], ['b', 'DRAFT'], ['c', 'ARCHIVED']]));
  assert.deepEqual(r.map((x) => x.action), ['APPLY', 'SKIP_ALREADY_APPLIED', 'REFUSE_DRIFT']);
});
test('Shopify write failure mid-batch: rollback only what was applied', () => {
  const rb = [{ product_id: 'a', restore_status: 'ACTIVE', decision_id: '1' }, { product_id: 'b', restore_status: 'ACTIVE', decision_id: '2' }];
  const results = [{ decision_id: '1', action: 'APPLY', ok: true }, { decision_id: '2', action: 'APPLY', ok: false, error: '429' }];
  assert.deepEqual(rollbackSet(results, rb).map((r) => r.product_id), ['a']);
});

// ---------- order gate ----------
const NOW = '2026-10-04T12:00:00Z';
const okCtx = () => ({
  killSwitchActive: false, now: NOW, seenIdempotencyKeys: new Set(),
  order: { id: 'o1', hmacVerified: true, financialStatus: 'PAID' }, line: { id: 'l1', unitPrice: 400 },
  mapping: { status: 'MAPPING_APPROVED', expectedCost: 300 },
  live: { checkedAt: '2026-10-04T11:50:00Z', variantExists: true, stock: 'AVAILABLE', currency: 'ILS', cost: 300 },
  shipping: { cost: 0 },
});
test('order line passes -> PROCEED_TO_DRAFT only (owner approvals still required)', () => {
  const r = evaluateOrderLine(okCtx());
  assert.equal(r.decision, 'PROCEED_TO_DRAFT'); assert.ok(r.requires.includes('OWNER_APPROVAL_2'));
});
const stops = [
  ['kill switch ON', (c) => { c.killSwitchActive = true; }, 'KILL_SWITCH_ACTIVE'],
  ['kill switch unknown', (c) => { c.killSwitchActive = undefined; }, 'KILL_SWITCH_ACTIVE'],
  ['webhook HMAC not verified', (c) => { c.order.hmacVerified = false; }, 'WEBHOOK_HMAC_NOT_VERIFIED'],
  ['duplicate order line', (c) => { c.seenIdempotencyKeys.add('o1:l1'); }, 'DUPLICATE_ORDER_LINE'],
  ['payment pending', (c) => { c.order.financialStatus = 'PENDING'; }, 'PAYMENT_PENDING'],
  ['no approved mapping', (c) => { c.mapping.status = 'PROPOSED'; }, 'NO_APPROVED_MAPPING'],
  ['stale live check', (c) => { c.live.checkedAt = '2026-10-04T09:00:00Z'; }, 'LIVE_CHECK_STALE'],
  ['supplier unavailable', (c) => { c.live.stock = 'UNAVAILABLE'; }, 'STOCK_UNAVAILABLE'],
  ['unknown stock', (c) => { c.live.stock = 'UNKNOWN'; }, 'STOCK_UNKNOWN'],
  ['supplier price jumped', (c) => { c.live.cost = 360; }, 'SUPPLIER_PRICE_INCREASED'],
  ['shipping unknown', (c) => { c.shipping = { cost: null }; }, 'SHIPPING_UNKNOWN'],
  ['unprofitable', (c) => { c.line.unitPrice = 305; }, 'PROFIT_BLOCKED:PROFIT_BELOW_MIN'],
];
for (const [name, mut, reason] of stops) {
  test(`order gate STOP: ${name}`, () => { const c = okCtx(); mut(c); const r = evaluateOrderLine(c); assert.equal(r.decision, 'STOP'); assert.equal(r.reason, reason); });
}
test('purchase recording requires stage-2 approval, evidence, kill switch OFF, once', () => {
  const so = { state: 'CHECKOUT_READY', approvals: { stage2: 'APPROVED' } };
  const ev = { supplierOrderNumber: 'X1', transactionConfirmation: 'T1' };
  assert.equal(canRecordPurchase({ supplierOrder: so, evidence: ev, killSwitchActive: false }).ok, true);
  assert.equal(canRecordPurchase({ supplierOrder: so, evidence: ev, killSwitchActive: true }).reason, 'KILL_SWITCH_ACTIVE');
  assert.equal(canRecordPurchase({ supplierOrder: so, evidence: { supplierOrderNumber: 'X1' }, killSwitchActive: false }).reason, 'PURCHASE_EVIDENCE_MISSING');
  assert.equal(canRecordPurchase({ supplierOrder: { ...so, approvals: {} }, evidence: ev, killSwitchActive: false }).reason, 'STAGE2_APPROVAL_MISSING');
  assert.equal(canRecordPurchase({ supplierOrder: { ...so, purchasedAt: 't' }, evidence: ev, killSwitchActive: false }).reason, 'ALREADY_PURCHASED');
  assert.equal(canRecordPurchase({ supplierOrder: { ...so, state: 'AWAITING_APPROVAL' }, evidence: ev, killSwitchActive: false }).reason, 'INVALID_STATE');
});
test('supplier checkout failure keeps order out of PURCHASED (no evidence -> refused)', () => {
  const so = { state: 'CHECKOUT_READY', approvals: { stage2: 'APPROVED' } };
  assert.equal(canRecordPurchase({ supplierOrder: so, evidence: null, killSwitchActive: false }).ok, false);
});
