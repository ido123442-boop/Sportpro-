// Read-only supplier catalog scanner. GET requests only against public catalog feeds.
// Never touches carts, checkout, accounts or any write endpoint.
// Usage: node tools/scan_suppliers.mjs <outDir> [supplierKey ...]
import fs from 'node:fs';
import path from 'node:path';

export const SUPPLIERS = {
  megasport:    { domain: 'www.megasport.co.il',    type: 'shopify' },
  arosport:     { domain: 'www.arosport.co.il',     type: 'shopify' },
  bashgal:      { domain: 'www.bashgal.co.il',      type: 'shopify' },
  dugit:        { domain: 'www.dugit.co.il',        type: 'shopify' },
  energym:      { domain: 'www.energym.co.il',      type: 'shopify' },
  footlocker:   { domain: 'www.footlocker.co.il',   type: 'shopify' },
  arena:        { domain: 'www.arenaisrael.co.il',  type: 'woo' },
  sportstock:   { domain: 'www.sportstock.co.il',   type: 'woo' },
  bealion:      { domain: 'www.bealion.co.il',      type: 'woo' },
  championshop: { domain: 'www.championshop.co.il', type: 'woo' },
};

const UA = 'Mozilla/5.0 (compatible; SportproCatalogAudit/0.1; read-only)';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function getJson(url, tries = 4) {
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json' } });
      if (r.status === 429 || r.status >= 500) { await sleep(2000 * 2 ** i); continue; }
      if (!r.ok) return { status: r.status, body: null };
      return { status: r.status, body: await r.json(), headers: r.headers };
    } catch (e) { await sleep(2000 * 2 ** i); }
  }
  return { status: 0, body: null };
}

async function scanShopify(key, s, out) {
  let n = 0;
  for (let page = 1; page < 400; page++) {
    const { status, body } = await getJson(`https://${s.domain}/products.json?limit=250&page=${page}`);
    if (!body) return { ok: false, status, products: n, error: `page ${page} status ${status}` };
    const ps = body.products || [];
    if (!ps.length) break;
    for (const p of ps) out.write(JSON.stringify({ supplier: key, platform: 'shopify', fetched_at: new Date().toISOString(), p }) + '\n');
    n += ps.length;
    await sleep(700);
  }
  return { ok: true, products: n };
}

async function scanWoo(key, s, out) {
  let n = 0;
  for (let page = 1; page < 400; page++) {
    const { status, body } = await getJson(`https://${s.domain}/wp-json/wc/store/v1/products?per_page=100&page=${page}`);
    if (status === 400 && page > 1) break; // past last page
    if (!body) return { ok: false, status, products: n, error: `page ${page} status ${status}` };
    if (!body.length) break;
    for (const p of body) out.write(JSON.stringify({ supplier: key, platform: 'woo', fetched_at: new Date().toISOString(), p }) + '\n');
    n += body.length;
    await sleep(700);
  }
  return { ok: true, products: n };
}

async function main() {
  const outDir = process.argv[2];
  const keys = process.argv.slice(3).length ? process.argv.slice(3) : Object.keys(SUPPLIERS);
  fs.mkdirSync(outDir, { recursive: true });
  const results = await Promise.all(keys.map(async (k) => {
    const s = SUPPLIERS[k];
    const out = fs.createWriteStream(path.join(outDir, `${k}.jsonl`));
    const started = new Date().toISOString();
    const r = await (s.type === 'shopify' ? scanShopify : scanWoo)(k, s, out);
    out.end();
    return { supplier: k, ...s, started, finished: new Date().toISOString(), ...r };
  }));
  fs.writeFileSync(path.join(outDir, '_scan_summary.json'), JSON.stringify(results, null, 2));
  console.log(JSON.stringify(results, null, 1));
}
main();
