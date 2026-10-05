// Live verification of candidate supplier variants (GET only, rate-limited).
// Shopify-platform suppliers: GET https://<domain>/products/<handle>.js  (per product, all variants)
// WooCommerce suppliers:     GET https://<domain>/wp-json/wc/store/v1/products/<variation_id>
// Input: JSON array [{ supplier, platform, domain, handle, productId, variantIds:[...] }]
// Output: JSONL, one verification_run row per supplier variant.
// Usage: node tools/live_verify.mjs <candidates.json> <out.jsonl>
import fs from 'node:fs';
import { wooStock, shopifyStock } from '../src/core/stock.js';

const [inFile, outFile] = process.argv.slice(2);
const UA = 'Mozilla/5.0 (compatible; SportproLiveVerify/0.1; read-only)';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function get(url) {
  for (let i = 0; i < 4; i++) {
    try {
      const r = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json' } });
      if (r.status === 429 || r.status >= 500) { await sleep(2000 * 2 ** i); continue; }
      return { status: r.status, body: r.ok ? await r.json() : null };
    } catch { await sleep(2000 * 2 ** i); }
  }
  return { status: 0, body: null };
}

const cands = JSON.parse(fs.readFileSync(inFile, 'utf8'));
const out = fs.createWriteStream(outFile);
const bySupplier = new Map();
for (const c of cands) { if (!bySupplier.has(c.supplier)) bySupplier.set(c.supplier, []); bySupplier.get(c.supplier).push(c); }

let n = 0;
await Promise.all([...bySupplier.values()].map(async (list) => {
  for (const c of list) {
    const checkedAt = () => new Date().toISOString();
    if (c.platform === 'shopify') {
      const url = `https://${c.domain}/products/${encodeURIComponent(c.handle)}.js`;
      const { status, body } = await get(url);
      for (const vid of c.variantIds) {
        const v = body?.variants?.find((x) => String(x.id) === String(vid));
        out.write(JSON.stringify({ supplier: c.supplier, supplier_variant_id: String(vid), url, http_status: status, url_ok: status === 200,
          variant_exists: Boolean(v), stock: v ? shopifyStock(v.available) : 'UNKNOWN',
          price: v ? v.price / 100 : null, currency: v ? 'ILS' : null, // shop currency; storefront Shopify.currency={"active":"ILS","rate":"1.0"} verified 2026-10-04 for all 6 Shopify suppliers
          sku: v?.sku ?? null, options: v ? [v.option1, v.option2, v.option3].filter((x) => x != null) : null, checked_at: checkedAt(), method: 'SHOPIFY_PRODUCT_JS' }) + '\n');
        n++;
      }
      await sleep(500);
    } else {
      for (const vid of c.variantIds) {
        const url = `https://${c.domain}/wp-json/wc/store/v1/products/${vid}`;
        const { status, body } = await get(url);
        const minor = body?.prices?.currency_minor_unit ?? 2;
        out.write(JSON.stringify({ supplier: c.supplier, supplier_variant_id: String(vid), url, http_status: status, url_ok: status === 200,
          variant_exists: Boolean(body), stock: body ? wooStock(body) : 'UNKNOWN', price: body?.prices?.price ? Number(body.prices.price) / 10 ** minor : null,
          currency: body?.prices?.currency_code ?? null, sku: body?.sku ?? null, options: null, checked_at: checkedAt(), method: 'WOO_STORE_API_VARIATION' }) + '\n');
        n++;
        await sleep(400);
      }
    }
  }
}));
out.end();
console.log(JSON.stringify({ verified_variants: n, suppliers: [...bySupplier.keys()] }));
