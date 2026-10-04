// Read-only catalog audit. Joins a Shopify bulk export, supplier scans and the Shopify event log,
// runs every Shopify variant through the SELLABLE gate and writes CSV exports.
// It performs NO network calls and NO writes outside <outDir>.
//
// Usage: node tools/audit_catalog.mjs <dataDir> <outDir>
//   dataDir must contain: shopify_full.jsonl, suppliers/*.jsonl, suppliers/_scan_summary.json,
//   events*.jsonl (Shopify events bulk exports)
import fs from 'node:fs';
import path from 'node:path';
import { normKey, normSku, optionSignature, normText } from '../src/core/normalize.js';
import { shippingFor } from '../src/core/shipping.js';
import { evaluateProfit } from '../src/core/pricing.js';
import { classifyVariant, STATES } from '../src/core/eligibility.js';

const [dataDir, outDir] = process.argv.slice(2);
if (!dataDir || !outDir) { console.error('usage: audit_catalog.mjs <dataDir> <outDir>'); process.exit(2); }
fs.mkdirSync(outDir, { recursive: true });
const readJsonl = (f) => fs.readFileSync(f, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));

// ---------- supplier registry ----------
const DOCUMENTED = new Set(['megasport', 'arosport', 'bashgal', 'dugit', 'energym', 'arena', 'sportstock', 'kdhockey', 'decathlon']);
const FEEDS = {
  megasport: 'https://www.megasport.co.il/products.json', arosport: 'https://www.arosport.co.il/products.json',
  bashgal: 'https://www.bashgal.co.il/products.json', dugit: 'https://www.dugit.co.il/products.json',
  energym: 'https://www.energym.co.il/products.json', footlocker: 'https://www.footlocker.co.il/products.json',
  arena: 'https://www.arenaisrael.co.il/wp-json/wc/store/v1/products', sportstock: 'https://www.sportstock.co.il/wp-json/wc/store/v1/products',
  bealion: 'https://www.bealion.co.il/wp-json/wc/store/v1/products', championshop: 'https://www.championshop.co.il/wp-json/wc/store/v1/products',
};
const NO_FEED_REASON = {
  kdhockey: 'NO_PUBLIC_CATALOG_FEED (Wix; /products.json -> 400)',
  decathlon: 'NO_PUBLIC_CATALOG_FEED (no Shopify/Woo endpoint)',
  'לא זוהה': 'SUPPLIER_UNIDENTIFIED',
  'יבוא אישי': 'PERSONAL_IMPORT_NO_SUPPLIER',
  'Titleist Direct (יבוא אישי)': 'PERSONAL_IMPORT_NO_SUPPLIER',
  sportpro: 'OWN_BRAND_SOURCE_UNKNOWN',
};
function tagClass(tag) {
  if (tag === null) return 'UNKNOWN';
  if (DOCUMENTED.has(tag)) return 'DOCUMENTED';
  if (['לא זוהה', 'יבוא אישי', 'Titleist Direct (יבוא אישי)', 'sportpro'].includes(tag)) return 'UNKNOWN';
  return 'UNDOCUMENTED';
}

// ---------- load Shopify ----------
const products = new Map();
const variants = [];
for (const o of readJsonl(path.join(dataDir, 'shopify_full.jsonl'))) {
  const id = o.id ?? '';
  if (id.includes('/Product/') && !o.__parentId) { o.variants = []; o.collections = []; o.metafields = []; products.set(id, o); }
  else if (id.includes('/ProductVariant/')) { variants.push(o); products.get(o.__parentId).variants.push(o); }
  else if (id.includes('/Collection/')) products.get(o.__parentId)?.collections.push(o);
  else if (o.namespace) { const p = products.get(o.__parentId); if (p) p.metafields.push(o); }
}
const supplierTagOf = (p) => { const t = p.tags.filter((x) => x.startsWith('ספק:')).map((x) => x.slice(4)); return t.length ? t[0] : null; };
const skuCount = new Map();
for (const v of variants) { const s = normSku(v.sku); if (s) skuCount.set(s, (skuCount.get(s) ?? 0) + 1); }

