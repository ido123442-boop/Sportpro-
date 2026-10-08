import test from 'node:test';
import assert from 'node:assert/strict';
import { loadPolicy, policyFromConfig, quote, simulate, SIMULATION_COSTS } from '../src/core/pricingEngine.js';
import { normalizeShopifyProduct, normalizeWooProduct, adapterFor, ADAPTER_SUPPLIERS, U } from '../src/suppliers/adapters.js';
import { SUPPLIERS } from '../src/core/registry.js';
import { findDuplicates, summarize, DUP } from '../src/core/duplicates.js';
import { pilotScore } from '../src/core/pilotScore.js';
import { validateListingForPublish, gtinValid } from '../src/core/productData.js';
import { runSelectionAgent, summarizeAgent, AGENT_STATUSES } from '../src/agents/selectionAgent.js';
import { NOW, stagingTarget } from './helpers/fixtures.js';

const policy = loadPolicy();

// ---------------- Pricing engine ----------------
test('pricing: policy is loaded from config and stays PENDING_APPROVAL (never final)', () => {
  assert.equal(policy.status, 'PENDING_APPROVAL');
  assert.equal(policy.maxMarkupPct, 35);
  assert.deepEqual(policy.tiers.map((t) => t.pct), [15, 13, 12, 10]);
  for (const q of simulate(policy)) { assert.equal(q.final, false); if (q.status === 'PASS') assert.equal(q.reason, 'POLICY_PENDING_APPROVAL'); }
});

test('pricing: simulation 100..5000 -> every row PASS with floors and cap respected, charm .90', () => {
  const rows = simulate(policy, { shippingFor: (c) => (c >= 199 ? 0 : 14.9) });
  assert.deepEqual(rows.map((r) => r.cost), [...SIMULATION_COSTS]);
  for (const r of rows) {
    assert.equal(r.status, 'PASS', JSON.stringify(r));
    assert.ok(r.recommended_price >= r.minimum_price);
    assert.ok(r.net_profit >= 10 && r.margin >= 4 && r.markup <= 35);
    assert.ok(String(r.recommended_price).endsWith('.9'), String(r.recommended_price));
  }
});

test('pricing: configurable — a stricter config changes the result; invalid config throws', () => {
  const strict = policyFromConfig({ version: 't', PRICING_POLICY_STATUS: 'PENDING_APPROVAL', payment_fee_pct: 4.5, payment_fee_fixed_ils: 1, min_net_profit_ils: 50, min_net_margin_pct: 4, max_markup_pct: 20, charm_suffix: '.90', markup_tiers: { proposed_bands: [] } });
  assert.equal(quote({ cost: 100, shipping: 0, policy: strict }).reason, 'MIN_PRICE_EXCEEDS_MAX_MARKUP');
  assert.throws(() => policyFromConfig({ payment_fee_pct: 'x' }), /pricing_policy_invalid/);
  assert.throws(() => policyFromConfig(null), /pricing_policy_missing/);
});

test('pricing: BLOCK on unknown cost/shipping, negative profit, markup > 35%; market only when reliable', () => {
  assert.equal(quote({ cost: null, shipping: 0, policy }).reason, 'COST_UNKNOWN');
  assert.equal(quote({ cost: 100, shipping: null, policy }).reason, 'SHIPPING_UNKNOWN');
  assert.equal(quote({ cost: 319.9, shipping: 0, policy, sellingPrice: 300 }).reason, 'NEGATIVE_PROFIT');
  assert.equal(quote({ cost: 319.9, shipping: 0, policy, sellingPrice: 450 }).reason, 'MARKUP_ABOVE_MAX');
  const base = quote({ cost: 319.9, shipping: 0, policy });
  assert.equal(quote({ cost: 319.9, shipping: 0, policy, marketPrice: { amount: 340, reliable: false } }).recommended_price, base.recommended_price);
  assert.equal(quote({ cost: 319.9, shipping: 0, policy, marketPrice: { amount: 330, reliable: true } }).reason, 'MIN_PRICE_ABOVE_MARKET');
  assert.equal(quote({ cost: 319.9, shipping: 0, policy, marketPrice: { amount: 355, reliable: true } }).recommended_price, 355);
});

