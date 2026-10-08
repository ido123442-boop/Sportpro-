// Duplicate engine (report only — never deletes or edits anything).
// EXACT_DUPLICATE : same normalized SKU+size, same barcode, same supplier SKU at the same supplier,
//                   or the same Shopify variant listed twice.
// LIKELY_DUPLICATE: same brand + model code + size, or same normalized title + size.
// UNIQUE          : none of the above.
import { normSku, normSize, normText } from './normalize.js';
import { modelCodes, isBarcode } from './match.js';

export const DUP = Object.freeze({ EXACT: 'EXACT_DUPLICATE', LIKELY: 'LIKELY_DUPLICATE', UNIQUE: 'UNIQUE' });

/* item = { id, sku, barcode, brand, title, size, supplierCode, supplierSku, shopifyVariantId } */
export function findDuplicates(items) {
  const exactKeys = (it) => {
    const size = normSize(it.size ?? '') || '-';
    const keys = [];
    const sku = normSku(it.sku);
    if (sku) keys.push(`sku:${sku}|${size}`);
    const bc = String(it.barcode ?? '').trim();
    if (bc && isBarcode(bc)) keys.push(`barcode:${bc}`);
    const ssku = normSku(it.supplierSku);
    if (it.supplierCode && ssku) keys.push(`supplier:${it.supplierCode}:${ssku}|${size}`);
    if (it.shopifyVariantId) keys.push(`shopify:${it.shopifyVariantId}`);
    return keys;
  };
  const likelyKeys = (it) => {
    const size = normSize(it.size ?? '') || '-';
    const keys = [];
    const brand = normText(it.brand ?? '');
    for (const m of modelCodes(it.title ?? '')) if (brand) keys.push(`model:${brand}:${m}|${size}`);
    const t = normText(it.title ?? '');
    if (t) keys.push(`title:${t}|${size}`);
    return keys;
  };
  const index = (fn) => { const m = new Map(); items.forEach((it, i) => { for (const k of new Set(fn(it))) { if (!m.has(k)) m.set(k, []); m.get(k).push(i); } }); return m; };
  const ex = index(exactKeys), li = index(likelyKeys);
  return items.map((it, i) => {
    const exactOn = exactKeys(it).filter((k) => ex.get(k).length > 1);
    if (exactOn.length) return { id: it.id, class: DUP.EXACT, matchedOn: exactOn, with: [...new Set(exactOn.flatMap((k) => ex.get(k)))].filter((j) => j !== i).map((j) => items[j].id) };
    const likelyOn = likelyKeys(it).filter((k) => li.get(k).length > 1);
    if (likelyOn.length) return { id: it.id, class: DUP.LIKELY, matchedOn: likelyOn, with: [...new Set(likelyOn.flatMap((k) => li.get(k)))].filter((j) => j !== i).map((j) => items[j].id) };
    return { id: it.id, class: DUP.UNIQUE, matchedOn: [], with: [] };
  });
}

export function summarize(results) {
  const by = { [DUP.EXACT]: 0, [DUP.LIKELY]: 0, [DUP.UNIQUE]: 0 };
  const on = {};
  for (const r of results) { by[r.class]++; for (const k of r.matchedOn) { const t = k.split(':')[0]; on[t] = (on[t] ?? 0) + 1; } }
  return { total: results.length, ...by, matchedOnType: on };
}
