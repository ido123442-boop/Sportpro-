import test from 'node:test';
import assert from 'node:assert/strict';
import { buildSupplierIndex, matchProduct, classifyConfidence, modelCodes } from '../src/core/match.js';

const sup = (products) => buildSupplierIndex(products.map((p, i) => ({ productId: `p${i}`, vendor: p.vendor ?? 'Nike', title: p.title, variants: p.variants.map((v, j) => ({ variantId: `p${i}v${j}`, sku: v.sku ?? null, barcode: v.barcode ?? null, options: v.options ?? [] })) })));
const shop = (title, variants, vendor = 'Nike') => ({ title, vendor, variants: variants.map((v, i) => ({ id: `s${i}`, sku: v.sku ?? null, barcode: v.barcode ?? null, options: v.options ?? [] })) });

test('confidence classes per spec', () => {
  assert.equal(classifyConfidence(1), 'AUTO_CANDIDATE');
  assert.equal(classifyConfidence(0.95), 'AUTO_CANDIDATE');
  assert.equal(classifyConfidence(0.949), 'HIGH_CONFIDENCE');
  assert.equal(classifyConfidence(0.90), 'HIGH_CONFIDENCE');
  assert.equal(classifyConfidence(0.899), 'MANUAL_REVIEW');
  assert.equal(classifyConfidence(0.75), 'MANUAL_REVIEW');
  assert.equal(classifyConfidence(0.74), 'REJECT');
  assert.equal(classifyConfidence(NaN), 'REJECT');
});

test('exact SKU -> AUTO_CANDIDATE 1.0', () => {
  const idx = sup([{ title: 'Air Max 90', variants: [{ sku: 'AB123-42', options: ['42'] }, { sku: 'AB123-43', options: ['43'] }] }]);
  const m = matchProduct(shop('נעלי ריצה Air Max 90', [{ sku: 'AB123-43', options: ['43'] }]), idx).get('s0');
  assert.equal(m.status, 'MATCHED'); assert.equal(m.method, 'SKU_EXACT'); assert.equal(m.cls, 'AUTO_CANDIDATE'); assert.equal(m.sv.variantId, 'p0v1');
});

test('barcode exact', () => {
  const idx = sup([{ title: 'X', variants: [{ sku: '3468337935148', options: ['55'] }] }]);
  const m = matchProduct(shop('Y', [{ barcode: '3468337935148', options: ['55'] }]), idx).get('s0');
  assert.equal(m.method, 'BARCODE_EXACT');
});

test('normalized SKU (spaces/dashes) -> 0.97', () => {
  const idx = sup([{ title: 'Tazz', variants: [{ sku: '1174471-DDC070', options: ['38'] }] }]);
  const m = matchProduct(shop('Tazz כפכפים', [{ sku: '1174471 DDC070', options: ['38'] }]), idx).get('s0');
  assert.equal(m.method, 'SKU_NORMALIZED'); assert.equal(m.confidence, 0.97);
});

test('SKU collision across supplier variants with same options -> AMBIGUOUS', () => {
  const idx = sup([{ title: 'A', variants: [{ sku: 'DUP', options: ['M'] }] }, { title: 'B', variants: [{ sku: 'DUP', options: ['M'] }] }]);
  const m = matchProduct(shop('A', [{ sku: 'DUP', options: ['M'] }]), idx).get('s0');
  assert.equal(m.status, 'AMBIGUOUS'); assert.equal(m.reason, 'AMBIGUOUS_SKU');
});

test('per-style supplier SKU narrowed by size', () => {
  const idx = sup([{ title: 'Tee', variants: [{ sku: 'STYLE1', options: ['S'] }, { sku: 'STYLE1', options: ['M'] }] }]);
  const m = matchProduct(shop('Tee', [{ sku: 'STYLE1', options: ['M'] }]), idx).get('s0');
  assert.equal(m.status, 'MATCHED'); assert.equal(m.sv.variantId, 'p0v1');
});

test('SKU with contradicting size -> CONFLICT', () => {
  const idx = sup([{ title: 'Tee', variants: [{ sku: 'ONLY1', options: ['S'] }] }]);
  const m = matchProduct(shop('Tee', [{ sku: 'ONLY1', options: ['XL'] }]), idx).get('s0');
  assert.equal(m.status, 'CONFLICT');
});