// ---------------- Supplier adapters (offline fixtures) ----------------
const flJs = { id: 8216717852825, title: 'U AUTHENTIC סניקרס', handle: 'f098990100', vendor: 'VANS', type: 'נעליים', tags: [], options: [{ name: 'Size' }], images: ['//cdn/x.jpg'],
  variants: [{ id: 44817809080473, sku: 'VEE3BKA040', barcode: '700053288836', price: 31990, compare_at_price: null, available: true, option1: '35' }, { id: 2, sku: 'VEE3BKA050', barcode: null, price: 31990, compare_at_price: 39900, available: false, option1: '36' }] };
const flJson = { id: 1, title: 'X', handle: 'x', vendor: '', product_type: '', tags: ['DIVISION:APPAREL'], options: [{ name: 'Size' }], images: [],
  variants: [{ id: 3, sku: '', price: '120.00', compare_at_price: null, available: null, option1: 'M' }] };
const woo = { id: 77, parent: 70, name: 'Arena Cap', slug: 'cap', sku: 'AR1', permalink: 'https://www.arenaisrael.co.il/p/cap', is_in_stock: true, is_purchasable: true, stock_availability: { class: 'in-stock' },
  prices: { price: '9900', regular_price: '12900', currency_code: 'ILS', currency_minor_unit: 2 }, images: [{ src: 'https://a/b.jpg' }], variation: [{ attribute: 'size', value: 'L' }] };

test('adapters: one adapter per required supplier, all GET-only, registry-backed', () => {
  assert.deepEqual([...ADAPTER_SUPPLIERS].sort(), ['arena', 'arosport', 'bashgal', 'dugit', 'energym', 'footlocker', 'megasport', 'sportstock']);
  for (const s of ADAPTER_SUPPLIERS) assert.equal(typeof adapterFor(s, { fetchImpl: () => { throw new Error('no network'); } }).discover, 'function');
  assert.throws(() => adapterFor('kdhockey'), /no_adapter/);
});

test('adapters: Shopify .js normalization (agorot, barcode, brand, stock, shipping)', () => {
  const meta = SUPPLIERS.find((s) => s.supplier_id === 'footlocker');
  const [a, b] = normalizeShopifyProduct(flJs, meta, NOW);
  assert.equal(a.price, 319.9); assert.equal(a.sku, 'VEE3BKA040'); assert.equal(a.barcode, '700053288836'); assert.equal(a.brand, 'VANS');
  assert.equal(a.size, '35'); assert.equal(a.stock, 'AVAILABLE'); assert.equal(a.shipping.cost, 0); assert.equal(a.compare_at, null);
  assert.equal(a.images[0], 'https://cdn/x.jpg'); assert.equal(a.url, 'https://www.footlocker.co.il/products/f098990100'); assert.equal(a.last_checked, NOW);
  assert.equal(b.stock, 'UNAVAILABLE'); assert.equal(b.compare_at, 399); assert.equal(b.barcode, U);
});

test('adapters: missing facts are UNKNOWN, never guessed', () => {
  const meta = SUPPLIERS.find((s) => s.supplier_id === 'megasport');
  const [r] = normalizeShopifyProduct(flJson, meta, NOW);
  assert.equal(r.sku, U); assert.equal(r.brand, U); assert.equal(r.barcode, U); assert.equal(r.stock, 'UNKNOWN'); assert.equal(r.product_type, U);
  assert.equal(r.shipping.status, 'UNKNOWN'); // 120 ILS < 300 threshold -> unpublished cost
});

test('adapters: Woo normalization (minor units, compare_at from regular price, brand UNKNOWN)', () => {
  const meta = SUPPLIERS.find((s) => s.supplier_id === 'arena');
  const [r] = normalizeWooProduct(woo, meta, NOW);
  assert.equal(r.price, 99); assert.equal(r.compare_at, 129); assert.equal(r.stock, 'AVAILABLE'); assert.equal(r.brand, U); assert.equal(r.size, 'L');
  assert.equal(r.shipping.status, 'UNKNOWN'); assert.equal(r.barcode, U);
});

