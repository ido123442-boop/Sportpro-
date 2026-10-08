import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { buildStagingListing, auditListing, verifiedBrand } from '../src/core/productData.js';

const pilot = {
  supplier: { code: 'footlocker', vendor: 'VANS', productType: 'נעליים', title: 'U AUTHENTIC סניקרס', images: ['a.jpg', 'b.jpg'], compareAt: null },
  variant: { sku: 'VEE3BKA040', size: '35', barcode: '700053288836' },
  sellingPrice: 373.9,
};

test('brand: the store name is never a brand', () => {
  assert.equal(verifiedBrand('VANS'), 'VANS');
  for (const v of ['SportPro', 'sportpro', ' ספורט פרו ', '', null]) assert.equal(verifiedBrand(v), null);
});

test('pilot listing: vendor = verified supplier brand, DRAFT, no synthetic compare-at', () => {
  const r = buildStagingListing(pilot);
  assert.equal(r.ok, true, r.blocks.join());
  assert.equal(r.listing.vendor, 'VANS');
  assert.equal(r.listing.status, 'DRAFT');
  assert.equal(r.listing.productType, 'נעליים');
  assert.equal(r.listing.compareAtPrice, null);
  assert.equal(r.listing.sku, 'VEE3BKA040');
});

test('compare-at only from a real documented reference above the selling price', () => {
  assert.equal(buildStagingListing({ ...pilot, referencePrice: { amount: 448.67, source: null } }).listing.compareAtPrice, null);
  assert.equal(buildStagingListing({ ...pilot, referencePrice: { amount: 300, source: 'supplier compare_at' } }).listing.compareAtPrice, null);
  const r = buildStagingListing({ ...pilot, referencePrice: { amount: 449, source: 'supplier compare_at 2026-10-08' } });
  assert.equal(r.listing.compareAtPrice, 449); assert.match(r.listing.compareAtSource, /supplier/);
});

test('blocks: unverified brand, unmapped type, missing images/SKU', () => {
  const r = buildStagingListing({ ...pilot, supplier: { ...pilot.supplier, vendor: 'SportPro', productType: '???', images: [] }, variant: {} });
  assert.equal(r.ok, false);
  for (const b of ['BRAND_UNVERIFIED', 'PRODUCT_TYPE_UNMAPPED', 'IMAGES_MISSING', 'SKU_MISSING']) assert.ok(r.blocks.includes(b), b);
});

test('audit of current production data (read-only values from 2026-10-08) flags vendor and synthetic compare-at', () => {
  const a = auditListing({ vendor: 'SportPro', price: '373.89', compareAtPrice: '448.67', supplierVendor: 'VANS', supplierCompareAt: null });
  assert.deepEqual(a.issues, ['VENDOR_IS_STORE_NAME_OR_EMPTY', 'COMPARE_AT_SYNTHETIC_X1_2']);
  assert.equal(auditListing({ vendor: 'VANS', price: 373.89, compareAtPrice: null, supplierVendor: 'VANS' }).ok, true);
  assert.deepEqual(auditListing({ vendor: 'Adidas', price: 550, compareAtPrice: null, supplierVendor: 'VANS' }).issues, ['VENDOR_DIFFERS_FROM_SUPPLIER_BRAND']);
});

test('staging seed applies cleanly to the legacy schema and activates nothing', () => {
  const db = new DatabaseSync(':memory:');
  db.exec(fs.readFileSync(new URL('../worker/schema/legacy_staging_schema.sql', import.meta.url), 'utf8'));
  const seed = fs.readFileSync(new URL('../staging/seed/0001_footlocker.sql', import.meta.url), 'utf8');
  db.exec(seed); db.exec(seed); // idempotent
  const s = db.prepare("SELECT * FROM suppliers WHERE code = 'footlocker'").all();
  assert.equal(s.length, 1); assert.equal(s[0].status, 'REVIEW_REQUIRED');
  const v = db.prepare('SELECT * FROM supplier_variants').all();
  assert.equal(v.length, 1); assert.equal(v[0].sku, 'VEE3BKA040'); assert.equal(v[0].brand, 'VANS'); assert.equal(v[0].stock, null);
  assert.equal(db.prepare('SELECT COUNT(*) n FROM product_mappings').get().n, 0, 'no mapping is created by the seed');
  assert.equal(db.prepare('SELECT active FROM supplier_products').get().active, 0);
});

test('pricing policy is PENDING_APPROVAL with the proposed tiers and 35% cap', () => {
  const p = JSON.parse(fs.readFileSync(new URL('../config/pricing_policy.json', import.meta.url), 'utf8'));
  assert.equal(p.PRICING_POLICY_STATUS, 'PENDING_APPROVAL');
  assert.equal(p.max_markup_pct, 35);
  assert.deepEqual(p.markup_tiers.proposed_bands.map((b) => b.markup_target_pct), [15, 13, 12, 10]);
  assert.equal(p.approval.approved_by, null);
});
