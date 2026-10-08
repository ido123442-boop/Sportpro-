// Uniform supplier adapter layer. Each adapter turns a supplier's public JSON into the same record:
// { supplier, product_id, variant_id, handle, title, sku, barcode, options, size, price, compare_at,
//   currency, stock, shipping, brand, product_type, images, url, last_checked, reliability }
// Missing facts are the string 'UNKNOWN' (or null for numbers) — never guessed.
// Network access is injected (fetchImpl) so normalization is testable offline. GET only.
import { SUPPLIERS } from '../core/registry.js';
import { shopifyStock, wooStock } from '../core/stock.js';
import { shippingFor } from '../core/shipping.js';

export const U = 'UNKNOWN';
export const ADAPTER_SUPPLIERS = Object.freeze(['footlocker', 'arosport', 'bashgal', 'dugit', 'megasport', 'energym', 'arena', 'sportstock']);

const reliabilityOf = (meta) => ({ status: meta.status, checkout_verified: meta.checkout_verified === true, risk: meta.risk_level, measured: U });
const nonEmpty = (v) => (v === null || v === undefined || String(v).trim() === '' ? U : String(v).trim());
const division = (tags) => { const t = (Array.isArray(tags) ? tags : String(tags ?? '').split(',')).map((x) => String(x).trim()).find((x) => /^DIVISION:/i.test(x)); return t ? t.split(':')[1] : null; };

// Shopify: accepts both /products.json items (price "319.90") and /products/{handle}.js (price 31990).
export function normalizeShopifyProduct(p, meta, checkedAt) {
  if (!p || !Array.isArray(p.variants)) return [];
  const isJs = typeof p.variants[0]?.price === 'number';
  const money = (v) => (v === null || v === undefined || v === '' ? null : isJs ? Number(v) / 100 : Number(v));
  const images = (p.images ?? []).map((i) => (typeof i === 'string' ? i : i?.src)).filter(Boolean).map((s) => (s.startsWith('//') ? `https:${s}` : s));
  const optionNames = (p.options ?? []).map((o) => (typeof o === 'string' ? o : o?.name));
  const sizeIdx = optionNames.findIndex((n) => /size|מידה/i.test(String(n ?? '')));
  return p.variants.map((v) => {
    const options = [v.option1, v.option2, v.option3].filter((x) => x != null);
    const price = money(v.price);
    return Object.freeze({
      supplier: meta.supplier_id, product_id: String(p.id), variant_id: String(v.id), handle: p.handle ?? U,
      title: nonEmpty(p.title), sku: nonEmpty(v.sku), barcode: isJs ? nonEmpty(v.barcode) : U,
      options, size: sizeIdx >= 0 ? nonEmpty(options[sizeIdx]) : U,
      price: price > 0 ? price : null, compare_at: money(v.compare_at_price) > 0 ? money(v.compare_at_price) : null,
      currency: 'ILS', stock: shopifyStock(v.available),
      shipping: price > 0 ? shippingFor(meta.supplier_id, { unitCost: price, grams: v.grams, division: division(p.tags) }) : { status: U, cost: null },
      brand: nonEmpty(p.vendor), product_type: nonEmpty(p.product_type ?? p.type), images,
      url: p.handle ? `https://${meta.domain}/products/${p.handle}` : U, last_checked: checkedAt, reliability: reliabilityOf(meta),
    });
  });
}