// ---------- load events ----------
const events = fs.readdirSync(dataDir).filter((f) => /^events.*\.jsonl$/.test(f)).flatMap((f) => readJsonl(path.join(dataDir, f)));
const seenEv = new Set();
const prodEvents = events.filter((e) => !seenEv.has(e.id) && seenEv.add(e.id) && e.subjectType === 'PRODUCT');
const clientId = (e) => { const a = e.arguments; if (Array.isArray(a)) { const i = a.indexOf('api_client_id'); if (i >= 0) return a[i + 1]; } return ''; };
const deactivated1001 = new Set(prodEvents.filter((e) => e.action === 'status_changed' && e.createdAt.startsWith('2026-10-01')).map((e) => e.subjectId));

// ---------- load suppliers ----------
const scanSummary = JSON.parse(fs.readFileSync(path.join(dataDir, 'suppliers', '_scan_summary.json'), 'utf8'));
const feedOk = Object.fromEntries(scanSummary.map((s) => [s.supplier, s.ok]));
const decodeHtml = (s) => String(s ?? '').replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n)).replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&#8211;/g, '-').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ');
const safeDecode = (s) => { try { return decodeURIComponent(s); } catch { return s; } };

const SUP = {}; // key -> { products:[{key,title,url,productType,variants:[sv]}], titleIdx, skuIdx }
const supplierVariantsAll = [];
for (const key of Object.keys(FEEDS)) {
  const file = path.join(dataDir, 'suppliers', `${key}.jsonl`);
  if (!fs.existsSync(file)) continue;
  const S = { products: [], titleIdx: new Map(), skuIdx: new Map() };
  for (const rec of readJsonl(file)) {
    const p = rec.p;
    let sp;
    if (rec.platform === 'shopify') {
      const base = FEEDS[key].replace('/products.json', '');
      sp = { supplier: key, platform: 'shopify', productId: String(p.id), title: p.title, handle: p.handle, productType: p.product_type, url: `${base}/products/${p.handle}`, fetchedAt: rec.fetched_at, variants: [] };
      for (const v of p.variants) {
        sp.variants.push({ supplier: key, variantId: String(v.id), productId: sp.productId, sku: normSku(v.sku), barcode: v.barcode || null,
          options: [v.option1, v.option2, v.option3].filter((x) => x !== null && x !== undefined), cost: Number(v.price) || null,
          stock: v.available === true ? 'AVAILABLE' : v.available === false ? 'UNAVAILABLE' : 'UNKNOWN', grams: v.grams || 0,
          url: `${sp.url}?variant=${v.id}`, fetchedAt: rec.fetched_at, product: sp });
      }
    } else {
      const minor = p.prices?.currency_minor_unit ?? 2;
      const price = p.prices?.price ? Number(p.prices.price) / 10 ** minor : null;
      const range = p.prices?.price_range;
      const singlePrice = !range || range.min_amount === range.max_amount;
      sp = { supplier: key, platform: 'woo', productId: String(p.id), title: decodeHtml(p.name), handle: p.slug, productType: (p.categories ?? []).map((c) => decodeHtml(c.name)).join(' / '), url: p.permalink, fetchedAt: rec.fetched_at, variants: [] };
      const vars = p.variations ?? [];
      if (vars.length) {
        for (const v of vars) {
          sp.variants.push({ supplier: key, variantId: String(v.id), productId: sp.productId, sku: null, barcode: null,
            options: (v.attributes ?? []).map((a) => safeDecode(a.value)), cost: singlePrice ? price : null,
            stock: 'UNKNOWN', // Store API does not expose per-variation stock without a cart session
            grams: 0, url: p.permalink, fetchedAt: rec.fetched_at, product: sp });
        }
      } else {
        sp.variants.push({ supplier: key, variantId: String(p.id), productId: sp.productId, sku: normSku(p.sku), barcode: null, options: [], cost: price,
          stock: p.is_in_stock === true ? 'AVAILABLE' : p.is_in_stock === false ? 'UNAVAILABLE' : 'UNKNOWN', grams: 0, url: p.permalink, fetchedAt: rec.fetched_at, product: sp });
      }
    }
    S.products.push(sp);
    const tk = normKey(sp.title);
    if (!S.titleIdx.has(tk)) S.titleIdx.set(tk, []);
    S.titleIdx.get(tk).push(sp);
    for (const sv of sp.variants) {
      supplierVariantsAll.push(sv);
      if (sv.sku) { if (!S.skuIdx.has(sv.sku)) S.skuIdx.set(sv.sku, []); S.skuIdx.get(sv.sku).push(sv); }
    }
  }
  SUP[key] = S;
}

