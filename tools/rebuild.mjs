// SELLABLE-first rebuild (read-only). Joins Shopify export + supplier scans (+ optional live verification),
// classifies every Shopify variant, and writes queues, top lists, opportunities and a DRY-RUN Shopify sync plan.
// No network calls. No writes outside <outDir>.
//
// Usage: node tools/rebuild.mjs <dataDir> <outDir> [liveRuns.jsonl]
//   pass 1 (no live file) also writes <outDir>/live_candidates.json for tools/live_verify.mjs
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { normKey, normSku, normText, optionSignature } from '../src/core/normalize.js';
import { shippingFor, SHIPPING_RULES } from '../src/core/shipping.js';
import { evaluateProfit, minProfitablePrice, CURRENT_POLICY } from '../src/core/pricing.js';
import { classifyVariant, STATES, GROUP_OF_STATE } from '../src/core/eligibility.js';
import { buildSupplierIndex, matchProduct, modelCodes } from '../src/core/match.js';
import { buildSkuProposals } from '../src/core/skuProposals.js';
import { planSync, SYNC_POLICIES } from '../src/core/syncPlanner.js';
import { SUPPLIERS, supplierById, NON_SUPPLIER_TAGS } from '../src/core/registry.js';
import { shopifyStock, wooStock } from '../src/core/stock.js';

const [dataDir, outDir, liveFile] = process.argv.slice(2);
if (!dataDir || !outDir) { console.error('usage: rebuild.mjs <dataDir> <outDir> [liveRuns.jsonl]'); process.exit(2); }
fs.mkdirSync(outDir, { recursive: true });
const readJsonl = (f) => (fs.existsSync(f) ? fs.readFileSync(f, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)) : []);
const NOW = new Date().toISOString();
const sha = (o) => createHash('sha256').update(typeof o === 'string' ? o : JSON.stringify(o)).digest('hex').slice(0, 16);
const r2 = (x) => (typeof x === 'number' && Number.isFinite(x) ? Math.round(x * 100) / 100 : x);

// ---------------- Shopify ----------------
const products = new Map(); const variants = [];
for (const o of readJsonl(path.join(dataDir, 'shopify_full.jsonl'))) {
  const id = o.id ?? '';
  if (id.includes('/Product/') && !o.__parentId) { o.variants = []; o.collections = []; products.set(id, o); }
  else if (id.includes('/ProductVariant/')) { variants.push(o); products.get(o.__parentId).variants.push(o); }
  else if (id.includes('/Collection/')) products.get(o.__parentId)?.collections.push(o);
}
const supplierTagOf = (p) => { const t = p.tags.filter((x) => x.startsWith('ספק:')).map((x) => x.slice(4)); return t.length ? t[0] : null; };
const shopifySkuCount = new Map();
for (const v of variants) { const s = normSku(v.sku); if (s) shopifySkuCount.set(s, (shopifySkuCount.get(s) ?? 0) + 1); }

// ---------------- Suppliers (raw + normalized) ----------------
const scanSummary = JSON.parse(fs.readFileSync(path.join(dataDir, 'suppliers', '_scan_summary.json'), 'utf8'));
const feedOk = Object.fromEntries(scanSummary.map((s) => [s.supplier, s.ok]));
const lastScan = Object.fromEntries(scanSummary.map((s) => [s.supplier, s.finished]));
const decodeHtml = (s) => String(s ?? '').replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n)).replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ');
const safeDecode = (s) => { try { return decodeURIComponent(s); } catch { return s; } };

