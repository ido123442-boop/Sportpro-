// SKU recovery proposals. Never written to Shopify by this module.
// A proposal is WRITE_CANDIDATE only if every uniqueness/consistency check passes.
import { normSku } from './normalize.js';

/*
 items: [{ shopifyVariantId, currentSku, supplier, supplierVariantId, supplierSku, confidence, cls, sizeEvidence, method }]
 allShopifySkus: Map(normSku -> count) of CURRENT Shopify SKUs (all variants)
 supplierSkuCount: Map(`${supplier}:${normSku}` -> number of supplier variants carrying it)
*/
export function buildSkuProposals(items, allShopifySkus, supplierSkuCount) {
  // how many Shopify variants would receive each proposed SKU
  const proposedCount = new Map();
  for (const it of items) {
    const p = normSku(it.supplierSku);
    if (p) proposedCount.set(p, (proposedCount.get(p) ?? 0) + 1);
  }
  return items.map((it) => {
    const proposed = normSku(it.supplierSku);
    const current = normSku(it.currentSku);
    const checks = {
      has_supplier_sku: Boolean(proposed),
      differs_from_current: proposed !== current,
      supplier_unique: proposed ? (supplierSkuCount.get(`${it.supplier}:${proposed}`) ?? 0) === 1 : false,
      variant_unique: proposed ? (proposedCount.get(proposed) ?? 0) === 1 : false,
      no_collision_with_other_shopify_variant: proposed ? ((allShopifySkus.get(proposed) ?? 0) - (current === proposed ? 1 : 0)) === 0 : false,
      size_consistent: it.sizeEvidence === 'EXACT',
      confidence_ok: it.cls === 'AUTO_CANDIDATE',
    };
    let collision = 'NONE';
    if (!checks.has_supplier_sku) collision = 'NO_SUPPLIER_SKU';
    else if (!checks.differs_from_current) collision = 'ALREADY_SET';
    else if (!checks.supplier_unique) collision = 'SUPPLIER_SKU_NOT_UNIQUE';
    else if (!checks.variant_unique) collision = 'PROPOSED_TO_MULTIPLE_VARIANTS';
    else if (!checks.no_collision_with_other_shopify_variant) collision = 'COLLIDES_WITH_EXISTING_SHOPIFY_SKU';
    const pass = collision === 'NONE' && checks.size_consistent && checks.confidence_ok;
    return {
      shopify_variant_id: it.shopifyVariantId, current_sku: it.currentSku ?? '', proposed_sku: it.supplierSku ?? '',
      supplier_id: it.supplier, supplier_variant_id: it.supplierVariantId, confidence: it.confidence, match_class: it.cls, match_method: it.method,
      evidence: JSON.stringify(checks), collision_status: collision,
      status: collision === 'ALREADY_SET' ? 'NO_CHANGE' : pass ? 'WRITE_CANDIDATE' : 'REVIEW',
      approval_required: true,
    };
  });
}