// ---------- matching ----------
function matchVariant(p, v, key) {
  const S = SUP[key];
  const sig = optionSignature((v.selectedOptions ?? []).map((o) => o.value));
  const sku = normSku(v.sku);
  let skuCand = null; let skuAmb = false;
  if (sku && S.skuIdx.has(sku)) {
    const l = S.skuIdx.get(sku);
    // supplier SKUs are often per-style; narrow by exact size/color signature
    const narrowed = l.length === 1 ? l : l.filter((sv) => optionSignature(sv.options) === sig);
    if (narrowed.length === 1) skuCand = narrowed[0]; else skuAmb = true;
  }
  const tps = S.titleIdx.get(normKey(p.title)) ?? [];
  let titleCand = null; let titleReason = null;
  if (tps.length === 1) {
    const sp = tps[0];
    const hits = sp.variants.filter((sv) => optionSignature(sv.options) === sig);
    if (hits.length === 1) titleCand = hits[0];
    else if (!sig && sp.variants.length === 1) titleCand = sp.variants[0];
    else if (hits.length) titleReason = 'AMBIGUOUS_VARIANT';
    else if (!sig && sp.variants.length > 1) titleReason = 'SHOPIFY_COLLAPSED_VARIANTS';
    else if (sig && sp.variants.every((sv) => !optionSignature(sv.options))) titleReason = 'SUPPLIER_HAS_NO_VARIANTS';
    else titleReason = 'OPTION_NOT_OFFERED_BY_SUPPLIER';
  } else titleReason = tps.length ? 'AMBIGUOUS_PRODUCT' : 'NO_PRODUCT_MATCH';

  if (skuCand && titleCand) {
    if (skuCand === titleCand) return { status: 'MATCHED', tier: 'EXACT', method: 'SKU_EXACT+TITLE_OPTIONS_EXACT', sv: skuCand };
    return { status: 'CONFLICT', reason: 'SKU_TITLE_CONFLICT', fix: 'SKU and title/options point to different supplier variants; owner review', sv: null };
  }
  if (skuCand) {
    const ssig = optionSignature(skuCand.options);
    if (sig && ssig && ssig !== sig) return { status: 'CONFLICT', reason: 'SKU_OPTIONS_MISMATCH', fix: 'SKU matches but size/color differ; owner review', sv: null };
    return { status: 'MATCHED', tier: 'EXACT', method: 'SKU_EXACT', sv: skuCand };
  }
  if (titleCand) return { status: 'MATCHED', tier: 'HIGH', method: 'TITLE_OPTIONS_EXACT', confidence: 0.95, sv: titleCand };
  if (skuAmb) return { status: 'AMBIGUOUS', reason: 'AMBIGUOUS_SKU', fix: 'SKU used by several supplier variants', sv: null };
  const fix = { NO_PRODUCT_MATCH: 'Supplier product not found in current feed (renamed/removed); search supplier', AMBIGUOUS_PRODUCT: 'Several supplier products share this title', AMBIGUOUS_VARIANT: 'Several supplier variants share these options',
    OPTION_NOT_OFFERED_BY_SUPPLIER: 'Shopify offers a size/color the supplier does not list (or a different size system, e.g. EU vs UK); remove variant or map size chart',
    SHOPIFY_COLLAPSED_VARIANTS: 'Shopify has one variant but supplier sells several (color/size/level); split variants to match supplier',
    SUPPLIER_HAS_NO_VARIANTS: 'Supplier sells one unsized item but Shopify offers sizes; size availability unverifiable' }[titleReason];
  return { status: titleReason.startsWith('AMBIGUOUS') ? 'AMBIGUOUS' : 'NONE', reason: titleReason, fix, sv: null };
}

