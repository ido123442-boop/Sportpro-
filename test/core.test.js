import test from 'node:test';
import assert from 'node:assert/strict';
import { normSize, optionSignature, normKey } from '../src/core/normalize.js';
import { shippingFor } from '../src/core/shipping.js';
import { evaluateProfit, minProfitablePrice, charmUp, CURRENT_POLICY } from '../src/core/pricing.js';
import { classifyVariant, STATES, GROUP_OF_STATE } from '../src/core/eligibility.js';

const NOW = '2026-10-04T12:00:00Z';
const base = () => ({
  now: NOW,
  shopify: { productStatus: 'ACTIVE', price: 400, mediaCount: 3, duplicateSku: false },
  supplier: { key: 'footlocker', supported: true, feedOk: true, checkoutVerified: true },
  match: { status: 'MATCHED', cls: 'AUTO_CANDIDATE' },
  live: { fetchedAt: '2026-10-04T10:00:00Z', stock: 'AVAILABLE', cost: 300, currency: 'ILS', verified: true, variantExists: true, urlOk: true },
  shipping: { status: 'VERIFIED', cost: 0, conditionSatisfied: true },
  profit: { pass: true },
  risk: {},
  approval: { mappingApproved: true },
});

test('size normalization: fractional EU sizes, unicode fractions, bidi, prefixes', () => {
  assert.equal(normSize('41 1/3'), '41.33');
  assert.equal(normSize('41⅔'), '41.67');
  assert.equal(normSize('EU 42'), '42');
  assert.equal(normSize('42.0'), '42');
  assert.equal(normSize('‏ xl '), 'XL');
  assert.equal(optionSignature(['Default Title']), '');
  assert.equal(optionSignature(['Default']), '');
  assert.equal(normKey('Nike  Air-Max "90"'), 'nikeairmax90');
});

test('color normalization: case, spacing and order independent', () => {
  assert.equal(optionSignature(['M', 'שחור']), optionSignature(['שחור', 'm']));
  assert.equal(optionSignature(['Black/White', '42']), optionSignature(['42', 'black / white']));
  assert.notEqual(optionSignature(['M', 'שחור']), optionSignature(['M', 'לבן']));
});

test('shipping: UNKNOWN never becomes 0; conditional thresholds evaluated', () => {
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
  assert.equal(shippingFor('footlocker', { unitCost: 199 }).cost, 0);
});

test('profit formula (fees 4.5% + 1 ILS) and fixed-shipping trap', () => {
  const p = evaluateProfit({ sellingPrice: 200, supplierCost: 150, shippingCost: 0 });
  assert.equal(p.fees, 10); assert.equal(p.net, 40); assert.equal(p.pass, true);
  assert.equal(p.policy, CURRENT_POLICY.version);
  assert.equal(evaluateProfit({ sellingPrice: 99.9, supplierCost: 79.9, shippingCost: 29 }).pass, false);
  assert.equal(evaluateProfit({ sellingPrice: 100, supplierCost: 50, shippingCost: null }).reason, 'SHIPPING_COST_UNKNOWN');
});

test('margin blocked separately from profit blocked', () => {
  // high price: net >= 10 but margin < 4%
  const r = evaluateProfit({ sellingPrice: 1000, supplierCost: 930, shippingCost: 0 });
  assert.equal(r.reason, 'MARGIN_BELOW_MIN');
  const q = evaluateProfit({ sellingPrice: 60, supplierCost: 50, shippingCost: 0 });
  assert.equal(q.reason, 'PROFIT_BELOW_MIN');
});

