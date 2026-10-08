// Pilot candidate selection (read-only).
// Discovery -> mapping (SKU exact, from the classified catalog) -> LIVE supplier check (GET .js)
// -> shipping -> profit -> price policy (proposal) -> SELLABLE gate -> Selection Agent ranking.
// Writes a CSV for the owner. Never writes to Shopify, D1 or any supplier.
// Usage: node tools/pilot_candidates.mjs <pool.json> <variants_classified.csv> <out.csv> [live_out.jsonl]
import fs from 'node:fs';
import { shippingFor } from '../src/core/shipping.js';
import { evaluateProfit } from '../src/core/pricing.js';
import { shopifyStock } from '../src/core/stock.js';
import { classifyVariant } from '../src/core/eligibility.js';
import { pricePolicy, selectionScore } from '../src/core/selection.js';

const [poolFile, csvFile, outFile, liveOut] = process.argv.slice(2);
const UA = 'Mozilla/5.0 (compatible; SportproLiveVerify/0.1; read-only)';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Blockers that apply to every candidate until the owner/infra fixes them (evidence: Phase 1A report).
const PROGRAM_BLOCKERS = (process.env.PROGRAM_BLOCKERS ?? 'MAPPING_NOT_APPROVED;SUPPLIER_NOT_REGISTERED_IN_D1;SUPPLIER_CHECKOUT_NOT_VALIDATED;PRICING_TIERS_PENDING;STAGING_NOT_ISOLATED').split(';').filter(Boolean);

const parse = (t) => { const [h, ...rows] = t.replace(/^﻿/, '').split('\n').filter(Boolean); const cols = h.split(','); const out = [];
  for (const line of rows) { const v = []; let cur = '', q = false; for (let i = 0; i < line.length; i++) { const ch = line[i]; if (q) { if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; } else if (ch === '"') q = false; else cur += ch; } else if (ch === '"') q = true; else if (ch === ',') { v.push(cur); cur = ''; } else cur += ch; } v.push(cur); out.push(Object.fromEntries(cols.map((c, i) => [c, v[i]]))); } return out; };

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

const pool = JSON.parse(fs.readFileSync(poolFile, 'utf8'));
const rows = parse(fs.readFileSync(csvFile, 'utf8'));
const byVid = new Map(rows.filter((r) => r.supplier_variant_id).map((r) => [`${r.supplier_tag}:${r.supplier_variant_id}`, r]));
const liveW = liveOut ? fs.createWriteStream(liveOut) : null;