test('brand + model + exact size + color -> 0.95; brand mismatch blocks model method', () => {
  const idx = sup([{ title: 'Hoka Challenger 8 1168717/BKGD', vendor: 'Hoka', variants: [{ options: ['40', 'Black'] }, { options: ['41', 'Black'] }] }]);
  const m = matchProduct(shop('נעלי ריצת שטח Hoka 1168717 שחור', [{ options: ['41', 'black'] }], 'Hoka'), idx).get('s0');
  assert.equal(m.method, 'BRAND_MODEL_SIZE_COLOR'); assert.equal(m.confidence, 0.95);
  const m2 = matchProduct(shop('Hoka 1168717', [{ options: ['41', 'black'] }], 'Asics'), idx).get('s0');
  assert.notEqual(m2.method, 'BRAND_MODEL_SIZE_COLOR');
});

test('brand + model + size only (supplier has extra color dimension) -> 0.92 HIGH_CONFIDENCE', () => {
  const idx = sup([{ title: 'Shirt GH0432', vendor: 'Reebok', variants: [{ options: ['M', 'Red'] }] }]);
  const m = matchProduct(shop('חולצה GH0432', [{ options: ['M'] }], 'Reebok'), idx).get('s0');
  assert.equal(m.method, 'BRAND_MODEL_SIZE'); assert.equal(m.cls, 'HIGH_CONFIDENCE');
});

test('normalized title + exact options -> 0.93 HIGH_CONFIDENCE (title is not an identifier)', () => {
  const idx = sup([{ title: 'כובע צמר Reebok TE BEANIE', vendor: null, variants: [{ options: ['S'] }, { options: ['M'] }] }]);
  const m = matchProduct(shop('כובע צמר  Reebok TE-BEANIE', [{ options: ['M'] }]), idx).get('s0');
  assert.equal(m.method, 'TITLE_EXACT_OPTIONS'); assert.equal(m.cls, 'HIGH_CONFIDENCE');
});

test('compatible size mapping (2XL vs XXL) capped at MANUAL_REVIEW', () => {
  const idx = sup([{ title: 'Jacket', variants: [{ options: ['XXL'] }, { options: ['L'] }] }]);
  const m = matchProduct(shop('Jacket', [{ options: ['2XL'] }]), idx).get('s0');
  assert.equal(m.method, 'COMPATIBLE_SIZE'); assert.equal(m.cls, 'MANUAL_REVIEW');
});

test('fuzzy title never reaches HIGH_CONFIDENCE', () => {
  const idx = sup([{ title: 'Adidas Ultraboost Light Running Shoe Black', variants: [{ options: ['42'] }] }, { title: 'Totally different socks', variants: [{ options: ['42'] }] }]);
  const m = matchProduct(shop('Adidas Ultraboost Light Running Shoe', [{ options: ['42'] }], 'Nike'), idx).get('s0');
  assert.equal(m.method, 'FUZZY_TITLE');
  assert.ok(m.confidence < 0.9);
  assert.ok(['MANUAL_REVIEW', 'REJECT'].includes(m.cls));
});

test('size not offered by supplier -> NONE with explicit reason', () => {
  const idx = sup([{ title: 'Tee', variants: [{ options: ['S'] }, { options: ['M'] }] }]);
  const m = matchProduct(shop('Tee', [{ options: ['XXL'] }]), idx).get('s0');
  assert.equal(m.status, 'NONE'); assert.equal(m.reason, 'OPTION_NOT_OFFERED_BY_SUPPLIER');
});

test('two supplier products with same title -> AMBIGUOUS_PRODUCT', () => {
  const idx = sup([{ title: 'Ball', variants: [{ options: [] }] }, { title: 'Ball', variants: [{ options: [] }] }]);
  assert.equal(matchProduct(shop('Ball', [{ options: ['Default Title'] }]), idx).get('s0').reason, 'AMBIGUOUS_PRODUCT');
});

test('model codes ignore years, sizes and units', () => {
  const m = modelCodes('Head SPEED PRO 2025 500ml 42 GH0432 1168717/BKGD');
  assert.ok(m.has('GH0432')); assert.ok(m.has('1168717'));
  assert.ok(!m.has('2025')); assert.ok(!m.has('500ML')); assert.ok(!m.has('42'));
});