const SUPPLIER_PRODUCTS = {}; // supplier -> [product]
const supplierVariantsAll = [];
const liveFromScan = new Map(); // `${supplier}:${variantId}` -> verification row (Woo per-variation fetch)
for (const S of SUPPLIERS) {
  const key = S.supplier_id;
  const file = path.join(dataDir, 'suppliers', `${key}.jsonl`);
  if (!fs.existsSync(file)) continue;
  const enrich = new Map(readJsonl(path.join(dataDir, 'suppliers', `${key}.variations.jsonl`)).map((r) => [String(r.id), r]));
  const list = [];
  for (const rec of readJsonl(file)) {
    const p = rec.p;
    const sourceHash = sha(p);
    let P;
    if (rec.platform === 'shopify') {
      P = { supplier: key, platform: 'shopify', productId: String(p.id), handle: p.handle, title: p.title, vendor: p.vendor || null, productType: p.product_type || '',
        url: `https://${S.domain}/products/${p.handle}`, image: p.images?.[0]?.src ?? '', fetchedAt: rec.fetched_at, sourceHash, variants: [],
        division: (p.tags ?? []).find((t) => t.startsWith('DIVISION:'))?.slice(9) ?? null };
      for (const v of p.variants) {
        P.variants.push({ variantId: String(v.id), sku: v.sku || null, barcode: v.barcode || null, options: [v.option1, v.option2, v.option3].filter((x) => x != null),
          cost: Number(v.price) || null, currency: 'ILS', stockRaw: String(v.available), stock: shopifyStock(v.available), grams: v.grams || 0, fetchedAt: rec.fetched_at, liveMethod: null });
      }
    } else {
      const minor = p.prices?.currency_minor_unit ?? 2;
      const price = p.prices?.price ? Number(p.prices.price) / 10 ** minor : null;
      const single = !p.prices?.price_range || p.prices.price_range.min_amount === p.prices.price_range.max_amount;
      P = { supplier: key, platform: 'woo', productId: String(p.id), handle: p.slug, title: decodeHtml(p.name), vendor: (p.brands ?? [])[0]?.name ?? null,
        productType: (p.categories ?? []).map((c) => decodeHtml(c.name)).join(' / '), url: p.permalink, image: p.images?.[0]?.src ?? '', fetchedAt: rec.fetched_at, sourceHash, variants: [] };
      const vars = p.variations ?? [];
      if (vars.length) {
        for (const v of vars) {
          const e = enrich.get(String(v.id));
          const ev = e?.v;
          const emin = ev?.prices?.currency_minor_unit ?? 2;
          const sv = { variantId: String(v.id), sku: ev?.sku || null, barcode: null, options: (v.attributes ?? []).map((a) => decodeHtml(safeDecode(a.value))),
            cost: ev?.prices?.price ? Number(ev.prices.price) / 10 ** emin : single ? price : null, currency: ev?.prices?.currency_code ?? p.prices?.currency_code ?? null,
            stockRaw: ev ? `${ev.is_in_stock}/${ev.is_purchasable}/${ev.stock_availability?.class ?? ''}` : 'product-level-only', stock: ev ? wooStock(ev) : 'UNKNOWN',
            grams: 0, fetchedAt: e?.fetched_at ?? rec.fetched_at, liveMethod: ev ? 'WOO_STORE_API_VARIATION' : null };
          P.variants.push(sv);
          if (ev) liveFromScan.set(`${key}:${sv.variantId}`, { supplier: key, supplier_variant_id: sv.variantId, url: `https://${S.domain}/wp-json/wc/store/v1/products/${v.id}`, http_status: 200, url_ok: true, variant_exists: true, stock: sv.stock, price: sv.cost, currency: sv.currency, sku: sv.sku, checked_at: e.fetched_at, method: 'WOO_STORE_API_VARIATION' });
        }
      } else {
        P.variants.push({ variantId: String(p.id), sku: p.sku || null, barcode: null, options: [], cost: price, currency: p.prices?.currency_code ?? null,
          stockRaw: `${p.is_in_stock}/${p.is_purchasable}/${p.stock_availability?.class ?? ''}`, stock: wooStock(p), grams: 0, fetchedAt: rec.fetched_at, liveMethod: null });
      }
    }
    list.push(P);
  }
  SUPPLIER_PRODUCTS[key] = list;
}
const IDX = Object.fromEntries(Object.entries(SUPPLIER_PRODUCTS).map(([k, list]) => [k, buildSupplierIndex(list)]));
// index products by id for lookups
const SV_BY_KEY = new Map();
for (const [k, idx] of Object.entries(IDX)) for (const P of idx.products) for (const v of P.variants) { SV_BY_KEY.set(`${k}:${v.variantId}`, v); supplierVariantsAll.push(v); }
const supplierSkuCount = new Map();
for (const v of supplierVariantsAll) { const s = normSku(v.sku); if (s) { const k = `${v.product.supplier}:${s}`; supplierSkuCount.set(k, (supplierSkuCount.get(k) ?? 0) + 1); } }
// cross-supplier SKU index (alternate suppliers)
const GLOBAL_SKU = new Map();
for (const v of supplierVariantsAll) { const s = normSku(v.sku); if (s) { if (!GLOBAL_SKU.has(s)) GLOBAL_SKU.set(s, []); GLOBAL_SKU.get(s).push(v); } }

// ---------------- Live verification runs ----------------
const LIVE = new Map(liveFromScan);
for (const r of liveFile ? readJsonl(liveFile) : []) LIVE.set(`${r.supplier}:${r.supplier_variant_id}`, r);

// ---------------- Matching ----------------
const matchByVariant = new Map();
for (const p of products.values()) {
  const tag = supplierTagOf(p);
  if (!tag || !IDX[tag]) continue;
  const res = matchProduct({ title: p.title, vendor: p.vendor, variants: p.variants.map((v) => ({ id: v.id, sku: v.sku, barcode: v.barcode, options: (v.selectedOptions ?? []).map((o) => o.value) })) }, IDX[tag]);
  for (const [vid, m] of res) matchByVariant.set(vid, m);
}
const svUse = new Map();
for (const m of matchByVariant.values()) if (m.sv && (m.cls === 'AUTO_CANDIDATE' || m.cls === 'HIGH_CONFIDENCE')) { const k = `${m.sv.product.supplier}:${m.sv.variantId}`; svUse.set(k, (svUse.get(k) ?? 0) + 1); }

