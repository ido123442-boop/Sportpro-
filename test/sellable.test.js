import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateSellable, REASONS } from '../src/core/sellable.js';
import { sellableInput, stagingTarget, PROD_CLIENT_FP } from './helpers/fixtures.js';

const live = (o) => ({ ...sellableInput().live, ...o });
const map = (o) => ({ ...sellableInput().mapping, ...o });

test('baseline pilot variant is SELLABLE with no reasons, metrics match the pricing formula', () => {
  const r = evaluateSellable(sellableInput());
  assert.deepEqual([...r.reasons], []);
  assert.equal(r.sellable, true);
  assert.equal(r.metrics.net, 36.17); // 373.9 - 319.9 - (373.9*4.5% + 1)
  assert.ok(r.metrics.markupPct <= 35);
  assert.ok(Object.isFrozen(r));
});

// Every reason code in the spec, each produced by exactly one fact being wrong.
const cases = [
  ['SUPPLIER_UNKNOWN', { supplier: { code: 'footlocker', verified: false } }],
  ['SUPPLIER_UNKNOWN', { supplier: {} }],
  ['SKU_MISMATCH', { mapping: map({ supplierSku: 'VEE3BKA041' }) }],
  ['SKU_MISMATCH', { mapping: map({ shopifySku: null }) }],
  ['VARIANT_MISMATCH', { mapping: map({ supplierSize: '36' }) }],
  ['VARIANT_MISMATCH', { mapping: map({ variantVerified: false }) }],
  ['VARIANT_MISMATCH', { live: live({ variantExists: false }) }],
  ['PRICE_MISSING', { live: live({ price: null }) }],
  ['PRICE_MISSING', { live: live({ price: 0 }) }],
  ['PRICE_MISSING', { live: live({ currency: 'USD' }) }],
  ['STOCK_UNKNOWN', { live: live({ stock: 'UNKNOWN' }) }],
  ['STOCK_UNKNOWN', { live: live({ stock: undefined }) }],
  ['OUT_OF_STOCK', { live: live({ stock: 'UNAVAILABLE' }) }],
  ['SHIPPING_UNKNOWN', { shipping: { status: 'UNKNOWN', cost: null } }],
  ['SHIPPING_UNKNOWN', { shipping: { status: 'VERIFIED', cost: 0, conditionSatisfied: false } }],
  ['SHIPPING_UNKNOWN', { shipping: undefined }],
  ['PROFIT_BLOCKED', { pricing: { sellingPrice: 320 } }],          // net < 10
  ['PROFIT_BLOCKED', { pricing: { sellingPrice: 300 } }],          // negative profit
  ['MARGIN_BLOCKED', { pricing: { sellingPrice: 350 } }],          // net ~13.3, margin 3.8% < 4%
  ['MARKUP_ABOVE_MAX', { pricing: { sellingPrice: 450 } }],        // 40.7%
  ['RISK_BLOCKED', { risk: { pass: false, reasons: ['BRAND_UNKNOWN'] } }],
  ['RISK_BLOCKED', { risk: {} }],
  ['LOW_CONFIDENCE', { mapping: map({ confidence: 0.94 }) }],
  ['LOW_CONFIDENCE', { mapping: map({ confidence: undefined }) }],
  ['DUPLICATE_MAPPING', { mapping: map({ duplicate: true }) }],
  ['DUPLICATE_MAPPING', { mapping: map({ duplicate: undefined }) }],
  ['PRODUCTION_TARGET', { target: stagingTarget({ shopDomain: 'xayj9j-q9.myshopify.com' }) }],
  ['PRODUCTION_TARGET', { target: stagingTarget({ clientIdSha256: PROD_CLIENT_FP }) }],
  ['PRODUCTION_TARGET', { target: { environment: 'production', shopDomain: 'www.sportpro.shop' } }],
  ['KILL_SWITCH_ON', { killSwitch: 'ON' }],
  ['KILL_SWITCH_ON', { killSwitch: 'garbage' }],
  ['KILL_SWITCH_ON', { killSwitch: undefined }],
  ['LIVE_DATA_STALE', { live: live({ checkedAt: '2026-10-06T00:00:00Z' }) }],
  ['LIVE_DATA_STALE', { live: live({ checkedAt: null }) }],
  ['ACTIVE_BLOCK', { blocks: ['OWNER_HOLD'] }],
  ['PRICE_POLICY_INVALID', { pricing: { sellingPrice: null } }],
];
for (const [code, patch] of cases) {
  test(`${code}: ${JSON.stringify(patch).slice(0, 80)} -> SELLABLE=false`, () => {
    const r = evaluateSellable(sellableInput(patch));
    assert.equal(r.sellable, false);
    assert.ok(r.reasons.includes(code), `expected ${code}, got ${r.reasons.join(',')}`);
  });
}

test('every spec reason code is covered by a test case', () => {
  const spec = ['SUPPLIER_UNKNOWN', 'SKU_MISMATCH', 'VARIANT_MISMATCH', 'PRICE_MISSING', 'STOCK_UNKNOWN', 'OUT_OF_STOCK', 'SHIPPING_UNKNOWN', 'PROFIT_BLOCKED', 'MARGIN_BLOCKED', 'MARKUP_ABOVE_MAX', 'RISK_BLOCKED', 'LOW_CONFIDENCE', 'DUPLICATE_MAPPING', 'PRODUCTION_TARGET', 'KILL_SWITCH_ON'];
  for (const c of spec) { assert.ok(REASONS[c], c); assert.ok(cases.some(([k]) => k === c), c); }
});

test('isolated staging target keeps it SELLABLE; reasons accumulate (not first-fail only)', () => {
  assert.equal(evaluateSellable(sellableInput({ target: stagingTarget() })).sellable, true);
  const r = evaluateSellable(sellableInput({ killSwitch: 'ON', live: live({ stock: 'UNKNOWN' }), risk: {} }));
  for (const c of ['KILL_SWITCH_ON', 'STOCK_UNKNOWN', 'RISK_BLOCKED']) assert.ok(r.reasons.includes(c), c);
});

test('no input can force SELLABLE: forged flags ignored, garbage input fails closed', () => {
  const forged = { ...sellableInput({ live: live({ stock: 'UNKNOWN' }) }), sellable: true, override: true };
  assert.equal(evaluateSellable(forged).sellable, false);
  for (const bad of [undefined, null, {}, 42, 'SELLABLE', []]) assert.equal(evaluateSellable(bad).sellable, false, String(bad));
  const tricky = sellableInput(); Object.defineProperty(tricky, 'mapping', { get() { throw new Error('boom'); } });
  const r = evaluateSellable(tricky);
  assert.equal(r.sellable, false); assert.ok(r.reasons.includes('EVALUATION_ERROR'));
});