// WooCommerce Store API.
//  - variable parent product (type "variable"): one record per variation; price/stock/SKU are UNKNOWN
//    until the per-variation live check (/products/{variation_id}) — parent prices are ranges, never per size.
//  - simple product or a single variation object: one fully-priced record.
const SIZE_ATTR = /size|מיד/i;
export function normalizeWooProduct(p, meta, checkedAt) {
  if (!p || p.id == null) return [];
  const minor = p.prices?.currency_minor_unit ?? 2;
  const money = (v) => (v === null || v === undefined || v === '' ? null : Number(v) / 10 ** minor);
  const brand = Array.isArray(p.brands) && p.brands[0]?.name ? p.brands[0].name : U;
  const images = (p.images ?? []).map((i) => i?.src).filter(Boolean);
  const attrs = Array.isArray(p.attributes) ? p.attributes : [];
  const termName = (attrName, slug) => attrs.find((a) => a.name === attrName)?.terms?.find((t) => t.slug === slug)?.name ?? slug;
  const common = { supplier: meta.supplier_id, handle: p.slug ?? U, title: nonEmpty(p.name), barcode: U, brand, product_type: U, images, url: nonEmpty(p.permalink), last_checked: checkedAt, reliability: reliabilityOf(meta) };
  if (p.type === 'variable' && Array.isArray(p.variations) && p.variations.length) {
    return p.variations.map((v) => {
      const sa = (v.attributes ?? []).find((a) => SIZE_ATTR.test(String(a.name ?? '')));
      const size = sa ? termName(sa.name, sa.value) : null;
      return Object.freeze({ ...common, product_id: String(p.id), variant_id: String(v.id), sku: U, options: (v.attributes ?? []).map((a) => termName(a.name, a.value)), size: nonEmpty(size),
        price: null, compare_at: null, currency: p.prices?.currency_code ?? U, stock: 'UNKNOWN', shipping: { status: U, cost: null, rule: 'PRICE_UNKNOWN_UNTIL_VARIATION_CHECK' }, needs_variation_check: true });
    });
  }
  const price = money(p.prices?.price);
  const regular = money(p.prices?.regular_price);
  const varAttrs = Array.isArray(p.variation) ? p.variation : [];
  const sizeFromVariation = varAttrs.find((a) => SIZE_ATTR.test(String(a.attribute ?? a.name ?? '')))?.value;
  const sizeFromAttrs = attrs.find((a) => SIZE_ATTR.test(String(a.name ?? '')) && a.terms?.length === 1)?.terms?.[0]?.name;
  const size = sizeFromVariation ?? sizeFromAttrs ?? null;
  return [Object.freeze({
    ...common, product_id: String(p.parent || p.id), variant_id: String(p.id), sku: nonEmpty(p.sku), options: size ? [size] : [], size: nonEmpty(size),
    price: price > 0 ? price : null, compare_at: regular > price ? regular : null,
    currency: p.prices?.currency_code ?? U, stock: wooStock(p),
    shipping: price > 0 ? shippingFor(meta.supplier_id, { unitCost: price }) : { status: U, cost: null },
  })];
}

const UA = 'Mozilla/5.0 (compatible; SportproSupplierAdapter/0.2; read-only)';
async function getJson(fetchImpl, url) {
  const r = await fetchImpl(url, { headers: { 'User-Agent': UA, Accept: 'application/json' } });
  if (!r.ok) return { status: r.status, body: null };
  return { status: r.status, body: await r.json() };
}

export function adapterFor(supplierId, { fetchImpl = globalThis.fetch, now = () => new Date().toISOString() } = {}) {
  const meta = SUPPLIERS.find((s) => s.supplier_id === supplierId);
  if (!meta || !ADAPTER_SUPPLIERS.includes(supplierId)) throw new Error(`no_adapter:${supplierId}`);
  const shopify = meta.catalog_method === 'SHOPIFY_PUBLIC_JSON';
  return Object.freeze({
    supplier: supplierId, platform: shopify ? 'shopify' : 'woocommerce', meta,
    // discovery: one page of the public catalog
    async discover({ page = 1, limit = shopify ? 250 : 100 } = {}) {
      const url = shopify ? `https://${meta.domain}/products.json?limit=${limit}&page=${page}` : `https://${meta.domain}/wp-json/wc/store/v1/products?per_page=${limit}&page=${page}`;
      const { status, body } = await getJson(fetchImpl, url);
      const list = shopify ? body?.products ?? [] : Array.isArray(body) ? body : [];
      const at = now();
      return { status, records: list.flatMap((p) => (shopify ? normalizeShopifyProduct(p, meta, at) : normalizeWooProduct(p, meta, at))) };
    },
    // live check of one product (Shopify: handle; Woo: product or variation id)
    async live(ref) {
      const url = shopify ? `https://${meta.domain}/products/${encodeURIComponent(ref)}.js` : `https://${meta.domain}/wp-json/wc/store/v1/products/${encodeURIComponent(ref)}`;
      const { status, body } = await getJson(fetchImpl, url);
      const at = now();
      return { status, records: body ? (shopify ? normalizeShopifyProduct(body, meta, at) : normalizeWooProduct(body, meta, at)) : [] };
    },
  });
}
