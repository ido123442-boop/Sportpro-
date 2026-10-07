import test from 'node:test';
import assert from 'node:assert/strict';
import { authorizeAction, parseKillSwitch, ACTIONS } from '../src/core/actionGuard.js';

const NOW = '2026-10-07T10:00:00Z';
const sellable = () => ({
  now: NOW,
  shopify: { productStatus: 'ACTIVE', price: 400, mediaCount: 3, duplicateSku: false },
  supplier: { key: 'footlocker', supported: true, feedOk: true, checkoutVerified: true },
  match: { status: 'MATCHED', cls: 'AUTO_CANDIDATE' },
  live: { fetchedAt: '2026-10-07T09:30:00Z', stock: 'AVAILABLE', cost: 300, currency: 'ILS', verified: true, variantExists: true, urlOk: true },
  shipping: { status: 'VERIFIED', cost: 0, conditionSatisfied: true },
  profit: { pass: true },
  risk: {},
  approval: { mappingApproved: true },
});
const base = (over = {}) => ({
  settings: { kill_switch: '{"active":false}' },
  action: 'PURCHASE',
  sellableCtx: sellable(),
  approvals: { stage1: true, stage2: true },
  evidence: { supplierOrderNumber: 'N1', transactionConfirmation: 'T1' },
  shopifyWritesEnabled: true,
  ...over,
});

test('baseline: everything satisfied -> allowed', () => {
  for (const a of ACTIONS) assert.equal(authorizeAction(base({ action: a })).allowed, true, a);
});

test('Kill Switch ON -> every action blocked', () => {
  for (const ks of ['ON', '{"active":true}', '{"active":1}'])
    for (const a of ACTIONS) assert.equal(authorizeAction(base({ action: a, settings: { kill_switch: ks } })).reason, 'KILL_SWITCH_ON');
});

test('Kill Switch malformed -> BLOCK', () => {
  for (const ks of ['garbage', '{"active":"no"}', '{}', '', 'off', '[1]'])
    for (const a of ACTIONS) assert.match(authorizeAction(base({ action: a, settings: { kill_switch: ks } })).reason, /^KILL_SWITCH_INVALID/);
});

test('missing settings / missing kill switch value -> BLOCK', () => {
  assert.equal(authorizeAction(base({ settings: undefined })).reason, 'SETTINGS_MISSING');
  assert.equal(authorizeAction(base({ settings: {} })).reason, 'KILL_SWITCH_INVALID');
  assert.equal(authorizeAction(null).allowed, false);
});

test('Kill Switch OFF -> still no Shopify mutation unless SELLABLE and writes enabled', () => {
  const notSellable = sellable(); notSellable.live.stock = 'UNKNOWN';
  assert.match(authorizeAction(base({ action: 'SHOPIFY_MUTATION', sellableCtx: notSellable })).reason, /^NOT_SELLABLE/);
  assert.equal(authorizeAction(base({ action: 'SHOPIFY_MUTATION', shopifyWritesEnabled: false })).reason, 'SHOPIFY_WRITES_DISABLED');
  assert.equal(authorizeAction(base({ action: 'PUBLISH_LISTING', sellableCtx: undefined })).reason, 'SELLABLE_CONTEXT_MISSING');
});

