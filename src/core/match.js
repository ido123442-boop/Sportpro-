// Deterministic matching engine: Shopify variant -> supplier variant.
// Pure functions. Fuzzy evidence can never reach HIGH_CONFIDENCE or AUTO_CANDIDATE.
import { normKey, normSku, normText, normSize, optionSignature } from './normalize.js';

export const MATCH_CLASS = Object.freeze({ AUTO_CANDIDATE: 'AUTO_CANDIDATE', HIGH_CONFIDENCE: 'HIGH_CONFIDENCE', MANUAL_REVIEW: 'MANUAL_REVIEW', REJECT: 'REJECT' });

export function classifyConfidence(c) {
  if (!(c >= 0 && c <= 1)) return MATCH_CLASS.REJECT;
  if (c >= 0.95) return MATCH_CLASS.AUTO_CANDIDATE;
  if (c >= 0.90) return MATCH_CLASS.HIGH_CONFIDENCE;
  if (c >= 0.75) return MATCH_CLASS.MANUAL_REVIEW;
  return MATCH_CLASS.REJECT;
}

// Confidence per method (variant level). Ordered by priority.
export const METHOD_CONFIDENCE = Object.freeze({
  SKU_EXACT: 1.0,
  BARCODE_EXACT: 1.0,
  SKU_NORMALIZED: 0.97,
  SIBLING_SKU_PRODUCT_EXACT_OPTIONS: 0.95, // product identified by another variant's exact SKU; this variant's size+color exact
  BRAND_MODEL_SIZE_COLOR: 0.95,
  TITLE_EXACT_OPTIONS: 0.93,
  SIBLING_SKU_PRODUCT_SIZE_ONLY: 0.92,
  BRAND_MODEL_SIZE: 0.92,
  TITLE_EXACT_SIZE_ONLY: 0.90,
  COMPATIBLE_SIZE: 0.85, // capped: e.g. 2XL<->XXL, one-size<->default
  FUZZY_MAX: 0.85,
});

const ONE_SIZE = new Set(['ONESIZE', 'OSFM', 'OSFA', 'OS', 'מידהאחת', 'NOSIZE']);
const SIZE_ALIASES = { '2XL': 'XXL', '3XL': 'XXXL', '4XL': 'XXXXL', XXS: 'XXS', '2XS': 'XXS' };
const compatValue = (v) => { const s = normSize(v); if (ONE_SIZE.has(s)) return ''; return SIZE_ALIASES[s] ?? s; };
export const compatSignature = (values) => (values ?? []).map(compatValue).filter((x) => x && x !== 'DEFAULTTITLE' && x !== 'DEFAULT').sort().join('|');
const valueSet = (values) => new Set((values ?? []).map(normSize).filter((x) => x && x !== 'DEFAULTTITLE' && x !== 'DEFAULT'));

const BARCODE_RE = /^\d{8,14}$/;
export const isBarcode = (s) => BARCODE_RE.test(String(s ?? '').trim());
export const skuLoose = (s) => { const v = normSku(s); return v ? v.replace(/[^A-Z0-9]/g, '') : null; };