test('charm pricing and minimum profitable price', () => {
  assert.equal(charmUp(101.2), 101.9);
  assert.equal(charmUp(101.9), 101.9);
  assert.equal(charmUp(101.95), 102.9);
  const m = minProfitablePrice({ supplierCost: 300, shippingCost: 0 });
  assert.ok(evaluateProfit({ sellingPrice: m.price, supplierCost: 300, shippingCost: 0 }).pass);
  assert.ok(!evaluateProfit({ sellingPrice: m.price - 1, supplierCost: 300, shippingCost: 0 }).pass);
  assert.ok(m.price <= m.cap);
  assert.equal(m.feasible, true);
  // 79.90 + 29 shipping cannot be priced within 35% markup cap
  assert.equal(minProfitablePrice({ supplierCost: 79.9, shippingCost: 29 }).feasible, false);
  assert.equal(minProfitablePrice({ supplierCost: 100, shippingCost: null }).reason, 'SHIPPING_COST_UNKNOWN');
});

test('all gates pass -> SELLABLE in group A; every state maps to a group', () => {
  const r = classifyVariant(base());
  assert.equal(r.state, 'SELLABLE');
  assert.equal(r.group, 'A_VERIFIED_SELLABLE');
  for (const s of STATES) assert.ok(GROUP_OF_STATE[s], s);
});

const cases = [
  ['archived', (c) => { c.shopify.productStatus = 'ARCHIVED'; }, 'INVALID'],
  ['no supplier tag', (c) => { c.supplier.key = null; }, 'SUPPLIER_REQUIRED'],
  ['blocked supplier', (c) => { c.supplier.blocked = true; }, 'SUPPLIER_REQUIRED'],
  ['unsupported supplier', (c) => { c.supplier.supported = false; }, 'SUPPLIER_REQUIRED'],
  ['no match', (c) => { c.match = { status: 'NONE', reason: 'NO_PRODUCT_MATCH' }; }, 'MAPPING_REQUIRED'],
  ['ambiguous mapping', (c) => { c.match = { status: 'AMBIGUOUS', reason: 'AMBIGUOUS_PRODUCT' }; }, 'MAPPING_REQUIRED'],
  ['fuzzy/manual review never sellable', (c) => { c.match.cls = 'MANUAL_REVIEW'; }, 'MAPPING_REQUIRED'],
  ['reject class', (c) => { c.match.cls = 'REJECT'; }, 'MAPPING_REQUIRED'],
  ['supplier variant disappeared', (c) => { c.live.variantExists = false; }, 'MAPPING_REQUIRED'],
  ['duplicate supplier mapping', (c) => { c.risk.duplicateSupplierMapping = true; }, 'RISK_BLOCKED'],
  ['currency not ILS', (c) => { c.live.currency = 'USD'; }, 'RISK_BLOCKED'],
  ['broken supplier url', (c) => { c.live.urlOk = false; }, 'RISK_BLOCKED'],
  ['stale supplier data', (c) => { c.live.fetchedAt = '2026-10-01T00:00:00Z'; }, 'STALE'],
  ['stock unavailable', (c) => { c.live.stock = 'UNAVAILABLE'; }, 'STOCK_BLOCKED'],
  ['stock UNKNOWN', (c) => { c.live.stock = 'UNKNOWN'; }, 'STOCK_BLOCKED'],
  ['stock quantity number is not AVAILABLE', (c) => { c.live.stock = 2; }, 'STOCK_BLOCKED'],
  ['shipping unknown', (c) => { c.shipping = { status: 'UNKNOWN', cost: null }; }, 'SHIPPING_BLOCKED'],
  ['shipping exception', (c) => { c.shipping = { status: 'EXCEPTION', cost: null }; }, 'SHIPPING_BLOCKED'],
  ['shipping conditional not met', (c) => { c.shipping = { status: 'CONDITIONAL', cost: 0, conditionSatisfied: false }; }, 'SHIPPING_BLOCKED'],
  ['profit blocked', (c) => { c.profit = { pass: false, reason: 'PROFIT_BELOW_MIN' }; }, 'PROFIT_BLOCKED'],
  ['margin blocked', (c) => { c.profit = { pass: false, reason: 'MARGIN_BELOW_MIN' }; }, 'PROFIT_BLOCKED'],
  ['profit missing', (c) => { c.profit = undefined; }, 'PROFIT_BLOCKED'],
  ['duplicate sku', (c) => { c.shopify.duplicateSku = true; }, 'DATA_FIX'],
  ['no images', (c) => { c.shopify.mediaCount = 0; }, 'DATA_FIX'],
  ['no live check', (c) => { c.live.verified = false; }, 'STALE'],
  ['high-confidence unapproved', (c) => { c.match.cls = 'HIGH_CONFIDENCE'; c.approval.mappingApproved = false; }, 'OWNER_APPROVAL'],
  ['auto-candidate unrecorded', (c) => { c.approval.mappingApproved = false; }, 'AUTO_READY'],
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
  assert.equal(classifyVariant(null).state, 'UNKNOWN');
});