const stats = { pool_products: pool.length, pool_variants: 0, mapped_sku_exact: 0, live_ok: 0, live_available: 0, live_unavailable: 0, live_gone: 0, price_changed: 0, gate: {}, sellable: 0, excluded: {}, ranked_variants: 0 };
const ranked = [];
for (const c of pool) {
  const url = `https://${c.domain}/products/${encodeURIComponent(c.handle)}.js`;
  const { status, body } = await get(url);
  const checkedAt = new Date().toISOString();
  const imgs = Array.isArray(body?.images) ? body.images.length : 0;
  const perProduct = [];
  for (const vid of c.variantIds) {
    stats.pool_variants++;
    const r = byVid.get(`${c.supplier}:${vid}`);
    if (!r) continue;
    if (r.match_method === 'SKU_EXACT') stats.mapped_sku_exact++;
    const v = body?.variants?.find((x) => String(x.id) === String(vid));
    const live = { supplier: c.supplier, supplier_variant_id: String(vid), url, http_status: status, url_ok: status === 200, variant_exists: Boolean(v),
      stock: v ? shopifyStock(v.available) : 'UNKNOWN', price: v ? v.price / 100 : null, compare_at: v?.compare_at_price ? v.compare_at_price / 100 : null,
      currency: v ? 'ILS' : null, sku: v?.sku ?? null, images: imgs, vendor: body?.vendor ?? null, checked_at: checkedAt, method: 'SHOPIFY_PRODUCT_JS' };
    liveW?.write(JSON.stringify(live) + '\n');
    if (status === 200) stats.live_ok++;
    if (!v) { stats.live_gone++; continue; }
    if (live.stock === 'AVAILABLE') stats.live_available++; else stats.live_unavailable++;
    const scanCost = Number(r.supplier_cost);
    const priceChanged = scanCost > 0 && Math.abs(scanCost - live.price) > 0.009;
    if (priceChanged) stats.price_changed++;
    perProduct.push({ r, live, priceChanged });
  }
  const sizesInStock = perProduct.filter((x) => x.live.stock === 'AVAILABLE').length;
  for (const { r, live, priceChanged } of perProduct) {
    const sellPrice = Number(r.price);
    const ship = shippingFor(c.supplier, { unitCost: live.price });
    const profit = evaluateProfit({ sellingPrice: sellPrice, supplierCost: live.price, shippingCost: ship.cost });
    const gate = classifyVariant({
      now: new Date().toISOString(),
      shopify: { productStatus: r.shopify_status, price: sellPrice, mediaCount: Number(r.media_count), duplicateSku: Number(r.sku_duplicate_count) > 1 },
      supplier: { key: c.supplier, supported: true, feedOk: true, blocked: false, checkoutVerified: false },
      match: { status: 'MATCHED', cls: r.match_class },
      live: { fetchedAt: live.checked_at, stock: live.stock, cost: live.price, currency: live.currency, verified: true, variantExists: live.variant_exists, urlOk: live.url_ok },
      shipping: ship, profit, risk: {}, approval: { mappingApproved: false },
    });
    stats.gate[gate.state] = (stats.gate[gate.state] ?? 0) + 1;
    if (gate.state === 'SELLABLE') stats.sellable++;
    const policy = pricePolicy({ supplierCost: live.price, shippingCost: ship.cost });
    const sel = selectionScore({
      stock: live.stock, sizesInStock, supplierPrice: live.price, supplierCompareAt: live.compare_at, priceChangedSinceScan: priceChanged,
      supplierImages: live.images, shopifyMedia: Number(r.media_count), brand: r.vendor || live.vendor, sku: r.sku, skuDuplicate: Number(r.sku_duplicate_count) > 1,
      mappingConfidence: Number(r.match_confidence), matchMethod: r.match_method, shippingStatus: ship.status,
      net: profit.net, marginPct: profit.marginPct, markupPct: profit.markupPct,
    });
    if (sel.excluded) { stats.excluded[sel.demotions[0]] = (stats.excluded[sel.demotions[0]] ?? 0) + 1; continue; }
    if (profit.pass === false) { stats.excluded[profit.reason] = (stats.excluded[profit.reason] ?? 0) + 1; continue; }
    stats.ranked_variants++;
    const sellable = gate.state === 'SELLABLE' && PROGRAM_BLOCKERS.length === 0;
    ranked.push({
      supplier: 'Foot Locker IL', product: r.product_title, variant: r.variant_title, sku: r.sku,
      supplier_price: live.price, shipping: ship.cost, selling_price: sellPrice, net_profit: profit.net, margin: profit.marginPct, markup: profit.markupPct,
      stock_status: live.stock, mapping_confidence: Number(r.match_confidence), risk_status: sel.risk, SELLABLE: sellable ? 'YES' : 'NO',
      blocking_reason: [gate.state === 'SELLABLE' ? null : `${gate.state}:${gate.primaryReason}`, ...PROGRAM_BLOCKERS].filter(Boolean).join(';'),
      selection_score: sel.score, demotions: sel.demotions.join(';'), gate_state: gate.state,
      policy_price: policy.price, policy_status: policy.status, policy_net: policy.net ?? null, policy_margin: policy.marginPct ?? null,
      supplier_compare_at: live.compare_at, sizes_in_stock: sizesInStock, sizes_total: perProduct.length, supplier_images: live.images,
      shopify_status: r.shopify_status, shopify_product_id: r.product_id, shopify_variant_id: r.variant_id, supplier_variant_id: live.supplier_variant_id,
      supplier_url: url.replace(/\.js$/, ''), live_checked_at: live.checked_at, shipping_rule: ship.rule, product_key: c.shopify_product_id ?? r.product_id,
    });
  }
  await sleep(500);
}
liveW?.end();

// Best variant per product, then top 10 distinct products by selection score.
const bestByProduct = new Map();
for (const x of ranked) { const b = bestByProduct.get(x.product_key); if (!b || x.selection_score > b.selection_score) bestByProduct.set(x.product_key, x); }
const seen = new Set(); const top = [];
for (const x of [...bestByProduct.values()].sort((a, b) => b.selection_score - a.selection_score || b.net_profit - a.net_profit)) {
  const k = x.product.replace(/\s+/g, ' ').trim(); if (seen.has(k)) continue; seen.add(k); top.push(x); if (top.length === 10) break;
}
const cols = ['rank', 'supplier', 'product', 'variant', 'SKU', 'supplier_price', 'shipping', 'selling_price', 'net_profit', 'margin', 'markup', 'stock_status', 'mapping_confidence', 'risk_status', 'SELLABLE', 'blocking_reason',
  'selection_score', 'demotions', 'gate_state', 'policy_price', 'policy_status', 'policy_net', 'policy_margin', 'supplier_compare_at', 'sizes_in_stock', 'sizes_total', 'supplier_images', 'shopify_status', 'shopify_product_id', 'shopify_variant_id', 'supplier_variant_id', 'supplier_url', 'live_checked_at', 'shipping_rule'];
const esc = (v) => { const s = v == null ? '' : String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
const lines = [cols.join(',')];
top.forEach((x, i) => lines.push(cols.map((c) => esc(c === 'rank' ? i + 1 : c === 'SKU' ? x.sku : x[c])).join(',')));
fs.writeFileSync(outFile, '﻿' + lines.join('\n') + '\n');
stats.products_ranked = bestByProduct.size;
console.log(JSON.stringify({ stats, top: top.map((x, i) => ({ rank: i + 1, product: x.product, variant: x.variant, sku: x.sku, supplier_price: x.supplier_price, shipping: x.shipping, selling_price: x.selling_price, net: x.net_profit, margin: x.margin, markup: x.markup, stock: x.stock_status, risk: x.risk_status, score: x.selection_score, demotions: x.demotions, policy_price: x.policy_price, policy_status: x.policy_status, policy_net: x.policy_net, policy_margin: x.policy_margin, sizes: `${x.sizes_in_stock}/${x.sizes_total}`, shopify_status: x.shopify_status, gate: x.gate_state, url: x.supplier_url, svid: x.supplier_variant_id, compare_at: x.supplier_compare_at })) }, null, 1));