const notSellableCases = [
  ['missing supplier verification (checkout not verified)', (c) => { c.supplier.checkoutVerified = false; }, /AUTO_READY:CHECKOUT_UNVERIFIED/],
  ['supplier not onboarded', (c) => { c.supplier.supported = false; }, /SUPPLIER_REQUIRED/],
  ['missing live verification', (c) => { c.live.verified = false; }, /STALE:LIVE_CHECK_REQUIRED/],
  ['missing live stock', (c) => { c.live.stock = undefined; }, /STOCK_BLOCKED:STOCK_UNKNOWN/],
  ['supplier stock unavailable', (c) => { c.live.stock = 'UNAVAILABLE'; }, /STOCK_BLOCKED:STOCK_UNAVAILABLE/],
  ['missing live price', (c) => { c.profit = { pass: false, reason: 'SUPPLIER_COST_UNKNOWN' }; c.live.cost = null; }, /PROFIT_BLOCKED:SUPPLIER_COST_UNKNOWN/],
  ['stale live data', (c) => { c.live.fetchedAt = '2026-10-05T00:00:00Z'; }, /STALE:SUPPLIER_DATA_STALE/],
  ['unknown shipping', (c) => { c.shipping = { status: 'UNKNOWN', cost: null }; }, /SHIPPING_BLOCKED/],
  ['insufficient profit', (c) => { c.profit = { pass: false, reason: 'PROFIT_BELOW_MIN' }; }, /PROFIT_BLOCKED:PROFIT_BELOW_MIN/],
  ['insufficient margin', (c) => { c.profit = { pass: false, reason: 'MARGIN_BELOW_MIN' }; }, /PROFIT_BLOCKED:MARGIN_BELOW_MIN/],
  ['unapproved mapping (HIGH_CONFIDENCE)', (c) => { c.match.cls = 'HIGH_CONFIDENCE'; c.approval.mappingApproved = false; }, /OWNER_APPROVAL/],
  ['unapproved mapping (AUTO_CANDIDATE not recorded)', (c) => { c.approval.mappingApproved = false; }, /AUTO_READY:AWAITING_MAPPING_RECORD/],
  ['manual-review mapping', (c) => { c.match.cls = 'MANUAL_REVIEW'; }, /MAPPING_REQUIRED/],
  ['variant mismatch / gone', (c) => { c.live.variantExists = false; }, /SUPPLIER_VARIANT_GONE/],
  ['duplicate mapping risk', (c) => { c.risk.duplicateSupplierMapping = true; }, /RISK_BLOCKED/],
];
for (const [name, mut, re] of notSellableCases) {
  test(`Kill Switch OFF but ${name} -> BLOCK for every action`, () => {
    for (const a of ACTIONS) {
      const c = sellable(); mut(c);
      const r = authorizeAction(base({ action: a, sellableCtx: c }));
      assert.equal(r.allowed, false); assert.match(r.reason, re);
    }
  });
}

test('purchase without two approvals -> BLOCK; approval 2 / checkout without approval 1 -> BLOCK', () => {
  assert.equal(authorizeAction(base({ approvals: { stage1: true } })).reason, 'TWO_APPROVALS_REQUIRED');
  assert.equal(authorizeAction(base({ approvals: { stage2: true } })).reason, 'TWO_APPROVALS_REQUIRED');
  assert.equal(authorizeAction(base({ approvals: {} })).reason, 'TWO_APPROVALS_REQUIRED');
  assert.equal(authorizeAction(base({ action: 'APPROVAL_2', approvals: {} })).reason, 'APPROVAL_1_MISSING');
  assert.equal(authorizeAction(base({ action: 'CHECKOUT_DRAFT', approvals: {} })).reason, 'APPROVAL_1_MISSING');
  assert.equal(authorizeAction(base({ evidence: { supplierOrderNumber: 'N1' } })).reason, 'PURCHASE_EVIDENCE_MISSING');
  assert.equal(authorizeAction(base({ approvals: { stage1: 'yes', stage2: 'yes' } })).reason, 'TWO_APPROVALS_REQUIRED');
});

test('unknown action -> BLOCK', () => {
  assert.equal(authorizeAction(base({ action: 'REFUND' })).reason, 'UNKNOWN_ACTION');
});

test('core parser agrees with the patched Worker parser', async () => {
  const w = await import('../worker/src/index.js');
  for (const v of ['ON', 'OFF', '{"active":true}', '{"active":false}', '{"active":0}', 'x', '', null, '{"active":"no"}', '{}'])
    assert.equal(parseKillSwitch(v).state, w.__parseKillSwitch(v).state, String(v));
});
