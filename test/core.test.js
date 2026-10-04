import test from 'node:test';
import assert from 'node:assert/strict';
import { normSize, optionSignature, normKey } from '../src/core/normalize.js';
import { shippingFor } from '../src/core/shipping.js';
import { evaluateProfit } from '../src/core/pricing.js';
import { classifyVariant, STATES } from '../src/core/eligibility.js';

const NOW = '2026-10-04T12:00:00Z';
const base = () => ({
  now: NOW,
  shopify: { productStatus: 'ACTIVE', price: 400, mediaCount: 3, duplicateSku: false },
  supplier: { key: 'footlocker', supported: true, feedOk: true, checkoutVerified: true },
  match: { status: 'MATCHED', tier: 'EXACT' },
  live: { fetchedAt: '2026-10-04T10:00:00Z', stock: 'AVAILABLE', cost: 300 },
  shipping: { status: 'VERIFIED', cost: 0 },
  profit: { pass: true },
  risk: {},
  approval: { mappingApproved: true },
});

test('size normalization incl. fractional EU sizes and bidi', () => {
  assert.equal(normSize('41 1/3'), '41.33');
  assert.equal(normSize('41⅔'), '41.67');
  assert.equal(normSize('EU 42'), '42');
  assert.equal(normSize('42.0'), '42');
  assert.equal(normSize('‏ xl '), 'XL');
  assert.equal(optionSignature(['Default Title']), '');
  assert.equal(optionSignature(['M', 'שחור']), optionSignature(['שחור', 'm']));
  assert.equal(normKey('Nike  Air-Max "90"'), 'nikeairmax90');
});

test('shipping: UNKNOWN never becomes 0', () => {
  assert.equal(shippingFor('arena', { unitCost: 100 }).status, 'UNKNOWN');
  assert.equal(shippingFor('arena', { unitCost: 100 }).cost, null);
  assert.equal(shippingFor('megasport', { unitCost: 120, productType: 'נעלי ריצה' }).status, 'UNKNOWN');
  assert.equal(shippingFor('megasport', { unitCost: 320, productType: 'נעלי ריצה' }).cost, 0);
  assert.equal(shippingFor('megasport', { unitCost: 320, productType: 'מחבטי טניס' }).status, 'UNKNOWN');
  assert.equal(shippingFor('bashgal', { unitCost: 100, grams: 25000 }).status, 'EXCEPTION');
  assert.equal(shippingFor('bashgal', { unitCost: 100, grams: 0 }).status, 'UNKNOWN');
  assert.equal(shippingFor('dugit', { unitCost: 251 }).cost, 0);
  assert.equal(shippingFor('dugit', { unitCost: 250 }).cost, 30);
  assert.equal(shippingFor('footlocker', { unitCost: 150 }).cost, 14.9);
});

test('profit formula matches handoff (fees 4.5% + 1)', () => {
  const p = evaluateProfit({ sellingPrice: 200, supplierCost: 150, shippingCost: 0 });
  assert.equal(p.fees, 10);
  assert.equal(p.net, 40);
  assert.equal(p.pass, true);
  // fixed shipping makes low-cost items structurally unprofitable (handoff example)
  const q = evaluateProfit({ sellingPrice: 99.9, supplierCost: 79.9, shippingCost: 29 });
  assert.equal(q.pass, false);
  assert.equal(evaluateProfit({ sellingPrice: 100, supplierCost: 50, shippingCost: null }).reason, 'SHIPPING_COST_UNKNOWN');
});

test('all gates pass -> SELLABLE; every state is in the closed set', () => {
  const r = classifyVariant(base());
  assert.equal(r.state, 'SELLABLE');
  assert.ok(STATES.includes(r.state));
});

const cases = [
  ['archived', (c) => { c.shopify.productStatus = 'ARCHIVED'; }, 'INVALID'],
  ['no supplier tag', (c) => { c.supplier.key = null; }, 'SUPPLIER_REQUIRED'],
  ['unsupported supplier', (c) => { c.supplier.supported = false; }, 'SUPPLIER_REQUIRED'],
  ['stale data', (c) => { c.live.fetchedAt = '2026-10-01T00:00:00Z'; }, 'STALE'],
  ['no match', (c) => { c.match = { status: 'NONE', reason: 'NO_PRODUCT_MATCH' }; }, 'MAPPING_REQUIRED'],
  ['ambiguous', (c) => { c.match = { status: 'AMBIGUOUS', reason: 'AMBIGUOUS_PRODUCT' }; }, 'MAPPING_REQUIRED'],
  ['duplicate supplier mapping', (c) => { c.risk.duplicateSupplierMapping = true; }, 'RISK_BLOCKED'],
  ['stock unavailable', (c) => { c.live.stock = 'UNAVAILABLE'; }, 'STOCK_BLOCKED'],
  ['stock unknown', (c) => { c.live.stock = 'UNKNOWN'; }, 'STOCK_BLOCKED'],
  ['stock quantity number is not AVAILABLE', (c) => { c.live.stock = 2; }, 'STOCK_BLOCKED'],
  ['shipping unknown', (c) => { c.shipping = { status: 'UNKNOWN', cost: null }; }, 'SHIPPING_BLOCKED'],
  ['shipping exception', (c) => { c.shipping = { status: 'EXCEPTION', cost: null }; }, 'SHIPPING_BLOCKED'],
  ['profit fail', (c) => { c.profit = { pass: false, reason: 'PROFIT_BELOW_MIN' }; }, 'PROFIT_BLOCKED'],
  ['profit missing', (c) => { c.profit = undefined; }, 'PROFIT_BLOCKED'],
  ['duplicate sku', (c) => { c.shopify.duplicateSku = true; }, 'DATA_FIX'],
  ['no images', (c) => { c.shopify.mediaCount = 0; }, 'DATA_FIX'],
  ['high-tier unapproved', (c) => { c.match.tier = 'HIGH'; c.approval.mappingApproved = false; }, 'OWNER_APPROVAL'],
  ['exact unapproved', (c) => { c.approval.mappingApproved = false; }, 'AUTO_READY'],
  ['checkout unverified', (c) => { c.supplier.checkoutVerified = false; }, 'AUTO_READY'],
];
for (const [name, mut, expected] of cases) {
  test(`gate: ${name} -> ${expected}`, () => {
    const c = base(); mut(c);
    const r = classifyVariant(c);
    assert.equal(r.state, expected);
    assert.ok(r.primaryReason, 'non-SELLABLE must carry a primary reason');
  });
}

test('evaluator error -> UNKNOWN, never SELLABLE', () => {
  const r = classifyVariant(null);
  assert.equal(r.state, 'UNKNOWN');
});