// ---------------- Classification ----------------
const rows = [];
for (const v of variants) {
  const p = products.get(v.__parentId);
  const tag = supplierTagOf(p);
  const reg = tag ? supplierById(tag) : null;
  const m = matchByVariant.get(v.id) ?? { status: 'NONE', cls: 'REJECT', reason: null, confidence: 0 };
  const sv = m.sv ?? null;
  const svKey = sv ? `${sv.product.supplier}:${sv.variantId}` : null;
  const run = svKey ? LIVE.get(svKey) : null;
  const liveVerified = Boolean(run && (new Date(NOW) - new Date(run.checked_at)) / 36e5 <= 24);
  const cost = liveVerified && run.variant_exists ? run.price : sv?.cost ?? null;
  const stock = liveVerified ? run.stock : sv?.stock ?? 'UNKNOWN';
  const ship = sv ? shippingFor(tag, { unitCost: cost, grams: sv.grams, productType: sv.product.productType, division: sv.product.division }) : null;
  if (ship) ship.conditionSatisfied = ship.cost !== null && (ship.status === 'VERIFIED' || ship.status === 'CONDITIONAL');
  const price = Number(v.price);
  const profit = sv ? evaluateProfit({ sellingPrice: price, supplierCost: cost, shippingCost: ship?.cost }) : null;
  const minP = sv ? minProfitablePrice({ supplierCost: cost, shippingCost: ship?.cost }) : null;
  const sku = normSku(v.sku);
  const purchasable = p.status === 'ACTIVE' && (v.inventoryItem?.tracked === false || (v.inventoryQuantity ?? 0) > 0);
  const supported = Boolean(reg && IDX[tag]);
  const cls = classifyVariant({
    now: NOW,
    shopify: { productStatus: p.status, price, mediaCount: p.mediaCount?.count ?? 0, duplicateSku: sku ? shopifySkuCount.get(sku) > 1 : false },
    supplier: { key: tag, supported, blocked: reg?.status === 'BLOCKED' && !IDX[tag], feedOk: supported ? feedOk[tag] : false,
      unsupportedReason: tag ? (NON_SUPPLIER_TAGS[tag] ?? (reg ? 'NO_PUBLIC_CATALOG_FEED' : 'SUPPLIER_NOT_ONBOARDED')) : null, checkoutVerified: Boolean(reg?.checkout_verified) },
    match: m,
    live: { fetchedAt: liveVerified ? run.checked_at : sv?.fetchedAt ?? null, stock, cost, currency: liveVerified ? run.currency : sv?.currency, verified: liveVerified, variantExists: liveVerified ? run.variant_exists : undefined, urlOk: liveVerified ? run.url_ok : undefined },
    shipping: ship, profit,
    risk: { duplicateSupplierMapping: svKey ? (svUse.get(svKey) ?? 0) > 1 : false },
    approval: { mappingApproved: false }, // no readable approvals (D1 BLOCKED) -> fail closed
  });
  if (!STATES.includes(cls.state)) throw new Error(`state outside closed set: ${cls.state}`);
  // alternate supplier by exact SKU (any other supplier, AVAILABLE)
  const alt = sku ? (GLOBAL_SKU.get(sku) ?? []).filter((x) => x.product.supplier !== tag && x.stock === 'AVAILABLE') : [];
  rows.push({
    variant_id: v.id.split('/').pop(), product_id: p.id.split('/').pop(), handle: p.handle, product_title: p.title, variant_title: v.title,
    shopify_status: p.status, vendor: p.vendor, product_type: p.productType, supplier_tag: tag ?? '', supplier_documented: reg ? reg.documented : false,
    sku: v.sku ?? '', sku_duplicate_count: sku ? shopifySkuCount.get(sku) : 0, barcode: v.barcode ?? '', price, compare_at_price: v.compareAtPrice ?? '',
    inventory_qty: v.inventoryQuantity ?? '', inventory_tracked: v.inventoryItem?.tracked ?? '', purchasable_now: purchasable, media_count: p.mediaCount?.count ?? 0,
    match_status: m.status, match_class: m.status === 'MATCHED' ? m.cls : '', match_confidence: m.confidence ?? 0, match_method: m.method ?? '', match_reason: m.reason ?? '',
    match_evidence: JSON.stringify(m.evidence ?? {}),
    supplier_product_id: sv?.product.productId ?? '', supplier_variant_id: sv?.variantId ?? '', supplier_url: sv ? (sv.product.platform === 'shopify' ? `${sv.product.url}?variant=${sv.variantId}` : sv.product.url) : '',
    supplier_title: sv?.product.title ?? '', supplier_sku: sv?.sku ?? '', supplier_options: sv ? sv.options.join(' / ') : '',
    supplier_cost: cost ?? '', supplier_stock: sv ? stock : '', supplier_fetched_at: sv?.fetchedAt ?? '',
    live_verified: liveVerified, live_checked_at: liveVerified ? run.checked_at : '', live_method: liveVerified ? run.method : '',
    shipping_status: ship?.status ?? '', shipping_cost: ship?.cost ?? '', shipping_rule: ship?.rule ?? '', shipping_source: ship?.source ?? '',
    profit_net: profit?.net ?? '', profit_margin_pct: profit?.marginPct ?? '', markup_pct: profit?.markupPct ?? '', profit_pass: profit ? profit.pass : '', profit_reason: profit?.reason ?? '',
    min_profitable_price: minP?.price ?? '', reprice_feasible: minP ? minP.feasible : '', pricing_policy: CURRENT_POLICY.version,
    alternate_supplier: alt.length ? `${alt[0].product.supplier}:${alt[0].variantId}:${alt[0].cost}` : '',
    state: cls.state, group: cls.group, primary_reason: cls.primaryReason ?? '', fix: cls.fix ?? '',
    _sv: sv, _m: m,
  });
}

