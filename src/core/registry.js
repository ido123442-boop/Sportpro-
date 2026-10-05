// Supplier Registry. Facts only; anything not verified is 'UNKNOWN'.
// `status` lifecycle: CANDIDATE -> CATALOG_OK -> SHIPPING_OK -> CHECKOUT_VERIFIED (only after a real pilot order) | BLOCKED
// Evidence date for every 'verified' field: 2026-10-04 (read-only audit).
const U = 'UNKNOWN';
const shopifyFeed = (d) => ({
  catalog_method: 'SHOPIFY_PUBLIC_JSON', catalog_url: `https://${d}/products.json`,
  product_feed: `https://${d}/products.json?limit=250&page=N`, variant_feed: `https://${d}/products/{handle}.js`,
  price_available: true, stock_available: true, stock_granularity: 'VARIANT_BOOLEAN',
  barcode_available: false, size_available: true, color_available: true,
  checkout_method: 'SHOPIFY_STOREFRONT_CART (manual, not automated)',
});
const wooFeed = (d) => ({
  catalog_method: 'WOOCOMMERCE_STORE_API', catalog_url: `https://${d}/wp-json/wc/store/v1/products`,
  product_feed: `https://${d}/wp-json/wc/store/v1/products?per_page=100&page=N`, variant_feed: `https://${d}/wp-json/wc/store/v1/products/{variation_id}`,
  price_available: true, stock_available: true, stock_granularity: 'VARIANT_BOOLEAN (via per-variation request)',
  barcode_available: 'PARTIAL (some variation SKUs are EAN-13)', size_available: true, color_available: true,
  checkout_method: 'WOOCOMMERCE_CART (manual, not automated)',
});
const none = { catalog_method: 'NONE', catalog_url: U, product_feed: U, variant_feed: U, price_available: U, stock_available: U, stock_granularity: U, barcode_available: U, size_available: U, color_available: U, checkout_method: U };

