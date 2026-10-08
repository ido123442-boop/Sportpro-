// Product data quality for listings (brand, type, compare-at). Pure functions, no I/O.
// Rules (owner command 2026-10-08):
// - vendor/brand = the brand verified at the supplier; the store's own name is never a brand.
// - compare-at = only from real reference pricing (e.g. the supplier's own observed compare_at),
//   never synthetic (price x 1.2). No reference -> null.
// - product type from the supplier's category, through an explicit map; unknown -> blocked.

export const STORE_NAMES = Object.freeze(['sportpro', 'sport pro', 'ספורט פרו']);

export const PRODUCT_TYPE_MAP = Object.freeze({
  'נעליים': 'נעליים',
  'סניקרס': 'נעליים',
  'כפכפים': 'כפכפים',
  'ביגוד': 'ביגוד',
  'טייץ': 'ביגוד',
  'חולצות': 'ביגוד',
  'אביזרים': 'אביזרים',
});

const isStoreName = (v) => STORE_NAMES.includes(String(v ?? '').trim().toLowerCase());

export function verifiedBrand(supplierVendor) {
  const b = String(supplierVendor ?? '').trim();
  if (!b || isStoreName(b)) return null;
  return b;
}

/*
 input = {
   supplier: { code, vendor, productType, title, images: [url], compareAt, priceObservedAt },
   variant:  { sku, size, barcode },
   sellingPrice,
   referencePrice: { amount, source } | null   // a real, documented reference (never computed)
 }
 Returns { ok, blocks: [...], listing }
*/
export function buildStagingListing({ supplier = {}, variant = {}, sellingPrice, referencePrice = null }) {
  const blocks = [];
  const brand = verifiedBrand(supplier.vendor);
  if (!brand) blocks.push('BRAND_UNVERIFIED');
  const productType = PRODUCT_TYPE_MAP[String(supplier.productType ?? '').trim()] ?? null;
  if (!productType) blocks.push('PRODUCT_TYPE_UNMAPPED');
  if (!variant.sku) blocks.push('SKU_MISSING');
  if (!(sellingPrice > 0)) blocks.push('PRICE_INVALID');
  const images = Array.isArray(supplier.images) ? supplier.images.filter(Boolean) : [];
  if (!images.length) blocks.push('IMAGES_MISSING');

  let compareAtPrice = null;
  if (referencePrice && referencePrice.amount > sellingPrice && referencePrice.source) {
    compareAtPrice = referencePrice.amount;
  }
  const listing = {
    title: supplier.title ?? null,
    vendor: brand,
    productType,
    status: 'DRAFT',
    sku: variant.sku ?? null,
    barcode: variant.barcode ?? null,
    option: variant.size ?? null,
    price: sellingPrice,
    compareAtPrice,
    compareAtSource: compareAtPrice ? referencePrice.source : null,
    images,
    tags: supplier.code ? [`ספק:${supplier.code}`] : [],
  };
  return { ok: blocks.length === 0, blocks, listing };
}

// Read-only audit of an existing Shopify listing against the rules above.
export function auditListing({ vendor, price, compareAtPrice, supplierVendor, supplierCompareAt }) {
  const issues = [];
  if (!vendor || isStoreName(vendor)) issues.push('VENDOR_IS_STORE_NAME_OR_EMPTY');
  const brand = verifiedBrand(supplierVendor);
  if (brand && vendor && !isStoreName(vendor) && vendor.trim().toLowerCase() !== brand.toLowerCase()) issues.push('VENDOR_DIFFERS_FROM_SUPPLIER_BRAND');
  const p = Number(price), c = Number(compareAtPrice);
  if (c > 0) {
    const realRef = Number(supplierCompareAt) > 0 && Math.abs(Number(supplierCompareAt) - c) < 0.01;
    if (!realRef) {
      const ratio = p > 0 ? c / p : null;
      issues.push(ratio && Math.abs(ratio - 1.2) < 0.005 ? 'COMPARE_AT_SYNTHETIC_X1_2' : 'COMPARE_AT_WITHOUT_REFERENCE');
    }
  }
  return { ok: issues.length === 0, issues };
}

