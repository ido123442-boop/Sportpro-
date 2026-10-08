import test from 'node:test';
import assert from 'node:assert/strict';
import { computeHealth, CHECKS } from '../src/core/health.js';

const green = {
  suppliers: [{ supplier: 'footlocker', ok: true }, { supplier: 'dugit', ok: true }],
  shopify: { productionReadOk: true, stagingStore: true, stagingAppOk: true },
  d1: { stagingProvisioned: true, schemaOk: true, killSwitchState: 'ON' },
  live: { total: 100, priceOk: 100, available: 90, unavailable: 10, unknown: 0, shippingKnown: 100, priceChanged: 0 },
  sellable: { count: 3, target: 3 }, mapping: { approved: 3, candidates: 10, duplicates: 0 },
};

test('all facts good -> every check GREEN', () => {
  const h = computeHealth(green);
  assert.deepEqual(Object.keys(h.checks), [...CHECKS]);
  for (const c of CHECKS) assert.equal(h.checks[c].status, 'GREEN', c);
  assert.equal(h.overall, 'GREEN');
});

test('unknown / empty snapshot is never GREEN', () => {
  const h = computeHealth({});
  for (const c of CHECKS) assert.notEqual(h.checks[c].status, 'GREEN', c);
  assert.equal(h.overall, 'RED');
});

test('current reality: no dev store, no staging D1, 0 SELLABLE, 0 approved mappings -> RED on those', () => {
  const h = computeHealth({ ...green, shopify: { productionReadOk: true, stagingStore: false }, d1: { stagingProvisioned: false }, sellable: { count: 0 }, mapping: { approved: 0 } });
  for (const c of ['SHOPIFY_HEALTH', 'D1_HEALTH', 'SELLABLE_HEALTH', 'MAPPING_HEALTH']) assert.equal(h.checks[c].status, 'RED', c);
  assert.equal(h.checks.STOCK_HEALTH.status, 'GREEN');
});

test('thresholds: partial supplier outage YELLOW, >5% unknown stock RED, kill switch INVALID YELLOW', () => {
  assert.equal(computeHealth({ ...green, suppliers: [{ ok: true }, { ok: false }] }).checks.SUPPLIER_HEALTH.status, 'YELLOW');
  assert.equal(computeHealth({ ...green, live: { ...green.live, unknown: 6 } }).checks.STOCK_HEALTH.status, 'RED');
  assert.equal(computeHealth({ ...green, d1: { ...green.d1, killSwitchState: 'INVALID' } }).checks.D1_HEALTH.status, 'YELLOW');
});