test('adapters: Woo variable parent -> one record per variation, price/stock/SKU UNKNOWN until variation check', () => {
  const meta = SUPPLIERS.find((s) => s.supplier_id === 'arena');
  const parent = { id: 79886, name: 'Race suit', slug: 'race', parent: 0, type: 'variable', variation: '', permalink: 'https://www.arenaisrael.co.il/p/race', sku: '000812', brands: [],
    prices: { price: '450', regular_price: '550', currency_code: 'ILS', currency_minor_unit: 0 }, is_in_stock: true, is_purchasable: true,
    attributes: [{ name: 'צבעים', terms: [{ name: '503-BATMAN', slug: '503-batman' }] }, { name: 'מידות למוצר', terms: [{ name: '28', slug: '28-race' }] }],
    variations: [{ id: 79887, attributes: [{ name: 'צבעים', value: '503-batman' }, { name: 'מידות למוצר', value: '28-race' }] }] };
  const [r] = normalizeWooProduct(parent, meta, NOW);
  assert.equal(r.variant_id, '79887'); assert.equal(r.size, '28'); assert.equal(r.price, null); assert.equal(r.stock, 'UNKNOWN'); assert.equal(r.sku, U);
  assert.equal(r.needs_variation_check, true);
  // a simple product with currency_minor_unit 0
  const [s] = normalizeWooProduct({ ...parent, type: 'simple', variations: [] }, meta, NOW);
  assert.equal(s.price, 450); assert.equal(s.compare_at, 550); assert.equal(s.size, '28'); assert.equal(s.stock, 'AVAILABLE');
});

test('adapters: discover/live use injected fetch with GET only', async () => {
  const calls = [];
  const fetchImpl = async (url, init) => { calls.push([url, init?.method ?? 'GET']); return new Response(JSON.stringify(url.endsWith('.js') ? flJs : { products: [flJs] }), { status: 200 }); };
  const a = adapterFor('footlocker', { fetchImpl, now: () => NOW });
  assert.equal((await a.discover()).records.length, 2);
  assert.equal((await a.live('f098990100')).records[0].sku, 'VEE3BKA040');
  assert.ok(calls.every(([, m]) => m === 'GET'));
});

// ---------------- Duplicates ----------------
test('duplicates: EXACT on sku+size / barcode / supplier sku / shopify variant; LIKELY on brand+model or title; UNIQUE otherwise', () => {
  const items = [
    { id: 'a', sku: 'VEE3BKA040', size: '35', brand: 'VANS', title: 'U AUTHENTIC' },
    { id: 'b', sku: 'vee3bka040', size: '35', brand: 'VANS', title: 'U AUTHENTIC' },
    { id: 'c', barcode: '700053288836', title: 'p' }, { id: 'd', barcode: '700053288836', title: 'q' },
    { id: 'e', brand: 'Adidas', title: 'SAMBA OG KJ3785', size: '36' }, { id: 'f', brand: 'adidas', title: 'Samba og KJ3785 shoes', size: '36' },
    { id: 'g', sku: 'ZZZ', size: '1', title: 'unique thing' },
  ];
  const r = Object.fromEntries(findDuplicates(items).map((x) => [x.id, x.class]));
  assert.equal(r.a, DUP.EXACT); assert.equal(r.b, DUP.EXACT); assert.equal(r.c, DUP.EXACT); assert.equal(r.d, DUP.EXACT);
  assert.equal(r.e, DUP.LIKELY); assert.equal(r.f, DUP.LIKELY); assert.equal(r.g, DUP.UNIQUE);
  assert.equal(summarize(findDuplicates(items)).total, 7);
});

// ---------------- Pilot score ----------------
test('pilot: a stable, no-promo product outranks a higher-margin promo-dependent one', () => {
  const stable = pilotScore({ stock: 'AVAILABLE', shippingKnown: true, skuExact: true, priceChanges30d: 0, supplierPrice: 319.9, supplierCompareAt: null, brandVerified: true, marginPct: 9.7, net: 36, risk: 'LOW', sizesInStock: 16 });
  const promo = pilotScore({ stock: 'AVAILABLE', shippingKnown: true, skuExact: true, priceChanges30d: 0, supplierPrice: 215.4, supplierCompareAt: 359, brandVerified: true, marginPct: 17.2, net: 47.6, risk: 'LOW', sizesInStock: 3 });
  assert.ok(stable.score > promo.score, `${stable.score} vs ${promo.score}`);
  assert.equal(promo.promoDependent, true);
  assert.equal(pilotScore({ stock: 'UNKNOWN', shippingKnown: true, skuExact: true }).eligible, false);
});