// Model-like codes from a raw title: alphanumeric tokens with digits, e.g. GH0432, 1168717, DX4215-013
export function modelCodes(title) {
  const out = new Set();
  for (const raw of String(title ?? '').normalize('NFKC').split(/[\s()[\]{},;|"'/\\]+/)) {
    const t = raw.replace(/[-._]/g, '').toUpperCase();
    if (t.length < 4 || !/\d/.test(t) || !/^[A-Z0-9]+$/.test(t)) continue;
    if (/^(19|20)\d\d$/.test(t)) continue; // years
    if (/^\d+$/.test(t) && t.length < 5) continue; // short numbers (sizes, weights)
    if (/^\d+(ML|MM|CM|KG|GR|G|L|M)$/.test(t)) continue; // units
    out.add(t);
  }
  return out;
}

const STOP = new Set(['ל', 'של', 'עם', 'for', 'the', 'and', 'ו', 'נשים', 'גברים', 'לנשים', 'לגברים', 'יוניסקס', 'unisex', 'men', 'women', 'mens', 'womens']);
export const titleTokens = (t) => new Set(normText(t).split(' ').filter((x) => x.length > 1 && !STOP.has(x)));
export function jaccard(a, b) { let i = 0; for (const x of a) if (b.has(x)) i++; return i / (a.size + b.size - i || 1); }

// ---------- supplier index ----------
// supplierProducts: [{ productId, title, vendor, variants: [{ variantId, sku, barcode, options:[raw] , ... }] }]
export function buildSupplierIndex(supplierProducts) {
  const idx = { products: [], sku: new Map(), skuLoose: new Map(), barcode: new Map(), title: new Map(), model: new Map(), token: new Map() };
  const push = (m, k, v) => { if (!k) return; if (!m.has(k)) m.set(k, []); m.get(k).push(v); };
  for (const p of supplierProducts) {
    const P = { ...p, titleKey: normKey(p.title), tokens: titleTokens(p.title), models: modelCodes(p.title), vendorKey: p.vendor ? normKey(p.vendor) : null };
    P.variants = p.variants.map((v) => ({ ...v, product: P, sig: optionSignature(v.options), csig: compatSignature(v.options), vset: valueSet(v.options) }));
    idx.products.push(P);
    push(idx.title, P.titleKey, P);
    for (const m of P.models) push(idx.model, m, P);
    for (const t of P.tokens) push(idx.token, t, P);
    for (const v of P.variants) {
      const s = normSku(v.sku);
      if (s) { push(idx.sku, s, v); push(idx.skuLoose, skuLoose(s), v); if (isBarcode(s)) push(idx.barcode, s, v); }
      if (v.barcode) push(idx.barcode, String(v.barcode).trim(), v);
    }
  }
  return idx;
}

const narrowByOptions = (cands, sig) => (cands.length === 1 ? cands : cands.filter((v) => v.sig === sig));
const uniqueProducts = (list) => [...new Set(list)];

// Resolve a variant inside a known supplier product by its options.
function resolveInProduct(P, sv0) {
  const { sig, csig, vset } = sv0;
  const exact = P.variants.filter((v) => v.sig === sig);
  if (exact.length === 1) return { v: exact[0], level: 'EXACT' };
  if (exact.length > 1) return { reason: 'AMBIGUOUS_VARIANT' };
  if (!sig && P.variants.length === 1) return { v: P.variants[0], level: 'EXACT' };
  if (sig) {
    // size-only: every Shopify value is present in the supplier variant (supplier has extra dimension e.g. color)
    const partial = P.variants.filter((v) => [...vset].every((x) => v.vset.has(x)));
    if (partial.length === 1) return { v: partial[0], level: 'SIZE_ONLY' };
    if (partial.length > 1) return { reason: 'AMBIGUOUS_VARIANT_COLOR' };
    const compat = P.variants.filter((v) => v.csig === csig);
    if (compat.length === 1) return { v: compat[0], level: 'COMPATIBLE' };
    if (compat.length > 1) return { reason: 'AMBIGUOUS_VARIANT' };
    if (P.variants.every((v) => !v.sig)) return { reason: 'SUPPLIER_HAS_NO_VARIANTS' };
    return { reason: 'OPTION_NOT_OFFERED_BY_SUPPLIER' };
  }
  if (P.variants.length > 1) return { reason: 'SHOPIFY_COLLAPSED_VARIANTS' };
  return { reason: 'NO_VARIANT_MATCH' };
}

export const MATCH_FIX = Object.freeze({
  NO_PRODUCT_MATCH: 'Supplier product not found in current feed (renamed/removed); re-discover',
  AMBIGUOUS_PRODUCT: 'Several supplier products fit equally; owner picks one',
  AMBIGUOUS_VARIANT: 'Several supplier variants share these options',
  AMBIGUOUS_VARIANT_COLOR: 'Size matches several colors at supplier; Shopify variant lacks color',
  AMBIGUOUS_SKU: 'SKU used by several supplier variants with same options',
  OPTION_NOT_OFFERED_BY_SUPPLIER: 'Shopify offers a size/color the supplier does not list (or EU vs UK size system); remove variant or map size chart',
  SHOPIFY_COLLAPSED_VARIANTS: 'Shopify has one variant but supplier sells several; rebuild variants from supplier',
  SUPPLIER_HAS_NO_VARIANTS: 'Supplier sells one unsized item but Shopify offers sizes; collapse to one variant',
  NO_VARIANT_MATCH: 'No supplier variant fits',
  SKU_TITLE_CONFLICT: 'SKU and title/options point to different supplier variants; owner review',
  SKU_OPTIONS_MISMATCH: 'SKU matches but size/color differ; owner review',
  LOW_CONFIDENCE: 'Only weak (fuzzy) evidence; owner review with supplier page open',
});

/**
 * Match all variants of one Shopify product against one supplier index.
 * shopifyProduct: { title, vendor, variants: [{ id, sku, barcode, options:[raw] }] }
 * returns Map(variantId -> match)
 */
export function matchProduct(shopifyProduct, idx) {
  const vendorKey = shopifyProduct.vendor ? normKey(shopifyProduct.vendor) : null;
  const vs = shopifyProduct.variants.map((v) => ({ ...v, sig: optionSignature(v.options), csig: compatSignature(v.options), vset: valueSet(v.options) }));
  const out = new Map();

  // 1-3: identifier evidence per variant
  const idHit = new Map();
  for (const v of vs) {
    const s = normSku(v.sku);
    const tries = [
      ['BARCODE_EXACT', v.barcode ? idx.barcode.get(String(v.barcode).trim()) : null],
      ['SKU_EXACT', s ? idx.sku.get(s) : null],
      ['SKU_NORMALIZED', s ? idx.skuLoose.get(skuLoose(s)) : null],
    ];
    for (const [method, cands] of tries) {
      if (!cands?.length) continue;
      const n = narrowByOptions(cands, v.sig);
      if (n.length === 1) { idHit.set(v.id, { method, sv: n[0] }); break; }
      idHit.set(v.id, { ambiguous: true, method });
      break;
    }
  }

  // product identity
  const skuProducts = uniqueProducts([...idHit.values()].filter((h) => h.sv).map((h) => h.sv.product));
  let P = null; let pMethod = null; let pScore = 0; let pReason = null;
  if (skuProducts.length === 1) { P = skuProducts[0]; pMethod = 'SIBLING_SKU'; }
  else if (skuProducts.length > 1) pReason = 'MULTIPLE_PRODUCTS_BY_SKU';
  if (!P && !pReason) {
    const models = modelCodes(shopifyProduct.title);
    const byModel = uniqueProducts([...models].flatMap((m) => ((idx.model.get(m)?.length ?? 99) <= 3 ? idx.model.get(m) : [])))
      .filter((p) => vendorKey && p.vendorKey && p.vendorKey === vendorKey);
    const byTitle = idx.title.get(normKey(shopifyProduct.title)) ?? [];
    if (byModel.length === 1) { P = byModel[0]; pMethod = 'BRAND_MODEL'; }
    else if (byTitle.length === 1) { P = byTitle[0]; pMethod = 'TITLE_EXACT'; }
    else if (byModel.length > 1 || byTitle.length > 1) pReason = 'AMBIGUOUS_PRODUCT';
    else {
      // fuzzy (evidence only)
      const toks = titleTokens(shopifyProduct.title);
      const pool = uniqueProducts([...toks].flatMap((t) => ((idx.token.get(t)?.length ?? 999) <= 60 ? idx.token.get(t) : [])));
      const scored = pool
        .filter((p) => !vendorKey || !p.vendorKey || p.vendorKey === vendorKey)
        .map((p) => ({ p, j: jaccard(toks, p.tokens) }))
        .sort((a, b) => b.j - a.j);
      if (scored.length && scored[0].j >= 0.6 && (scored.length === 1 || scored[0].j - scored[1].j >= 0.1)) { P = scored[0].p; pMethod = 'FUZZY'; pScore = scored[0].j; }
      else if (scored.length && scored[0].j >= 0.6) pReason = 'AMBIGUOUS_PRODUCT';
      else pReason = 'NO_PRODUCT_MATCH';
    }
  }

  for (const v of vs) {
    const hit = idHit.get(v.id);
    const evidence = { shopify_sku: v.sku ?? null, shopify_options: v.options, brand_shopify: shopifyProduct.vendor ?? null };
    const done = (m) => out.set(v.id, { ...m, cls: m.status === 'MATCHED' ? classifyConfidence(m.confidence) : MATCH_CLASS.REJECT, evidence: { ...evidence, ...(m.evidence ?? {}) }, fix: m.fix ?? MATCH_FIX[m.reason] ?? null });

    if (hit?.ambiguous) { done({ status: 'AMBIGUOUS', reason: 'AMBIGUOUS_SKU', confidence: 0, method: hit.method }); continue; }
    let resolved = null;
    if (P) resolved = resolveInProduct(P, v);

    if (hit?.sv) {
      // identifier wins, but must not contradict options
      if (v.sig && hit.sv.sig && hit.sv.sig !== v.sig && hit.sv.csig !== v.csig) { done({ status: 'CONFLICT', reason: 'SKU_OPTIONS_MISMATCH', confidence: 0, method: hit.method }); continue; }
      if (resolved?.v && resolved.v !== hit.sv && pMethod !== 'SIBLING_SKU') { done({ status: 'CONFLICT', reason: 'SKU_TITLE_CONFLICT', confidence: 0, method: hit.method }); continue; }
      done({ status: 'MATCHED', sv: hit.sv, method: hit.method, confidence: METHOD_CONFIDENCE[hit.method],
        evidence: { supplier_sku: hit.sv.sku, size_evidence: hit.sv.sig === v.sig ? 'EXACT' : 'COMPATIBLE', identifier: hit.method } });
      continue;
    }
    if (!P) { done({ status: pReason === 'AMBIGUOUS_PRODUCT' || pReason === 'MULTIPLE_PRODUCTS_BY_SKU' ? 'AMBIGUOUS' : 'NONE', reason: pReason === 'MULTIPLE_PRODUCTS_BY_SKU' ? 'AMBIGUOUS_PRODUCT' : pReason, confidence: 0 }); continue; }
    if (!resolved.v) { done({ status: resolved.reason.startsWith('AMBIGUOUS') ? 'AMBIGUOUS' : 'NONE', reason: resolved.reason, confidence: 0, evidence: { supplier_product: P.productId, product_method: pMethod } }); continue; }

    let method; let confidence;
    const lvl = resolved.level;
    if (pMethod === 'SIBLING_SKU') { method = lvl === 'EXACT' ? 'SIBLING_SKU_PRODUCT_EXACT_OPTIONS' : lvl === 'SIZE_ONLY' ? 'SIBLING_SKU_PRODUCT_SIZE_ONLY' : 'COMPATIBLE_SIZE'; }
    else if (pMethod === 'BRAND_MODEL') { method = lvl === 'EXACT' ? 'BRAND_MODEL_SIZE_COLOR' : lvl === 'SIZE_ONLY' ? 'BRAND_MODEL_SIZE' : 'COMPATIBLE_SIZE'; }
    else if (pMethod === 'TITLE_EXACT') { method = lvl === 'EXACT' ? 'TITLE_EXACT_OPTIONS' : lvl === 'SIZE_ONLY' ? 'TITLE_EXACT_SIZE_ONLY' : 'COMPATIBLE_SIZE'; }
    if (pMethod === 'FUZZY') {
      method = 'FUZZY_TITLE';
      const base = 0.5 + 0.4 * pScore; // 0.6 -> 0.74, 0.875 -> 0.85
      confidence = Math.min(METHOD_CONFIDENCE.FUZZY_MAX, lvl === 'EXACT' ? base : base - 0.05);
    } else confidence = METHOD_CONFIDENCE[method];
    confidence = Math.round(confidence * 1000) / 1000;
    done({ status: 'MATCHED', sv: resolved.v, method, confidence, reason: classifyConfidence(confidence) === MATCH_CLASS.MANUAL_REVIEW || classifyConfidence(confidence) === MATCH_CLASS.REJECT ? 'LOW_CONFIDENCE' : null,
      evidence: { supplier_product: P.productId, product_method: pMethod, fuzzy_jaccard: pMethod === 'FUZZY' ? Math.round(pScore * 100) / 100 : undefined,
        size_evidence: lvl, color_evidence: lvl === 'EXACT' ? 'EXACT_OR_NOT_APPLICABLE' : 'UNVERIFIED',
        brand_evidence: vendorKey && P.vendorKey ? (vendorKey === P.vendorKey ? 'EXACT' : 'DIFFERENT') : 'UNKNOWN',
        model_evidence: [...modelCodes(shopifyProduct.title)].filter((m) => P.models.has(m)).join(' ') || 'NONE' } });
  }
  return out;
}