const NOW = new Date().toISOString();
const rows = [];
for (const v of variants) {
  const p = products.get(v.__parentId);
  const tag = supplierTagOf(p);
  const key = tag && SUP[tag] ? tag : null;
  const supported = Boolean(key);
  const m = supported ? matchVariant(p, v, key) : { status: 'NONE', reason: null };
  rows.push({ p, v, tag, key, supported, m });
}
// duplicate supplier mapping: >1 Shopify variant -> same supplier variant
const svUse = new Map();
for (const r of rows) if (r.m.sv) { const k = `${r.key}:${r.m.sv.variantId}`; svUse.set(k, (svUse.get(k) ?? 0) + 1); }

const out = [];
for (const r of rows) {
  const { p, v, tag, key, supported, m } = r;
  const sv = m.sv;
  const sku = normSku(v.sku);
  const dupSku = sku ? skuCount.get(sku) > 1 : false;
  const shipping = sv ? shippingFor(key, { unitCost: sv.cost, grams: sv.grams, productType: sv.product.productType || p.productType }) : null;
  const profit = sv ? evaluateProfit({ sellingPrice: Number(v.price), supplierCost: sv.cost, shippingCost: shipping?.cost }) : null;
  const cls = classifyVariant({
    now: NOW,
    shopify: { productStatus: p.status, price: Number(v.price), mediaCount: p.mediaCount?.count ?? 0, duplicateSku: dupSku },
    supplier: { key: tag, supported, feedOk: key ? feedOk[key] : false, unsupportedReason: tag ? (NO_FEED_REASON[tag] ?? 'SUPPLIER_NOT_ONBOARDED') : null, checkoutVerified: false },
    match: m,
    live: sv ? { fetchedAt: sv.fetchedAt, stock: sv.stock, cost: sv.cost } : { fetchedAt: NOW },
    shipping, profit,
    risk: { duplicateSupplierMapping: sv ? svUse.get(`${key}:${sv.variantId}`) > 1 : false },
    approval: { mappingApproved: false }, // D1 mapping approvals not readable (BLOCKED) -> fail closed
  });
  if (!STATES.includes(cls.state)) throw new Error(`state outside closed set: ${cls.state}`);
  out.push({
    variant_id: v.id.split('/').pop(), product_id: p.id.split('/').pop(), handle: p.handle, product_title: p.title, variant_title: v.title,
    shopify_status: p.status, vendor: p.vendor, product_type: p.productType, supplier_tag: tag ?? '', supplier_tag_class: tagClass(tag),
    sku: v.sku ?? '', sku_duplicate_count: sku ? skuCount.get(sku) : 0, barcode: v.barcode ?? '', price: v.price, compare_at_price: v.compareAtPrice ?? '',
    inventory_qty: v.inventoryQuantity ?? '', inventory_policy: v.inventoryPolicy, inventory_tracked: v.inventoryItem?.tracked ?? '',
    media_count: p.mediaCount?.count ?? 0, collections_count: p.collections.length, gender_metafield: p.metafields.find((x) => x.key === 'gender')?.value ?? '',
    product_created_at: p.createdAt, product_updated_at: p.updatedAt, deactivated_2026_10_01: deactivated1001.has(p.id),
    match_status: m.status, match_tier: m.tier ?? '', match_method: m.method ?? '', match_reason: m.reason ?? '',
    supplier_product_url: sv?.url ?? '', supplier_variant_id: sv?.variantId ?? '', supplier_sku: sv?.sku ?? '', supplier_options: sv ? sv.options.join(' / ') : '',
    supplier_cost: sv?.cost ?? '', supplier_stock: sv?.stock ?? '', supplier_fetched_at: sv?.fetchedAt ?? '',
    shipping_status: shipping?.status ?? '', shipping_cost: shipping?.cost ?? '', shipping_rule: shipping?.rule ?? '',
    profit_net: profit?.net ?? '', profit_margin_pct: profit?.marginPct ?? '', profit_pass: profit ? profit.pass : '', profit_reason: profit?.reason ?? '',
    state: cls.state, primary_reason: cls.primaryReason ?? '', fix: cls.fix ?? '',
  });
}