// ---------------- Product quality ----------------
const goodListing = () => ({
  title: 'VANS U Authentic סניקרס', descriptionHtml: '<p>נעלי סניקרס VANS Authentic קלאסיות, גזרה נמוכה.</p>', images: ['https://cdn/x.jpg'],
  brand: 'VANS', vendor: 'VANS', productType: 'נעליים', collections: ['נעליים'], seo: { title: 'VANS U Authentic', description: 'נעלי VANS Authentic במשלוח חינם' },
  handle: 'vans-u-authentic', options: [{ name: 'מידה', values: ['35'] }],
  variants: [{ sku: 'VEE3BKA040', barcode: '700053288836', option1: '35', price: 373.9, compareAtPrice: null, inventoryPolicy: 'DENY', inventoryTracked: true, requiresShipping: true }],
});
const ctx = () => ({ supplierBrand: 'VANS', supplierSku: 'VEE3BKA040', supplierCompareAt: null, expectedPrice: 373.9, shipping: { status: 'VERIFIED', cost: 0 }, existingHandles: new Set() });

test('quality: the pilot listing passes every field check; auto-publish is never allowed', () => {
  const r = validateListingForPublish(goodListing(), ctx());
  assert.deepEqual(r.blocks, []); assert.equal(r.ok, true); assert.equal(r.autoPublishAllowed, false);
  assert.equal(gtinValid('700053288836'), true); assert.equal(gtinValid('700053288837'), false);
});

test('quality: each field failure blocks (incl. synthetic compare-at and BRAND_UNKNOWN)', () => {
  const cases = [
    [(l) => { l.title = ''; }, {}, 'TITLE_MISSING'],
    [(l) => { l.descriptionHtml = '<p></p>'; }, {}, 'DESCRIPTION_MISSING_OR_TOO_SHORT'],
    [(l) => { l.images = []; }, {}, 'IMAGES_MISSING'],
    [() => {}, { supplierBrand: 'SportPro' }, 'BRAND_UNKNOWN'],
    [() => {}, { supplierBrand: undefined }, 'BRAND_UNKNOWN'],
    [(l) => { l.vendor = 'SportPro'; }, {}, 'VENDOR_NOT_BRAND'],
    [(l) => { l.productType = 'shoes??'; }, {}, 'PRODUCT_TYPE_INVALID'],
    [(l) => { l.collections = []; }, {}, 'COLLECTION_MISSING'],
    [(l) => { l.variants[0].sku = 'OTHER'; }, {}, 'SKU_NOT_SUPPLIER_SKU'],
    [(l) => { l.variants[0].barcode = '123'; }, {}, 'BARCODE_INVALID'],
    [(l) => { l.options = [{ name: 'מידה', values: ['35', '35'] }]; }, {}, 'VARIANT_OPTIONS_INVALID'],
    [(l) => { l.variants[0].price = 380; }, {}, 'PRICE_NOT_SELLABLE_PRICE'],
    [(l) => { l.variants[0].compareAtPrice = 448.67; }, {}, 'COMPARE_AT_WITHOUT_REAL_REFERENCE'],
    [(l) => { l.variants[0].inventoryPolicy = 'CONTINUE'; }, {}, 'INVENTORY_POLICY_NOT_DENY'],
    [() => {}, { shipping: { status: 'UNKNOWN', cost: null } }, 'SHIPPING_UNKNOWN'],
    [(l) => { l.seo = { title: '', description: '' }; }, {}, 'SEO_TITLE_MISSING'],
    [(l) => { l.seo = { title: 'x', description: '' }; }, {}, 'SEO_DESCRIPTION_MISSING'],
    [(l) => { l.handle = 'Vans U Authentic'; }, {}, 'HANDLE_INVALID'],
    [() => {}, { existingHandles: new Set(['vans-u-authentic']) }, 'HANDLE_NOT_UNIQUE'],
  ];
  for (const [mut, cpatch, code] of cases) {
    const l = goodListing(); mut(l);
    const r = validateListingForPublish(l, { ...ctx(), ...cpatch });
    assert.equal(r.ok, false, code); assert.ok(r.blocks.includes(code), `${code}: ${r.blocks}`);
  }
  // a real supplier compare-at is allowed only when documented and above the price
  const l = goodListing(); l.variants[0].compareAtPrice = 449; l.variants[0].compareAtSource = 'supplier compare_at 2026-10-08';
  assert.equal(validateListingForPublish(l, { ...ctx(), supplierCompareAt: 449 }).ok, true);
});

// ---------------- Selection agent ----------------
const rec = (o = {}) => ({ supplier: 'footlocker', variant_id: '44817809080473', sku: 'VEE3BKA040', size: '35', title: 'U AUTHENTIC', brand: 'VANS', currency: 'ILS', url: 'u',
  barcode: '700053288836', shipping: { status: 'VERIFIED', cost: 0 }, sizesInStock: 16, sizesTotal: 16,
  live: { price: 319.9, stock: 'AVAILABLE', compare_at: null, checkedAt: '2026-10-08T09:30:00Z', variantExists: true }, ...o });