// ---------------- Pre-publish validator (Phase D) ----------------
// Every field is checked; any BLOCK prevents publication (and auto-publication is never allowed anyway).
const GTIN = /^(\d{8}|\d{12}|\d{13}|\d{14})$/;
export function gtinValid(code) {
  const s = String(code ?? '').trim();
  if (!GTIN.test(s)) return false;
  const d = s.split('').map(Number); const check = d.pop();
  const sum = d.reverse().reduce((a, x, i) => a + x * (i % 2 === 0 ? 3 : 1), 0);
  return (10 - (sum % 10)) % 10 === check;
}
const HANDLE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/*
 listing = { title, descriptionHtml, images:[url], brand, vendor, productType, collections:[...],
             seo:{ title, description }, handle, options:[{ name, values }],
             variants:[{ sku, barcode, option1, price, compareAtPrice, compareAtSource, inventoryPolicy, inventoryTracked, requiresShipping }] }
 ctx = { supplierBrand, supplierSku, supplierCompareAt, expectedPrice, shipping:{status,cost}, existingHandles:Set, knownCollections:Set|null }
*/
export function validateListingForPublish(listing = {}, ctx = {}) {
  const blocks = [], warnings = [];
  const B = (c) => blocks.push(c), W = (c) => warnings.push(c);
  const title = String(listing.title ?? '').trim();
  if (!title) B('TITLE_MISSING'); else if (title.length > 255) B('TITLE_TOO_LONG'); else if (isStoreName(title)) B('TITLE_IS_STORE_NAME');
  const desc = String(listing.descriptionHtml ?? '').replace(/<[^>]*>/g, ' ').trim();
  if (desc.length < 20) B('DESCRIPTION_MISSING_OR_TOO_SHORT');
  const imgs = (listing.images ?? []).filter((u) => /^https:\/\//.test(String(u)));
  if (!imgs.length) B('IMAGES_MISSING');
  const brand = verifiedBrand(ctx.supplierBrand);
  if (!brand) B('BRAND_UNKNOWN');
  else {
    if (String(listing.brand ?? listing.vendor ?? '').trim().toLowerCase() !== brand.toLowerCase()) B('BRAND_MISMATCH');
    if (String(listing.vendor ?? '').trim().toLowerCase() !== brand.toLowerCase()) B('VENDOR_NOT_BRAND');
  }
  if (!Object.values(PRODUCT_TYPE_MAP).includes(String(listing.productType ?? ''))) B('PRODUCT_TYPE_INVALID');
  const cols = listing.collections ?? [];
  if (!cols.length) B('COLLECTION_MISSING');
  else if (ctx.knownCollections && cols.some((c) => !ctx.knownCollections.has(c))) B('COLLECTION_UNKNOWN');
  const seoT = String(listing.seo?.title ?? '').trim(), seoD = String(listing.seo?.description ?? '').trim();
  if (!seoT) B('SEO_TITLE_MISSING'); else if (seoT.length > 70) W('SEO_TITLE_OVER_70');
  if (!seoD) B('SEO_DESCRIPTION_MISSING'); else if (seoD.length > 320) W('SEO_DESCRIPTION_OVER_320');
  const handle = String(listing.handle ?? '');
  if (!HANDLE.test(handle)) B('HANDLE_INVALID');
  else if (ctx.existingHandles?.has(handle)) B('HANDLE_NOT_UNIQUE');
  const opts = listing.options ?? [];
  if (!opts.length || opts.some((o) => !o.name || !Array.isArray(o.values) || !o.values.length || new Set(o.values).size !== o.values.length)) B('VARIANT_OPTIONS_INVALID');
  const vs = listing.variants ?? [];
  if (!vs.length) B('VARIANTS_MISSING');
  for (const v of vs) {
    if (!v.sku) B('SKU_MISSING');
    else if (ctx.supplierSku && String(v.sku).trim().toUpperCase() !== String(ctx.supplierSku).trim().toUpperCase()) B('SKU_NOT_SUPPLIER_SKU');
    if (v.barcode == null || v.barcode === '') W('BARCODE_MISSING'); else if (!gtinValid(v.barcode)) B('BARCODE_INVALID');
    if (!(Number(v.price) > 0)) B('PRICE_INVALID');
    else if (ctx.expectedPrice != null && Math.abs(Number(v.price) - Number(ctx.expectedPrice)) > 0.009) B('PRICE_NOT_SELLABLE_PRICE');
    if (v.compareAtPrice != null) {
      const real = ctx.supplierCompareAt != null && Math.abs(Number(ctx.supplierCompareAt) - Number(v.compareAtPrice)) < 0.01 && v.compareAtSource;
      if (!real) B('COMPARE_AT_WITHOUT_REAL_REFERENCE');
      else if (!(Number(v.compareAtPrice) > Number(v.price))) B('COMPARE_AT_NOT_ABOVE_PRICE');
    }
    if (v.inventoryPolicy !== 'DENY') B('INVENTORY_POLICY_NOT_DENY');
    if (v.inventoryTracked !== true) B('INVENTORY_NOT_TRACKED');
    if (v.requiresShipping !== true) B('REQUIRES_SHIPPING_FALSE');
  }
  if (!(ctx.shipping && (ctx.shipping.status === 'VERIFIED' || ctx.shipping.status === 'CONDITIONAL') && ctx.shipping.cost != null)) B('SHIPPING_UNKNOWN');
  return { ok: blocks.length === 0, blocks: [...new Set(blocks)], warnings: [...new Set(warnings)], autoPublishAllowed: false };
}
