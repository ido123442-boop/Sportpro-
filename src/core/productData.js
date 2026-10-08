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