export const SUPPLIERS = Object.freeze([
  { supplier_id: 'megasport', supplier_name: 'MegaSport', domain: 'www.megasport.co.il', ...shopifyFeed('www.megasport.co.il'), sku_available: true,
    shipping_policy: 'Free ≥300₪ on apparel/footwear; other cases not published', shipping_source: 'site banner (policy page empty)', shipping_verified_at: '2026-10-04', shipping_status: 'CONDITIONAL',
    checkout_verified: false, status: 'CATALOG_OK', documented: true, risk_level: 'MEDIUM (shipping below threshold unknown)' },
  { supplier_id: 'arosport', supplier_name: 'AroSport', domain: 'www.arosport.co.il', ...shopifyFeed('www.arosport.co.il'), sku_available: true,
    shipping_policy: 'Courier 29₪ flat; self pickup free', shipping_source: 'https://www.arosport.co.il/policies/shipping-policy', shipping_verified_at: '2026-10-04', shipping_status: 'VERIFIED',
    checkout_verified: false, status: 'SHIPPING_OK', documented: true, risk_level: 'MEDIUM (Shopify variant grid does not mirror supplier sizes)' },
  { supplier_id: 'bashgal', supplier_name: 'BashGal', domain: 'www.bashgal.co.il', ...shopifyFeed('www.bashgal.co.il'), sku_available: true,
    shipping_policy: 'Home 35₪ ≤20kg; pickup 19₪ ≤5kg; oversize varies', shipping_source: 'https://www.bashgal.co.il/policies/shipping-policy', shipping_verified_at: '2026-10-04', shipping_status: 'CONDITIONAL',
    checkout_verified: false, status: 'SHIPPING_OK', documented: true, risk_level: 'MEDIUM (oversize items)' },
  { supplier_id: 'dugit', supplier_name: 'Dugit', domain: 'www.dugit.co.il', ...shopifyFeed('www.dugit.co.il'), sku_available: true,
    shipping_policy: '30₪; free >250₪', shipping_source: 'https://www.dugit.co.il/policies/shipping-policy', shipping_verified_at: '2026-10-04', shipping_status: 'VERIFIED',
    checkout_verified: false, status: 'SHIPPING_OK', documented: true, risk_level: 'MEDIUM (UK vs EU sizes)' },
  { supplier_id: 'energym', supplier_name: 'EnergyM', domain: 'www.energym.co.il', ...shopifyFeed('www.energym.co.il'), sku_available: true,
    shipping_policy: 'Home 35₪ ≤20kg; pickup 19₪ ≤5kg; oversize varies (text identical to BashGal)', shipping_source: 'https://www.energym.co.il/policies/shipping-policy', shipping_verified_at: '2026-10-04', shipping_status: 'CONDITIONAL',
    checkout_verified: false, status: 'SHIPPING_OK', documented: true, risk_level: 'MEDIUM (oversize items)' },
  { supplier_id: 'arena', supplier_name: 'Arena Israel', domain: 'www.arenaisrael.co.il', ...wooFeed('www.arenaisrael.co.il'), sku_available: 'VARIATION_LEVEL',
    shipping_policy: U, shipping_source: U, shipping_verified_at: U, shipping_status: 'UNKNOWN',
    checkout_verified: false, status: 'CATALOG_OK', documented: true, risk_level: 'HIGH (shipping unknown; backorder items)' },
  { supplier_id: 'sportstock', supplier_name: 'SportStock', domain: 'www.sportstock.co.il', ...wooFeed('www.sportstock.co.il'), sku_available: true,
    shipping_policy: '"calculated at order"', shipping_source: 'homepage text', shipping_verified_at: U, shipping_status: 'UNKNOWN',
    checkout_verified: false, status: 'CATALOG_OK', documented: true, risk_level: 'HIGH (shipping unknown)' },
  { supplier_id: 'kdhockey', supplier_name: 'KDHockey', domain: 'kdhockey.com', ...none, sku_available: U,
    shipping_policy: U, shipping_source: U, shipping_verified_at: U, shipping_status: 'UNKNOWN',
    checkout_verified: false, status: 'BLOCKED', documented: true, risk_level: 'BLOCKED (Wix; no public catalog feed)' },
  { supplier_id: 'decathlon', supplier_name: 'Decathlon Israel', domain: 'www.decathlon.co.il', ...none, sku_available: U,
    shipping_policy: U, shipping_source: U, shipping_verified_at: U, shipping_status: 'UNKNOWN',
    checkout_verified: false, status: 'BLOCKED', documented: true, risk_level: 'BLOCKED (no public catalog feed)' },
  { supplier_id: 'footlocker', supplier_name: 'Foot Locker Israel', domain: 'www.footlocker.co.il', ...shopifyFeed('www.footlocker.co.il'), sku_available: true,
    shipping_policy: 'Free ≥199₪; else 14.90₪', shipping_source: 'https://www.footlocker.co.il/policies/shipping-policy', shipping_verified_at: '2026-10-04', shipping_status: 'VERIFIED',
    checkout_verified: false, status: 'SHIPPING_OK', documented: false, risk_level: 'LOW-MEDIUM (best SKU coverage; undocumented supplier)' },
  { supplier_id: 'bealion', supplier_name: 'Bealion', domain: 'www.bealion.co.il', ...wooFeed('www.bealion.co.il'), sku_available: 'VARIATION_LEVEL',
    shipping_policy: 'Free >249₪; below not published', shipping_source: 'homepage banner', shipping_verified_at: '2026-10-04', shipping_status: 'CONDITIONAL',
    checkout_verified: false, status: 'CATALOG_OK', documented: false, risk_level: 'HIGH (shipping below threshold unknown)' },
  { supplier_id: 'championshop', supplier_name: 'Champion Sport', domain: 'www.championshop.co.il', ...wooFeed('www.championshop.co.il'), sku_available: 'PARTIAL',
    shipping_policy: U, shipping_source: U, shipping_verified_at: U, shipping_status: 'UNKNOWN',
    checkout_verified: false, status: 'CATALOG_OK', documented: false, risk_level: 'HIGH (shipping unknown)' },
].map((s) => Object.freeze({ freshness_ttl_hours: 24, last_scan_at: null, ...s })));

export const supplierById = (id) => SUPPLIERS.find((s) => s.supplier_id === id) ?? null;

// Shopify tag values that are not suppliers we can onboard.
export const NON_SUPPLIER_TAGS = Object.freeze({
  'לא זוהה': 'SUPPLIER_UNIDENTIFIED',
  'יבוא אישי': 'PERSONAL_IMPORT_NO_SUPPLIER',
  'Titleist Direct (יבוא אישי)': 'PERSONAL_IMPORT_NO_SUPPLIER',
  sportpro: 'OWN_BRAND_SOURCE_UNKNOWN',
});