const shop = [{ variantId: 'v1', productId: 'p1', sku: 'VEE3BKA040', size: '35', price: 373.9, title: 'U AUTHENTIC' }];
const runAgent = (records, extra = {}) => runSelectionAgent({ records, shopify: shop, policy, now: NOW, killSwitch: '{"active":false}', target: stagingTarget(), ...extra });

test('agent: emits only CANDIDATE/AUTO_READY/REVIEW_REQUIRED/BLOCKED; output frozen; no publish capability', async () => {
  const out = runAgent([rec(), rec({ sku: 'NEW-SKU', variant_id: '9' }), rec({ variant_id: '5', size: '36', sku: 'X1', live: { ...rec().live, stock: 'UNAVAILABLE' } })]);
  for (const r of out) assert.ok(AGENT_STATUSES.includes(r.status));
  assert.ok(Object.isFrozen(out) && Object.isFrozen(out[0]));
  const mod = await import('../src/agents/selectionAgent.js');
  assert.deepEqual(Object.keys(mod).sort(), ['AGENT_STATUSES', 'STAGES', 'runSelectionAgent', 'summarizeAgent']);
  assert.ok(!AGENT_STATUSES.includes('PUBLISHED') && !AGENT_STATUSES.includes('APPROVED'));
});

test('agent: verified-supplier pilot -> AUTO_READY and SELLABLE; unverified supplier -> AUTO_READY but not SELLABLE', () => {
  const [a] = runAgent([rec()], { supplierVerified: { footlocker: true } });
  assert.equal(a.status, 'AUTO_READY'); assert.equal(a.sellable, true);
  const [b] = runAgent([rec()]);
  assert.equal(b.status, 'AUTO_READY'); assert.equal(b.sellable, false); assert.ok(b.reasons.includes('SUPPLIER_UNKNOWN'));
});

test('agent: stages map to statuses (no listing -> CANDIDATE, OOS/unknown shipping/markup -> BLOCKED, brand unknown -> REVIEW)', () => {
  const s = (o, extra) => runAgent([rec(o)], extra)[0];
  assert.equal(s({ sku: 'NOT-LISTED' }).status, 'CANDIDATE');
  assert.equal(s({ live: undefined }).status, 'CANDIDATE');
  assert.equal(s({ live: { ...rec().live, stock: 'UNAVAILABLE' } }).status, 'BLOCKED');
  assert.equal(s({ shipping: { status: 'UNKNOWN', cost: null } }).status, 'BLOCKED');
  assert.equal(s({ live: { ...rec().live, price: 250 } }).status, 'BLOCKED'); // markup > 35%
  assert.equal(s({ brand: 'SportPro' }).status, 'REVIEW_REQUIRED');
  assert.equal(s({}, { killSwitch: 'ON', supplierVerified: { footlocker: true } }).sellable, false);
  const sum = summarizeAgent(runAgent([rec(), rec({ sku: 'NOT-LISTED', barcode: '4006381333931', variant_id: '8', title: 'Other product' })]));
  assert.equal(sum.total, 2); assert.equal(sum.CANDIDATE, 1); assert.equal(sum.AUTO_READY, 1);
});

// ---------------- Profit simulator (offline tool) ----------------
test('profit simulator: pilot row computes fees/net/margin/markup; unknown facts -> SELLABLE=NO with reasons', async () => {
  const { simulateRow } = await import('../tools/profit_simulator.mjs');
  const a = simulateRow({ supplier: 'footlocker', sku: 'VEE3BKA040', cost: '319.9', shipping: '', selling_price: '373.9', stock: 'AVAILABLE', confidence: '1', risk_pass: 'true' }, { now: NOW });
  assert.equal(a.net_profit, 36.17); assert.equal(a.margin, 9.67); assert.equal(a.markup, 16.88); assert.equal(a.fees, 17.83); assert.equal(a.shipping, 0);
  assert.equal(a.SELLABLE, 'NO'); assert.equal(a.blocking, 'SUPPLIER_UNKNOWN'); // checkout not verified for any supplier yet
  const b = simulateRow({ supplier: 'megasport', sku: 'M1', cost: '500', selling_price: '700' }, { now: NOW });
  assert.equal(b.SELLABLE, 'NO'); assert.match(b.blocking, /SHIPPING_UNKNOWN/); assert.match(b.blocking, /STOCK_UNKNOWN/);
});
