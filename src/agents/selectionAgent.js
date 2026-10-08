// Product Selection Agent.
// DISCOVER -> NORMALIZE -> DEDUP -> MATCH -> LIVE_VERIFY -> STOCK -> SHIPPING -> PRICE -> PROFIT -> RISK -> SELLABLE
// Output statuses: CANDIDATE | AUTO_READY | REVIEW_REQUIRED | BLOCKED. Nothing else.
// The agent cannot publish, approve, or write anywhere: it has no Shopify/D1 handle and returns frozen data.
// Only a human approval (outside the agent) can move a product toward publication.
import { normSku } from '../core/normalize.js';
import { findDuplicates, DUP } from '../core/duplicates.js';
import { evaluateSellable } from '../core/sellable.js';
import { quote } from '../core/pricingEngine.js';
import { pilotScore } from '../core/pilotScore.js';
import { verifiedBrand } from '../core/productData.js';

export const AGENT_STATUSES = Object.freeze(['CANDIDATE', 'AUTO_READY', 'REVIEW_REQUIRED', 'BLOCKED']);
export const STAGES = Object.freeze(['DISCOVER', 'NORMALIZE', 'DEDUP', 'MATCH', 'LIVE_VERIFY', 'STOCK', 'SHIPPING', 'PRICE', 'PROFIT', 'RISK', 'SELLABLE']);

// Reasons that depend on people/infrastructure, not on the product: they keep a product out of
// SELLABLE but do not make the product itself bad.
const SYSTEM_REASONS = new Set(['SUPPLIER_UNKNOWN', 'KILL_SWITCH_ON', 'PRODUCTION_TARGET']);
const REVIEW_BAND = [0.75, 0.95];

/*
 input = {
   records: supplier adapter records (src/suppliers/adapters.js), each optionally with
            { live: { price, stock, compare_at, checkedAt, variantExists } } from a live check,
   shopify: [{ variantId, productId, sku, size, price, title }],   // existing listings (read-only snapshot)
   policy, now, killSwitch, target, supplierVerified: { [code]: bool },
   priceHistory: { [supplier:variant]: changes30d }
 }
*/
export function runSelectionAgent(input) {
  const { records = [], shopify = [], policy, now = new Date().toISOString(), killSwitch, target, supplierVerified = {}, priceHistory = {} } = input ?? {};
  // DEDUP across supplier records
  const dups = findDuplicates(records.map((r, i) => ({ id: i, sku: r.sku === 'UNKNOWN' ? null : r.sku, barcode: r.barcode === 'UNKNOWN' ? null : r.barcode, brand: r.brand, title: r.title, size: r.size, supplierCode: r.supplier, supplierSku: r.sku })));
  // MATCH by exact SKU (+ size) against the Shopify snapshot
  const bySku = new Map();
  for (const s of shopify) { const k = normSku(s.sku); if (!k) continue; if (!bySku.has(k)) bySku.set(k, []); bySku.get(k).push(s); }

  const out = records.map((r, i) => {
    const trace = ['DISCOVER', 'NORMALIZE'];
    const reasons = [];
    const dup = dups[i];
    trace.push('DEDUP');
    const k = normSku(r.sku === 'UNKNOWN' ? null : r.sku);
    const hits = k ? bySku.get(k) ?? [] : [];
    trace.push('MATCH');
    const live = r.live ?? null;
    const base = { supplier: r.supplier, sku: r.sku, size: r.size, title: r.title, brand: r.brand, url: r.url, duplicate: dup.class };
    if (!hits.length) {
      // New product candidate: no listing to sell yet. Never auto-created.
      return Object.freeze({ ...base, status: 'CANDIDATE', stage: 'MATCH', reasons: Object.freeze(['NO_SHOPIFY_LISTING']), sellable: false, trace: Object.freeze(trace) });
    }
    const listing = hits[0];
    if (live) trace.push('LIVE_VERIFY', 'STOCK', 'SHIPPING', 'PRICE', 'PROFIT', 'RISK', 'SELLABLE');
    const price = live?.price ?? null;
    const q = policy ? quote({ cost: price, shipping: r.shipping?.cost, policy, sellingPrice: listing.price }) : null;
    const risk = [];
    if (!verifiedBrand(r.brand)) risk.push('BRAND_UNKNOWN');
    if (Number(live?.compare_at) > Number(price)) risk.push('SUPPLIER_PROMOTION');
    if (dup.class === DUP.LIKELY) risk.push('LIKELY_DUPLICATE');
    const s = evaluateSellable({
      now, killSwitch, target,
      supplier: { code: r.supplier, verified: supplierVerified[r.supplier] === true },
      mapping: { shopifySku: listing.sku, supplierSku: r.sku, shopifySize: listing.size, supplierSize: r.size === 'UNKNOWN' ? '' : r.size, variantVerified: Boolean(live?.variantExists), confidence: hits.length === 1 && dup.class !== DUP.EXACT ? 1 : 0.5, duplicate: hits.length > 1 || dup.class === DUP.EXACT },
      live: live ? { price, currency: r.currency, stock: live.stock, checkedAt: live.checkedAt, variantExists: live.variantExists } : {},
      shipping: r.shipping,
      pricing: { sellingPrice: listing.price, policy: policy ? { ...policy, version: policy.version } : undefined },
      risk: { pass: risk.filter((x) => x !== 'SUPPLIER_PROMOTION').length === 0, reasons: risk },
      blocks: [],
    });
    reasons.push(...s.reasons);
    const productReasons = s.reasons.filter((x) => !SYSTEM_REASONS.has(x));
    const conf = hits.length === 1 && dup.class !== DUP.EXACT ? 1 : 0.5;
    let status;
    if (!live) status = 'CANDIDATE';
    else if (productReasons.length === 0) status = 'AUTO_READY'; // ready for HUMAN approval; never published by the agent
    else if (productReasons.every((x) => x === 'RISK_BLOCKED' || (x === 'LOW_CONFIDENCE' && conf >= REVIEW_BAND[0]))) status = 'REVIEW_REQUIRED';
    else status = 'BLOCKED';
    const score = pilotScore({
      stock: live?.stock, shippingKnown: r.shipping?.cost != null, skuExact: hits.length === 1,
      priceChanges30d: priceHistory[`${r.supplier}:${r.variant_id}`] ?? null, supplierPrice: price, supplierCompareAt: live?.compare_at,
      brandVerified: Boolean(verifiedBrand(r.brand)), marginPct: q?.margin, net: q?.net_profit, risk: risk.length === 0 ? 'LOW' : risk.length === 1 ? 'MEDIUM' : 'HIGH',
      sizesInStock: r.sizesInStock, sizesTotal: r.sizesTotal,
    });
    return Object.freeze({
      ...base, status, stage: live ? 'SELLABLE' : 'MATCH', reasons: Object.freeze(reasons), productReasons: Object.freeze(productReasons), risk: Object.freeze(risk),
      sellable: s.sellable, metrics: s.metrics, quote: q, score: score.score, shopifyVariantId: listing.variantId, shopifyProductId: listing.productId,
      confidence: conf, lastVerified: live?.checkedAt ?? null, trace: Object.freeze(trace),
    });
  });
  return Object.freeze(out);
}

export function summarizeAgent(results) {
  const by = Object.fromEntries(AGENT_STATUSES.map((s) => [s, 0]));
  const reasons = {};
  for (const r of results) { by[r.status]++; for (const x of r.productReasons ?? r.reasons) reasons[x] = (reasons[x] ?? 0) + 1; }
  return { total: results.length, ...by, sellable: results.filter((r) => r.sellable).length, reasons };
}