// ---------------- CSV ----------------
const esc = (x) => { const s = x === null || x === undefined ? '' : String(x); return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
const strip = (r) => Object.fromEntries(Object.entries(r).filter(([k]) => !k.startsWith('_')));
function writeCsv(name, recs, cols) {
  recs = recs.map(strip);
  cols = cols ?? Object.keys(recs[0] ?? { empty: '' });
  fs.writeFileSync(path.join(outDir, name), '﻿' + [cols.join(','), ...recs.map((r) => cols.map((c) => esc(r[c])).join(','))].join('\n') + '\n');
  return recs.length;
}
const COLS = Object.keys(strip(rows[0]));
const num = (x) => (typeof x === 'number' ? x : Number(x) || 0);

writeCsv('variants_classified.csv', rows, COLS);
writeCsv('sellable.csv', rows.filter((r) => r.state === 'SELLABLE'), COLS);
writeCsv('blocked.csv', rows.filter((r) => r.state !== 'SELLABLE'), ['variant_id', 'product_id', 'product_title', 'variant_title', 'shopify_status', 'purchasable_now', 'supplier_tag', 'group', 'state', 'primary_reason', 'fix', 'match_class', 'match_confidence', 'supplier_stock', 'shipping_status', 'profit_net', 'supplier_url']);

const inStock = (r) => r.supplier_stock === 'AVAILABLE';
const byValue = (a, b) => (inStock(b) - inStock(a)) || (num(b.profit_net) - num(a.profit_net)) || (num(b.match_confidence) - num(a.match_confidence));
writeCsv('mapping_queue.csv', rows.filter((r) => r.state === 'MAPPING_REQUIRED' || r.state === 'OWNER_APPROVAL').sort(byValue), ['variant_id', 'product_id', 'product_title', 'variant_title', 'shopify_status', 'supplier_tag', 'state', 'primary_reason', 'fix', 'match_status', 'match_class', 'match_confidence', 'match_method', 'match_evidence', 'supplier_url', 'supplier_title', 'supplier_options', 'supplier_stock', 'supplier_cost', 'price', 'profit_net']);
writeCsv('stock_queue.csv', rows.filter((r) => r.state === 'STOCK_BLOCKED').map((r) => ({ ...r, action: r.alternate_supplier ? `SWITCH_SUPPLIER_CANDIDATE ${r.alternate_supplier}` : r.primary_reason === 'STOCK_UNKNOWN' ? 'LIVE_VARIANT_CHECK' : 'AUTO_RECHECK_DAILY' })), ['variant_id', 'product_id', 'product_title', 'variant_title', 'shopify_status', 'purchasable_now', 'supplier_tag', 'primary_reason', 'action', 'supplier_url', 'supplier_fetched_at', 'live_checked_at']);
writeCsv('shipping_queue.csv', rows.filter((r) => r.state === 'SHIPPING_BLOCKED').map((r) => ({ ...r, action: `VERIFY_SHIPPING ${r.supplier_tag}: ${r.shipping_rule}` })), ['variant_id', 'product_id', 'product_title', 'supplier_tag', 'primary_reason', 'shipping_status', 'shipping_rule', 'supplier_cost', 'action', 'supplier_url']);
writeCsv('profit_queue.csv', rows.filter((r) => r.state === 'PROFIT_BLOCKED').map((r) => ({ ...r, action: r.reprice_feasible === true ? `REPRICE_TO ${r.min_profitable_price} (owner approval)` : r.reprice_feasible === false ? 'STRUCTURALLY_UNPROFITABLE (min price exceeds 35% markup cap) -> drop or new supplier' : 'COST_OR_SHIPPING_UNKNOWN' })).sort((a, b) => num(a.profit_net) - num(b.profit_net)),
  ['variant_id', 'product_id', 'product_title', 'variant_title', 'shopify_status', 'purchasable_now', 'supplier_tag', 'primary_reason', 'price', 'supplier_cost', 'shipping_cost', 'profit_net', 'profit_margin_pct', 'min_profitable_price', 'reprice_feasible', 'action', 'supplier_url']);
writeCsv('data_quality_queue.csv', rows.filter((r) => ['DATA_FIX', 'RISK_BLOCKED', 'INVALID'].includes(r.state)), ['variant_id', 'product_id', 'product_title', 'variant_title', 'shopify_status', 'supplier_tag', 'state', 'primary_reason', 'fix', 'sku', 'sku_duplicate_count', 'supplier_sku', 'supplier_url']);

// SKU proposals (all matched variants with a supplier SKU)
const skuProps = buildSkuProposals(rows.filter((r) => r._sv && r._m.status === 'MATCHED').map((r) => ({
  shopifyVariantId: r.variant_id, currentSku: r.sku || null, supplier: r._sv.product.supplier, supplierVariantId: r._sv.variantId, supplierSku: r._sv.sku,
  confidence: r.match_confidence, cls: r.match_class, sizeEvidence: r._m.evidence?.size_evidence ?? (r._m.method?.startsWith('SKU') || r._m.method === 'BARCODE_EXACT' ? 'EXACT' : ''), method: r.match_method })), shopifySkuCount, supplierSkuCount);
writeCsv('sku_proposals.csv', skuProps);

// verification runs
writeCsv('verification_runs.csv', [...LIVE.values()].map((r) => ({ ...r, options: Array.isArray(r.options) ? r.options.join(' / ') : '' })));

// ---------------- Product-level views ----------------
const byProduct = new Map();
for (const r of rows) { if (!byProduct.has(r.product_id)) byProduct.set(r.product_id, []); byProduct.get(r.product_id).push(r); }

// Top 500 to publish: group-B variants live-verified, AVAILABLE, profitable
const publish = [];
for (const [pid, vs] of byProduct) {
  const ok = vs.filter((r) => r.group === 'B_SELLABLE_AFTER_FIX' && r.live_verified && r.supplier_stock === 'AVAILABLE' && r.profit_pass === true);
  if (!ok.length) continue;
  const missing = new Set(['PILOT_CHECKOUT_VERIFICATION']);
  for (const r of ok) missing.add({ AUTO_READY: 'RECORD_MAPPING', OWNER_APPROVAL: 'OWNER_MAPPING_APPROVAL', DATA_FIX: `DATA_FIX:${r.primary_reason}` }[r.state]);
  const nets = ok.map((r) => num(r.profit_net));
  publish.push({ product_id: pid, title: vs[0].product_title, supplier: vs[0].supplier_tag, shopify_status: vs[0].shopify_status, eligible_variants: ok.length, total_variants: vs.length,
    best_net: Math.max(...nets), avg_net: r2(nets.reduce((a, b) => a + b, 0) / nets.length), avg_margin_pct: r2(ok.reduce((a, r) => a + num(r.profit_margin_pct), 0) / ok.length),
    min_confidence: Math.min(...ok.map((r) => num(r.match_confidence))), match_methods: [...new Set(ok.map((r) => r.match_method))].join(' '),
    why_ready: 'matched AUTO/HIGH; live-verified AVAILABLE; ILS price; shipping known; profit ≥10₪ & ≥4%', still_missing: [...missing].join(' + '),
    evidence_url: ok[0].supplier_url, last_checked: ok.map((r) => r.live_checked_at).sort()[0] });
}
for (const p of publish) p.steps_missing = p.still_missing.split(' + ').length;
// publish order = readiness (fewest missing steps, highest confidence), then profit
publish.sort((a, b) => a.steps_missing - b.steps_missing || b.min_confidence - a.min_confidence || b.best_net - a.best_net);
writeCsv('top500_publish.csv', publish.slice(0, 500));
writeCsv('publish_candidates_all.csv', publish);
const byProfit = [...publish].sort((a, b) => b.best_net - a.best_net || b.min_confidence - a.min_confidence);
writeCsv('top500_profit.csv', byProfit.slice(0, 500));

// Top 500 easiest fixes
const FIX = (r) => {
  if (r.state === 'OWNER_APPROVAL' && inStock(r) && r.profit_pass === true) return { type: 'APPROVE_MAPPING', effort: 1, value: num(r.profit_net) };
  if (r.state === 'DATA_FIX' && inStock(r)) return { type: 'SET_UNIQUE_SKU', effort: 1, value: num(r.profit_net) };
  if (r.state === 'PROFIT_BLOCKED' && inStock(r) && r.reprice_feasible === true) { const p = evaluateProfit({ sellingPrice: num(r.min_profitable_price), supplierCost: num(r.supplier_cost), shippingCost: num(r.shipping_cost) }); return { type: `REPRICE_TO_${r.min_profitable_price}`, effort: 1, value: p.net ?? 0 }; }
  if (r.state === 'STOCK_BLOCKED' && r.alternate_supplier) return { type: `SWITCH_SUPPLIER_${r.alternate_supplier.split(':')[0]}`, effort: 2, value: 0 };
  if (r.state === 'MAPPING_REQUIRED' && r.primary_reason === 'MATCH_NEEDS_MANUAL_REVIEW' && inStock(r) && r.profit_pass === true) return { type: 'MANUAL_REVIEW_MATCH', effort: 2, value: num(r.profit_net) };
  if (r.state === 'SHIPPING_BLOCKED' && inStock(r)) return { type: `VERIFY_SHIPPING_${r.supplier_tag}`, effort: 2, value: 0 };
  if (r.state === 'MAPPING_REQUIRED' && ['OPTION_NOT_OFFERED_BY_SUPPLIER', 'SHOPIFY_COLLAPSED_VARIANTS', 'SUPPLIER_HAS_NO_VARIANTS', 'AMBIGUOUS_VARIANT_COLOR'].includes(r.primary_reason)) return { type: 'REBUILD_VARIANTS_FROM_SUPPLIER', effort: 3, value: 0 };
  return null;
};
const fixes = [];
for (const [pid, vs] of byProduct) {
  const fx = vs.map((r) => ({ r, f: FIX(r) })).filter((x) => x.f);
  if (!fx.length) continue;
  const effort = Math.min(...fx.map((x) => x.f.effort));
  const main = fx.filter((x) => x.f.effort === effort);
  fixes.push({ product_id: pid, title: vs[0].product_title, supplier: vs[0].supplier_tag, shopify_status: vs[0].shopify_status, effort,
    fix_types: [...new Set(main.map((x) => x.f.type.replace(/_\d.*$/, '')))].join(' '), variants_unlocked: main.length,
    expected_net_after_fix: r2(main.reduce((a, x) => a + x.f.value, 0)), example_action: main[0].f.type, why_blocked: [...new Set(main.map((x) => `${x.r.state}:${x.r.primary_reason}`))].join(' | '),
    evidence_url: main[0].r.supplier_url });
}
fixes.sort((a, b) => a.effort - b.effort || b.expected_net_after_fix - a.expected_net_after_fix || b.variants_unlocked - a.variants_unlocked);
writeCsv('top500_fixes.csv', fixes.slice(0, 500));

// ---------------- Supplier opportunities ----------------
const mappedSupplierProducts = new Set([...matchByVariant.values()].filter((m) => m.sv).map((m) => `${m.sv.product.supplier}:${m.sv.product.productId}`));
// supplier listings that are not physical products
const NON_PRODUCT = /shipping protection|\binsurance\b|gift ?cards?|gift voucher|כרטיס מתנה|שובר מתנה|תו קנייה|voucher/i;
const opps = [];
for (const [key, idx] of Object.entries(IDX)) {
  for (const P of idx.products) {
    if (mappedSupplierProducts.has(`${key}:${P.productId}`)) continue;
    if (NON_PRODUCT.test(`${P.title} ${P.productType}`)) continue; // gift cards, vouchers, shipping insurance
    const av = P.variants.filter((v) => v.stock === 'AVAILABLE' && v.cost > 0);
    if (!av.length) continue;
    const cost = Math.max(...av.map((v) => v.cost));
    const ship = shippingFor(key, { unitCost: cost, grams: Math.max(...av.map((v) => v.grams || 0)), productType: P.productType, division: P.division });
    if (ship.cost === null) continue;
    const mp = minProfitablePrice({ supplierCost: cost, shippingCost: ship.cost });
    if (!mp.feasible) continue;
    opps.push({ type: 'NEW_PRODUCT', supplier: key, supplier_product_id: P.productId, title: P.title, brand: P.vendor ?? 'UNKNOWN', product_type: P.productType,
      available_variants: av.length, total_variants: P.variants.length, supplier_cost_max: cost, shipping_status: ship.status, shipping_cost: ship.cost,
      suggested_min_price: mp.price, implied_markup_pct: r2(((mp.price - cost) / cost) * 100), has_supplier_sku: av.every((v) => v.sku), demand: 'UNKNOWN', url: P.url, image: P.image });
  }
}
for (const r of rows) if (r.alternate_supplier && r.state !== 'SELLABLE') opps.push({ type: 'ALTERNATE_SUPPLIER', supplier: r.alternate_supplier.split(':')[0], supplier_product_id: '', title: r.product_title, brand: r.vendor, product_type: r.product_type,
  available_variants: 1, total_variants: '', supplier_cost_max: r.alternate_supplier.split(':')[2], shipping_status: '', shipping_cost: '', suggested_min_price: '', implied_markup_pct: '', has_supplier_sku: true, demand: 'UNKNOWN', url: '', image: '', shopify_variant_id: r.variant_id, blocked_because: `${r.state}:${r.primary_reason}` });
const shipRank = { VERIFIED: 0, CONDITIONAL: 1 };
opps.sort((a, b) => (a.type === b.type ? 0 : a.type === 'ALTERNATE_SUPPLIER' ? -1 : 1) || (shipRank[a.shipping_status] ?? 2) - (shipRank[b.shipping_status] ?? 2) || (b.has_supplier_sku - a.has_supplier_sku) || (b.available_variants - a.available_variants) || (num(b.supplier_cost_max) - num(a.supplier_cost_max)));
writeCsv('supplier_opportunities.csv', opps, ['type', 'supplier', 'supplier_product_id', 'title', 'brand', 'product_type', 'available_variants', 'total_variants', 'supplier_cost_max', 'shipping_status', 'shipping_cost', 'suggested_min_price', 'implied_markup_pct', 'has_supplier_sku', 'demand', 'url', 'image', 'shopify_variant_id', 'blocked_because']);

// ---------------- Supplier registry + health ----------------
const health = SUPPLIERS.map((S) => {
  const k = S.supplier_id; const list = SUPPLIER_PRODUCTS[k] ?? []; const vs = list.flatMap((p) => p.variants);
  const tagged = rows.filter((r) => r.supplier_tag === k);
  const matched = tagged.filter((r) => r.match_status === 'MATCHED');
  const cand = tagged.filter((r) => r.group === 'B_SELLABLE_AFTER_FIX' && r.live_verified && r.profit_pass === true && r.supplier_stock === 'AVAILABLE');
  const nets = cand.map((r) => num(r.profit_net)).sort((a, b) => a - b);
  return { ...S, last_scan_at: lastScan[k] ?? '', catalog_products: list.length, catalog_variants: vs.length,
    available: vs.filter((v) => v.stock === 'AVAILABLE').length, unavailable: vs.filter((v) => v.stock === 'UNAVAILABLE').length, unknown: vs.filter((v) => v.stock === 'UNKNOWN').length,
    with_sku: vs.filter((v) => v.sku).length, shopify_variants_tagged: tagged.length, matched_auto: matched.filter((r) => r.match_class === 'AUTO_CANDIDATE').length,
    matched_high: matched.filter((r) => r.match_class === 'HIGH_CONFIDENCE').length, matched_review: matched.filter((r) => r.match_class === 'MANUAL_REVIEW').length,
    mapping_coverage_pct: tagged.length ? r2((matched.filter((r) => ['AUTO_CANDIDATE', 'HIGH_CONFIDENCE'].includes(r.match_class)).length / tagged.length) * 100) : '',
    live_verified_candidates: cand.length, median_candidate_net: nets.length ? nets[Math.floor(nets.length / 2)] : '', checkout_success_rate: 'UNKNOWN (no pilot)' };
});
writeCsv('supplier_registry.csv', health);

// supplier catalog (raw + normalized)
writeCsv('supplier_catalog.csv', supplierVariantsAll.map((v) => ({
  supplier_id: v.product.supplier, supplier_product_id: v.product.productId, supplier_variant_id: v.variantId,
  title_raw: v.product.title, brand_raw: v.product.vendor ?? '', sku_raw: v.sku ?? '', barcode_raw: v.barcode ?? '', options_raw: v.options.join(' / '),
  price_raw: v.cost ?? '', currency: v.currency ?? '', stock_raw: v.stockRaw, stock_status: v.stock, url: v.product.platform === 'shopify' ? `${v.product.url}?variant=${v.variantId}` : v.product.url,
  image_url: v.product.image, last_seen_at: v.fetchedAt, source_hash: v.product.sourceHash,
  title_normalized: normText(v.product.title), brand_normalized: v.product.vendor ? normKey(v.product.vendor) : '', model_normalized: [...v.product.models].join(' '),
  options_normalized: v.sig, sku_normalized: normSku(v.sku) ?? '',
  mapped_shopify_variants: svUse.get(`${v.product.supplier}:${v.variantId}`) ?? 0,
})));

// ---------------- DRY-RUN Shopify sync ----------------
const syncInput = [...byProduct].map(([pid, vs]) => ({ productId: pid, title: vs[0].product_title, status: vs[0].shopify_status,
  variants: vs.map((r) => ({ variantId: r.variant_id, state: r.state, primaryReason: r.primary_reason, purchasable: r.purchasable_now, supplierStock: r.supplier_stock, profitNet: r.profit_net === '' || r.shipping_status === 'UNKNOWN' ? null : num(r.profit_net) })) }));
// sales-channel publications backup (optional input publications.jsonl) so rollback restores channels too
const PUBS = new Map();
for (const o of readJsonl(path.join(dataDir, 'publications.jsonl'))) {
  if (o.status) PUBS.set(o.id.split('/').pop(), []);
  else PUBS.get(o.__parentId.split('/').pop())?.push(`${o.publication.id.split('/').pop()}:${o.publication.name}:${o.isPublished ? 1 : 0}`);
}
for (const pol of Object.values(SYNC_POLICIES)) {
  const { queue, rollback } = planSync(syncInput, { policy: pol, generatedAt: NOW });
  writeCsv(`shopify_sync_queue_${pol}.csv`, queue, ['product_id', 'title', 'current_state', 'desired_state', 'reason', 'evidence', 'policy', 'decision_id', 'generated_at']);
  writeCsv(`rollback_${pol}.csv`, rollback.map((r) => ({ ...r, restore_publications: PUBS.has(r.product_id) ? PUBS.get(r.product_id).join(' | ') : 'MISSING_BACKUP' })), ['product_id', 'restore_status', 'restore_publications', 'decision_id']);
}

// live candidates for pass 2: group-B or would-be-B variants lacking live verification
const cand = new Map();
for (const r of rows) {
  if (!r._sv || r.live_verified) continue;
  if (!(r.state === 'STALE' && r.primary_reason === 'LIVE_CHECK_REQUIRED') && r.group !== 'B_SELLABLE_AFTER_FIX') continue;
  const P = r._sv.product; const k = `${P.supplier}:${P.productId}`;
  if (!cand.has(k)) cand.set(k, { supplier: P.supplier, platform: P.platform, domain: supplierById(P.supplier).domain, handle: P.handle, productId: P.productId, variantIds: new Set() });
  cand.get(k).variantIds.add(r._sv.variantId);
}
fs.writeFileSync(path.join(outDir, 'live_candidates.json'), JSON.stringify([...cand.values()].map((c) => ({ ...c, variantIds: [...c.variantIds] }))));

// ---------------- Summary ----------------
const count = (arr, f) => arr.reduce((m, x) => { const k = f(x); m[k] = (m[k] ?? 0) + 1; return m; }, {});
const active = rows.filter((r) => r.shopify_status === 'ACTIVE');
const summary = {
  generated_at: NOW, pricing_policy: CURRENT_POLICY.version, live_runs_loaded: LIVE.size,
  shopify: { products: products.size, variants: variants.length, by_status: count([...products.values()], (p) => p.status) },
  groups: count(rows, (r) => r.group), groups_active: count(active, (r) => r.group),
  states: count(rows, (r) => r.state), states_active: count(active, (r) => r.state),
  purchasable_now: { variants: rows.filter((r) => r.purchasable_now).length, unavailable_at_supplier: rows.filter((r) => r.purchasable_now && r.supplier_stock === 'UNAVAILABLE').length,
    loss_making: rows.filter((r) => r.purchasable_now && r.profit_net !== '' && num(r.profit_net) < 0 && r.shipping_cost !== '').length },
  reasons: Object.fromEntries(Object.entries(count(rows, (r) => `${r.state}:${r.primary_reason}`)).sort((a, b) => b[1] - a[1])),
  match: count(rows.filter((r) => r.match_status), (r) => `${r.match_status}|${r.match_class}|${r.match_method}`),
  match_class: count(rows, (r) => r.match_class || r.match_status),
  sku_proposals: count(skuProps, (p) => p.status), sku_collisions: count(skuProps, (p) => p.collision_status),
  publish_candidates: { products: publish.length, variants: publish.reduce((a, p) => a + p.eligible_variants, 0) },
  fixes: { products: fixes.length, by_effort: count(fixes, (f) => f.effort), by_type: count(fixes, (f) => f.fix_types) },
  opportunities: count(opps, (o) => o.type), opportunities_by_supplier: count(opps.filter((o) => o.type === 'NEW_PRODUCT'), (o) => o.supplier),
  sync_dry_run: Object.fromEntries(Object.values(SYNC_POLICIES).map((pol) => { const { queue } = planSync(syncInput, { policy: pol, generatedAt: NOW }); return [pol, count(queue, (q) => `${q.current_state}->${q.desired_state}`)]; })),
  live_candidates: { products: cand.size, variants: [...cand.values()].reduce((a, c) => a + c.variantIds.size, 0) },
  supplier_variants: supplierVariantsAll.length, supplier_products: Object.values(SUPPLIER_PRODUCTS).reduce((a, l) => a + l.length, 0),
};
fs.writeFileSync(path.join(outDir, 'summary.json'), JSON.stringify(summary, null, 2));

// ---------------- Dashboard data (Phase 20) ----------------
const pick = (o, ks) => Object.fromEntries(ks.map((k) => [k, o[k]]));
const PUB = ['product_id', 'title', 'supplier', 'shopify_status', 'eligible_variants', 'total_variants', 'best_net', 'avg_margin_pct', 'min_confidence', 'match_methods', 'still_missing', 'evidence_url'];
const byConf = [...publish].sort((a, b) => b.min_confidence - a.min_confidence || b.best_net - a.best_net);
const dash = {
  generated_at: NOW, pricing_policy: CURRENT_POLICY.version,
  tiles: {
    total_discovered: supplierVariantsAll.length,
    matched: rows.filter((r) => ['AUTO_CANDIDATE', 'HIGH_CONFIDENCE'].includes(r.match_class)).length,
    live_verified: rows.filter((r) => r.live_verified).length,
    sellable: rows.filter((r) => r.state === 'SELLABLE').length,
    blocked: rows.filter((r) => r.state !== 'SELLABLE').length,
    no_supplier: summary.groups.G_NO_SUPPLIER ?? 0, no_stock: summary.groups.D_NEEDS_STOCK ?? 0, no_shipping: summary.groups.E_NEEDS_SHIPPING ?? 0,
    profit_blocked: summary.groups.F_PROFIT_BLOCKED ?? 0, data_quality: summary.groups.H_DATA_QUALITY ?? 0, stale: summary.groups.I_UNKNOWN ?? 0,
    needs_match: summary.groups.C_NEEDS_MATCH ?? 0, after_fix: summary.groups.B_SELLABLE_AFTER_FIX ?? 0,
  },
  shopify: summary.shopify, purchasable_now: summary.purchasable_now, groups: summary.groups, groups_active: summary.groups_active,
  reasons: Object.entries(summary.reasons).slice(0, 25),
  suppliers: health.map((h) => pick(h, ['supplier_id', 'supplier_name', 'documented', 'status', 'shipping_status', 'catalog_variants', 'available', 'shopify_variants_tagged', 'matched_auto', 'matched_high', 'mapping_coverage_pct', 'live_verified_candidates', 'median_candidate_net'])),
  top_publish: publish.slice(0, 100).map((p) => pick(p, PUB)),
  top_profit: byProfit.slice(0, 100).map((p) => pick(p, PUB)),
  top_confidence: byConf.slice(0, 100).map((p) => pick(p, PUB)),
  top_fix: fixes.slice(0, 100),
  top_opportunities: opps.filter((o) => o.type === 'NEW_PRODUCT').slice(0, 100).map((o) => pick(o, ['supplier', 'title', 'brand', 'available_variants', 'supplier_cost_max', 'shipping_status', 'shipping_cost', 'suggested_min_price', 'implied_markup_pct', 'has_supplier_sku', 'url'])),
};
fs.writeFileSync(path.join(outDir, 'dashboard_data.json'), JSON.stringify(dash));
console.log(JSON.stringify({ groups: summary.groups, groups_active: summary.groups_active, match_class: summary.match_class, live_candidates: summary.live_candidates, publish: summary.publish_candidates }, null, 1));
