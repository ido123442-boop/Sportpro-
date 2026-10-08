// Pipeline dashboard (read-only). Runs the Selection Agent over a live-verification file + the classified
// catalog snapshot and renders a static HTML page (gitignored: dashboard/*.html).
// Usage: node tools/pipeline_dashboard.mjs <live.jsonl> <variants_classified.csv> <out.html> [--facts '{"approved":0,"published":0}']
import fs from 'node:fs';
import { runSelectionAgent, summarizeAgent } from '../src/agents/selectionAgent.js';
import { loadPolicy } from '../src/core/pricingEngine.js';
import { shippingFor } from '../src/core/shipping.js';
import { readCsv } from './lib_csv.mjs';

const args = process.argv.slice(2);
const fi = args.indexOf('--facts');
const facts = fi >= 0 ? JSON.parse(args[fi + 1]) : {};
const [liveFile, csvFile, outFile] = args.filter((a, i) => !a.startsWith('--') && (fi < 0 || i !== fi + 1));
const live = fs.readFileSync(liveFile, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
const rows = readCsv(csvFile);
const byVid = new Map(rows.filter((r) => r.supplier_variant_id).map((r) => [`${r.supplier_tag}:${r.supplier_variant_id}`, r]));
const perProduct = new Map();
for (const l of live) { const k = l.url; if (!perProduct.has(k)) perProduct.set(k, []); perProduct.get(k).push(l); }

const records = [], shopify = [];
let failed = 0;
for (const l of live) {
  const r = byVid.get(`${l.supplier}:${l.supplier_variant_id}`);
  if (!l.url_ok) failed++;
  if (!r) continue;
  const sibs = perProduct.get(l.url);
  records.push({
    supplier: l.supplier, product_id: r.supplier_product_id, variant_id: l.supplier_variant_id, sku: l.sku ?? 'UNKNOWN', size: r.variant_title, title: r.product_title,
    brand: l.vendor ?? 'UNKNOWN', barcode: 'UNKNOWN', currency: l.currency ?? 'UNKNOWN', url: l.url.replace(/\.js$/, ''),
    shipping: shippingFor(l.supplier, { unitCost: l.price }), sizesInStock: sibs.filter((x) => x.stock === 'AVAILABLE').length, sizesTotal: sibs.length,
    live: l.url_ok ? { price: l.price, stock: l.stock, compare_at: l.compare_at ?? null, checkedAt: l.checked_at, variantExists: l.variant_exists } : undefined,
  });
  shopify.push({ variantId: r.variant_id, productId: r.product_id, sku: r.sku, size: r.variant_title, price: Number(r.price), title: r.product_title });
}
const now = new Date().toISOString();
const out = runSelectionAgent({ records, shopify, policy: loadPolicy(), now, killSwitch: facts.killSwitch ?? 'ON', supplierVerified: facts.supplierVerified ?? {} });
const sum = summarizeAgent(out);
const counts = {
  DISCOVERED: records.length, MATCHED: out.filter((r) => r.shopifyVariantId).length, 'LIVE VERIFIED': records.filter((r) => r.live).length,
  SELLABLE: sum.sellable, BLOCKED: sum.BLOCKED, 'REVIEW REQUIRED': sum.REVIEW_REQUIRED, 'AUTO READY (awaiting human)': sum.AUTO_READY,
  APPROVED: facts.approved ?? 0, PUBLISHED: facts.published ?? 0, FAILED: failed,
};
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const table = (cols, list) => `<table><thead><tr>${cols.map((c) => `<th>${esc(c[0])}</th>`).join('')}</tr></thead><tbody>${list.map((r) => `<tr>${cols.map((c) => `<td>${esc(c[1](r))}</td>`).join('')}</tr>`).join('') || `<tr><td colspan="${cols.length}">—</td></tr>`}</tbody></table>`;
const sellCols = [['supplier', (r) => r.supplier], ['SKU', (r) => r.sku], ['cost', (r) => r.metrics?.cost], ['shipping', (r) => r.metrics?.shipping], ['selling price', (r) => r.metrics?.sellingPrice], ['net', (r) => r.metrics?.net], ['margin %', (r) => r.metrics?.marginPct], ['markup %', (r) => r.metrics?.markupPct], ['stock', () => 'AVAILABLE'], ['confidence', (r) => r.confidence], ['risk', (r) => r.risk?.join(' ') || 'LOW'], ['last verified', (r) => r.lastVerified], ['score', (r) => r.score], ['pending (system)', (r) => r.reasons.filter((x) => !r.productReasons.includes(x)).join(' ')]];
const blockedReasons = Object.entries(out.filter((r) => r.status === 'BLOCKED').flatMap((r) => r.productReasons).reduce((a, x) => ((a[x] = (a[x] ?? 0) + 1), a), {})).sort((a, b) => b[1] - a[1]);
const html = `<!doctype html><html lang="he" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Sportpro Pipeline</title>
<style>:root{--bg:#fff;--fg:#1a1a1a;--mut:#666;--line:#e5e5e5;--card:#f7f7f7}@media (prefers-color-scheme:dark){:root{--bg:#141414;--fg:#eee;--mut:#999;--line:#333;--card:#1e1e1e}}
body{font:14px system-ui,sans-serif;margin:0 auto;max-width:1200px;padding:16px;background:var(--bg);color:var(--fg)}h1{font-size:20px}h2{font-size:16px;margin-top:28px}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:8px}.k{background:var(--card);border:1px solid var(--line);border-radius:8px;padding:10px}.k b{display:block;font-size:22px}
.k span{color:var(--mut);font-size:12px}.wrap{overflow-x:auto}table{border-collapse:collapse;width:100%;font-size:12px}th,td{border-bottom:1px solid var(--line);padding:4px 6px;text-align:start;white-space:nowrap}p.n{color:var(--mut)}</style></head><body>
<h1>Sportpro — Pipeline (read-only)</h1><p class="n">נוצר ${esc(now)} · נתוני LIVE: ${esc(live.map((x) => x.checked_at).sort().pop())} · Kill Switch בהערכה: ${esc(facts.killSwitch ?? 'ON')} · אין כתיבה לשום מערכת</p>
<div class="grid">${Object.entries(counts).map(([k, v]) => `<div class="k"><b>${esc(v)}</b><span>${esc(k)}</span></div>`).join('')}</div>
<h2>SELLABLE (${sum.sellable})</h2><div class="wrap">${table(sellCols, out.filter((r) => r.sellable))}</div>
<h2>AUTO READY — ממתינים לאישור אנושי (top 25 לפי score)</h2><div class="wrap">${table(sellCols, [...out].filter((r) => r.status === 'AUTO_READY').sort((a, b) => b.score - a.score).slice(0, 25))}</div>
<h2>BLOCKED — block_reason</h2><div class="wrap">${table([['block_reason', (r) => r[0]], ['count', (r) => r[1]]], blockedReasons)}</div>
<div class="wrap">${table([['supplier', (r) => r.supplier], ['SKU', (r) => r.sku], ['size', (r) => r.size], ['block_reason', (r) => r.productReasons.join(' ')]], out.filter((r) => r.status === 'BLOCKED').slice(0, 100))}</div>
<h2>REVIEW REQUIRED</h2><div class="wrap">${table([['supplier', (r) => r.supplier], ['SKU', (r) => r.sku], ['risk', (r) => r.risk.join(' ')], ['reasons', (r) => r.productReasons.join(' ')]], out.filter((r) => r.status === 'REVIEW_REQUIRED').slice(0, 100))}</div>
</body></html>`;
fs.mkdirSync(new URL('.', `file://${outFile}`).pathname, { recursive: true });
fs.writeFileSync(outFile, html);
console.log(JSON.stringify({ counts, agent: sum }, null, 1));