// ---------- CSV writer ----------
const esc = (x) => { const s = x === null || x === undefined ? '' : String(x); return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
function writeCsv(name, recs, cols) {
  cols = cols ?? Object.keys(recs[0] ?? {});
  const body = [cols.join(','), ...recs.map((r) => cols.map((c) => esc(r[c])).join(','))].join('\n');
  fs.writeFileSync(path.join(outDir, name), '﻿' + body + '\n'); // BOM so Excel renders Hebrew
  return recs.length;
}

writeCsv('shopify_variants.csv', out);
const CANDIDATE_STATES = new Set(['SELLABLE', 'AUTO_READY', 'OWNER_APPROVAL', 'DATA_FIX']);
writeCsv('sellable_candidates.csv', out.filter((r) => CANDIDATE_STATES.has(r.state)));
writeCsv('blockers.csv', out.filter((r) => r.state !== 'SELLABLE'), ['variant_id', 'product_id', 'product_title', 'variant_title', 'shopify_status', 'supplier_tag', 'state', 'primary_reason', 'fix', 'match_reason', 'supplier_stock', 'shipping_status', 'shipping_rule', 'profit_reason', 'supplier_product_url']);
writeCsv('mappings.csv', out.filter((r) => r.match_status === 'MATCHED').map((r) => ({
  shopify_product_id: r.product_id, shopify_variant_id: r.variant_id, shopify_status: r.shopify_status, supplier: r.supplier_tag,
  supplier_product_url: r.supplier_product_url, supplier_variant_id: r.supplier_variant_id, shopify_sku: r.sku, supplier_sku: r.supplier_sku,
  size_color_shopify: r.variant_title, size_color_supplier: r.supplier_options, tier: r.match_tier, method: r.match_method,
  confidence: r.match_tier === 'EXACT' ? 1 : 0.95, source: 'audit_catalog.mjs (PROPOSED, not approved)', last_verified: r.supplier_fetched_at,
  live_price: r.supplier_cost, live_stock: r.supplier_stock, shipping: r.shipping_cost, shipping_status: r.shipping_status,
  status: r.state, blocked_reason: r.primary_reason,
})));
writeCsv('supplier_catalog.csv', supplierVariantsAll.map((sv) => ({
  supplier: sv.supplier, platform: sv.product.platform, supplier_product_id: sv.productId, supplier_variant_id: sv.variantId,
  title: sv.product.title, product_type: sv.product.productType, options: sv.options.join(' / '), sku: sv.sku ?? '', barcode: sv.barcode ?? '',
  cost: sv.cost ?? '', stock_status: sv.stock, grams: sv.grams || '', url: sv.url, fetched_at: sv.fetchedAt,
  mapped_shopify_variants: svUse.get(`${sv.supplier}:${sv.variantId}`) ?? 0,
})));

// supplier tags
const tagRows = new Map();
for (const p of products.values()) {
  const t = supplierTagOf(p) ?? '(none)';
  if (!tagRows.has(t)) tagRows.set(t, { supplier_tag: t, classification: tagClass(t === '(none)' ? null : t), feed: FEEDS[t] ?? '', feed_ok: FEEDS[t] ? Boolean(feedOk[t]) : false, unsupported_reason: FEEDS[t] ? '' : (NO_FEED_REASON[t] ?? (t === '(none)' ? 'NO_SUPPLIER_TAG' : 'SUPPLIER_NOT_ONBOARDED')), products: 0, active: 0, draft: 0, archived: 0, variants: 0, active_variants: 0, deactivated_2026_10_01: 0 });
  const r = tagRows.get(t);
  r.products++; r[p.status.toLowerCase()]++; r.variants += p.variants.length; if (p.status === 'ACTIVE') r.active_variants += p.variants.length;
  if (deactivated1001.has(p.id)) r.deactivated_2026_10_01++;
}
writeCsv('supplier_tags.csv', [...tagRows.values()].sort((a, b) => b.products - a.products));

// production mutations (product status / publication events)
const titleOf = (id) => products.get(id)?.title ?? '';
const mut = prodEvents.filter((e) => ['status_changed', 'unpublished', 'published', 'create', 'destroy'].includes(e.action)).sort((a, b) => a.createdAt.localeCompare(b.createdAt)).map((e) => {
  const m2 = /from (\w+) to (\w+)/.exec(e.message ?? '');
  const ch = /(?:from|in|to) ([^:]+?):/.exec(e.message ?? '');
  const t = e.createdAt;
  const batch = t >= '2026-10-01T07:35' && t < '2026-10-01T07:44' ? 'B1_2026-10-01T07:35-07:43_bulk' : t >= '2026-10-01T10:16' && t < '2026-10-01T10:23' ? 'B2_2026-10-01T10:16-10:22_trickle' : '';
  const p = products.get(e.subjectId);
  return { created_at: t, app_title: e.appTitle ?? '', api_client_id: clientId(e), attribute_to_user: e.attributeToUser, action: e.action,
    from_status: m2?.[1] ?? '', to_status: m2?.[2] ?? '', channel: e.action.endsWith('published') ? (ch?.[1] ?? '') : '',
    product_id: e.subjectId.split('/').pop(), product_title: titleOf(e.subjectId), supplier_tag: p ? (supplierTagOf(p) ?? '') : '', current_status: p?.status ?? '(deleted?)', batch };
});
writeCsv('production_mutations.csv', mut);

// ---------- summary ----------
const count = (arr, f) => arr.reduce((m, x) => { const k = f(x); m[k] = (m[k] ?? 0) + 1; return m; }, {});
const summary = {
  generated_at: NOW,
  shopify: { products: products.size, variants: variants.length, by_status: count([...products.values()], (p) => p.status) },
  states: count(out, (r) => r.state),
  states_active_only: count(out.filter((r) => r.shopify_status === 'ACTIVE'), (r) => r.state),
  states_by_supplier: Object.fromEntries(Object.entries(count(out, (r) => `${r.supplier_tag || '(none)'}|${r.state}`)).sort()),
  primary_reasons: Object.fromEntries(Object.entries(count(out, (r) => `${r.state}:${r.primary_reason}`)).sort((a, b) => b[1] - a[1])),
  match: count(out.filter((r) => r.match_status), (r) => `${r.match_status}|${r.match_tier}|${r.match_method}`),
  supplier_variants: supplierVariantsAll.length, events_loaded: prodEvents.length,
};
fs.writeFileSync(path.join(outDir, 'summary.json'), JSON.stringify(summary, null, 2));
console.log(JSON.stringify({ states: summary.states, states_active_only: summary.states_active_only, match: summary.match }, null, 1));
