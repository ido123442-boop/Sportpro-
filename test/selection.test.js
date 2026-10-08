import test from 'node:test';
import assert from 'node:assert/strict';
import { pricePolicy, selectionScore, tierFor, LEGACY_D1_TIERS } from '../src/core/selection.js';

test('tiers: legacy D1 bands by supplier cost', () => {
  assert.equal(tierFor(50).pct, 15);
  assert.equal(tierFor(100).pct, 13);
  assert.equal(tierFor(499.99).pct, 12);
  assert.equal(tierFor(500).pct, 10);
  assert.equal(tierFor(0), null);
  assert.equal(LEGACY_D1_TIERS.status, 'PENDING_OWNER_CONFIRMATION');
});

test('price policy: proposal is never final while tiers are pending', () => {
  const p = pricePolicy({ supplierCost: 215.4, shippingCost: 0 });
  assert.equal(p.status, 'PROPOSED_PENDING');
  assert.equal(p.final, false);
  assert.ok(p.price >= p.minPrice);
  assert.ok(p.markupPct <= 35);
  assert.ok(String(p.price).endsWith('.9'));
});

test('price policy: min profitable price wins over a tier price that is too low', () => {
  const p = pricePolicy({ supplierCost: 40, shippingCost: 14.9 }); // 15% tier would lose money
  assert.equal(p.status, 'PRICE_BLOCKED'); // min price needs > 35% markup on a 40 ILS item
  assert.equal(p.reason, 'EXCEEDS_MAX_MARKUP');
});

test('price policy: unknown cost/shipping -> PRICE_BLOCKED; market ceiling below min -> PRICE_BLOCKED', () => {
  assert.equal(pricePolicy({ supplierCost: null, shippingCost: 0 }).status, 'PRICE_BLOCKED');
  assert.equal(pricePolicy({ supplierCost: 200, shippingCost: null }).status, 'PRICE_BLOCKED');
  const m = pricePolicy({ supplierCost: 200, shippingCost: 0, marketCeiling: 205 });
  assert.equal(m.status, 'PRICE_BLOCKED'); assert.equal(m.reason, 'MIN_PRICE_ABOVE_MARKET');
});

const base = {
  stock: 'AVAILABLE', sizesInStock: 4, supplierPrice: 200, supplierCompareAt: null, priceChangedSinceScan: false,
  supplierImages: 5, shopifyMedia: 5, brand: 'Nike', sku: 'WB6181AYAAV340', skuDuplicate: false,
  mappingConfidence: 1, matchMethod: 'SKU_EXACT', shippingStatus: 'VERIFIED', net: 40, marginPct: 15, markupPct: 25,
};

test('selection: hard exclusions for UNKNOWN stock, unclear shipping, low confidence, duplicates, over-markup', () => {
  assert.equal(selectionScore({ ...base, stock: 'UNKNOWN' }).excluded, true);
  assert.equal(selectionScore({ ...base, shippingStatus: 'CONDITIONAL' }).excluded, true);
  assert.equal(selectionScore({ ...base, mappingConfidence: 0.89 }).excluded, true);
  assert.equal(selectionScore({ ...base, skuDuplicate: true }).excluded, true);
  assert.equal(selectionScore({ ...base, markupPct: 36 }).excluded, true);
  assert.equal(selectionScore({ ...base, net: 9 }).excluded, true);
});

test('selection: promotions, unstable price, missing images/brand, suspicious SKU are demoted', () => {
  const clean = selectionScore(base);
  assert.equal(clean.risk, 'LOW'); assert.deepEqual(clean.demotions, []);
  for (const [patch, tag] of [
    [{ supplierCompareAt: 250 }, 'SUPPLIER_PROMO_PRICE'],
    [{ supplierCompareAt: 400 }, 'EXTREME_SUPPLIER_DISCOUNT'],
    [{ priceChangedSinceScan: true }, 'UNSTABLE_PRICE'],
    [{ supplierImages: 0 }, 'MISSING_IMAGES'],
    [{ brand: '' }, 'MISSING_BRAND'],
    [{ sku: 'ab' }, 'SUSPICIOUS_SKU'],
    [{ net: 15 }, 'LOW_PROFIT'],
  ]) {
    const s = selectionScore({ ...base, ...patch });
    assert.ok(s.score < clean.score, tag);
    assert.ok(s.demotions.some((d) => d.startsWith(tag)), tag);
  }
});