import { wooStock, shopifyStock } from '../src/core/stock.js';
test('stock tri-state: Woo backorder / not purchasable is never AVAILABLE; missing is UNKNOWN', () => {
  assert.equal(wooStock({ is_in_stock: true, is_purchasable: true, stock_availability: { class: 'in-stock' } }), 'AVAILABLE');
  assert.equal(wooStock({ is_in_stock: true, is_purchasable: false, stock_availability: { class: 'available-on-backorder' } }), 'UNKNOWN');
  assert.equal(wooStock({ is_in_stock: true, is_purchasable: true, stock_availability: { class: 'available-on-backorder' } }), 'UNKNOWN');
  assert.equal(wooStock({ is_in_stock: false }), 'UNAVAILABLE');
  assert.equal(wooStock(null), 'UNKNOWN');
  assert.equal(shopifyStock(undefined), 'UNKNOWN');
  assert.equal(shopifyStock(2), 'UNKNOWN');
});

test('MegaSport free shipping uses supplier DIVISION, never the Shopify product type', () => {
  assert.equal(shippingFor('megasport', { unitCost: 10699, productType: '', division: 'equipment' }).status, 'UNKNOWN');
  assert.equal(shippingFor('megasport', { unitCost: 10699, productType: 'ביגוד', division: 'equipment' }).status, 'UNKNOWN');
  assert.equal(shippingFor('megasport', { unitCost: 350, productType: '', division: 'APPAREL' }).cost, 0);
  assert.equal(shippingFor('megasport', { unitCost: 350, productType: '', division: 'footwear' }).cost, 0);
  assert.equal(shippingFor('megasport', { unitCost: 350, productType: '', division: 'Accessories and underwear' }).status, 'UNKNOWN');
});

import fs from 'node:fs';
test('pricing policy config and code agree; markup tiers stay UNKNOWN until bands exist', () => {
  const cfg = JSON.parse(fs.readFileSync(new URL('../config/pricing_policy.json', import.meta.url), 'utf8'));
  assert.equal(cfg.version, CURRENT_POLICY.version);
  assert.equal(cfg.payment_fee_pct / 100, CURRENT_POLICY.feePct);
  assert.equal(cfg.payment_fee_fixed_ils, CURRENT_POLICY.feeFixed);
  assert.equal(cfg.min_net_profit_ils, CURRENT_POLICY.minProfit);
  assert.equal(cfg.min_net_margin_pct, CURRENT_POLICY.minMarginPct);
  assert.equal(cfg.max_markup_pct, CURRENT_POLICY.maxMarkupPct);
  assert.equal(cfg.markup_tiers.cost_band_boundaries_ils, null);
  assert.equal(CURRENT_POLICY.markupTiers, null);
});

test('markup above policy ceiling (35%) is blocked with a reprice-down target', () => {
  const r = evaluateProfit({ sellingPrice: 637.89, supplierCost: 405.93, shippingCost: 0 });
  assert.equal(r.pass, false); assert.equal(r.reason, 'MARKUP_ABOVE_MAX'); assert.equal(r.maxPrice, 548.01);
  assert.equal(evaluateProfit({ sellingPrice: 540, supplierCost: 405.93, shippingCost: 0 }).pass, true);
});
