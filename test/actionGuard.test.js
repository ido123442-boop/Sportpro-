import test from 'node:test';
import assert from 'node:assert/strict';
import { authorizeAction, parseKillSwitch, ACTIONS } from '../src/core/actionGuard.js';
import { sellableInput, stagingTarget, PROD_CLIENT_FP } from './helpers/fixtures.js';

const base = (over = {}) => ({
  settings: { kill_switch: '{"active":false}' },
  action: 'PURCHASE',
  target: stagingTarget(),
  sellableInput: sellableInput(),
  approvals: { stage1: true, stage2: true },
  evidence: { supplierOrderNumber: 'N1', transactionConfirmation: 'T1' },
  shopifyWritesEnabled: true,
  ...over,
});

test('baseline: everything satisfied on isolated staging -> allowed', () => {
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

test('missing settings / missing kill switch value / null ctx -> BLOCK', () => {
  assert.equal(authorizeAction(base({ settings: undefined })).reason, 'SETTINGS_MISSING');
  assert.equal(authorizeAction(base({ settings: {} })).reason, 'KILL_SWITCH_INVALID');
  assert.equal(authorizeAction(null).allowed, false);
});

test('target: missing or production-linked -> BLOCK for every action', () => {
  for (const a of ACTIONS) {
    assert.equal(authorizeAction(base({ action: a, target: undefined })).reason, 'TARGET_MISSING');
    assert.equal(authorizeAction(base({ action: a, target: stagingTarget({ shopDomain: 'xayj9j-q9.myshopify.com' }) })).reason, 'TARGET_BLOCKED:STAGING_TARGETS_PRODUCTION_SHOP');
    assert.equal(authorizeAction(base({ action: a, target: stagingTarget({ shopDomain: 'www.sportpro.shop' }) })).reason, 'TARGET_BLOCKED:STAGING_TARGETS_PRODUCTION_SHOP');
    assert.equal(authorizeAction(base({ action: a, target: stagingTarget({ shopId: 'gid://shopify/Shop/99554459955' }) })).reason, 'TARGET_BLOCKED:STAGING_TARGETS_PRODUCTION_SHOP');
    assert.equal(authorizeAction(base({ action: a, target: stagingTarget({ clientIdSha256: PROD_CLIENT_FP }) })).reason, 'TARGET_BLOCKED:STAGING_USES_PRODUCTION_CREDENTIALS');
    assert.equal(authorizeAction(base({ action: a, target: { environment: 'production', shopDomain: 'xayj9j-q9.myshopify.com' } })).reason, 'TARGET_BLOCKED:PRODUCTION_WRITES_NOT_APPROVED');
  }
});

test('Shopify mutation needs SELLABLE and writes enabled', () => {
  assert.match(authorizeAction(base({ action: 'SHOPIFY_MUTATION', sellableInput: sellableInput({ live: { ...sellableInput().live, stock: 'UNKNOWN' } }) })).reason, /^NOT_SELLABLE:.*STOCK_UNKNOWN/);
  assert.equal(authorizeAction(base({ action: 'SHOPIFY_MUTATION', shopifyWritesEnabled: false })).reason, 'SHOPIFY_WRITES_DISABLED');
  assert.equal(authorizeAction(base({ action: 'PUBLISH_LISTING', sellableInput: undefined })).reason, 'SELLABLE_CONTEXT_MISSING');
});

test('a forged "sellable: true" in the input cannot authorize anything', () => {
  const forged = { ...sellableInput({ supplier: { code: 'footlocker', verified: false } }), sellable: true, override: true, reasons: [] };
  for (const a of ACTIONS) assert.match(authorizeAction(base({ action: a, sellableInput: forged })).reason, /SUPPLIER_UNKNOWN/);
});

test('a kill switch value smuggled inside sellableInput is ignored (settings win)', () => {
  const r = authorizeAction(base({ settings: { kill_switch: 'ON' }, sellableInput: { ...sellableInput(), killSwitch: '{"active":false}' } }));
  assert.equal(r.reason, 'KILL_SWITCH_ON');
});

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
