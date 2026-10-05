// SELLABLE gate. Every variant gets exactly ONE primary state from a closed set; gates run in a
// fixed order and the first failing gate decides. Anything undecidable is UNKNOWN, never SELLABLE.
import { shippingKnown } from './shipping.js';

export const STATES = Object.freeze([
  'SELLABLE', 'AUTO_READY', 'OWNER_APPROVAL', 'DATA_FIX', 'MAPPING_REQUIRED', 'SUPPLIER_REQUIRED',
  'STOCK_BLOCKED', 'SHIPPING_BLOCKED', 'PROFIT_BLOCKED', 'RISK_BLOCKED', 'STALE', 'INVALID', 'UNKNOWN',
]);

// Report groups requested by the owner (A–I).
export const GROUP_OF_STATE = Object.freeze({
  SELLABLE: 'A_VERIFIED_SELLABLE',
  AUTO_READY: 'B_SELLABLE_AFTER_FIX', OWNER_APPROVAL: 'B_SELLABLE_AFTER_FIX', DATA_FIX: 'B_SELLABLE_AFTER_FIX',
  MAPPING_REQUIRED: 'C_NEEDS_MATCH',
  STOCK_BLOCKED: 'D_NEEDS_STOCK',
  SHIPPING_BLOCKED: 'E_NEEDS_SHIPPING',
  PROFIT_BLOCKED: 'F_PROFIT_BLOCKED',
  SUPPLIER_REQUIRED: 'G_NO_SUPPLIER',
  RISK_BLOCKED: 'H_DATA_QUALITY', INVALID: 'H_DATA_QUALITY',
  STALE: 'I_UNKNOWN', UNKNOWN: 'I_UNKNOWN',
});

export const FRESHNESS_HOURS = Object.freeze({ price: 24, stock: 24, shipping: 24 * 30 });
const hoursBetween = (a, b) => (new Date(b) - new Date(a)) / 36e5;

/*
 ctx = {
   now,
   shopify:  { productStatus, price, mediaCount, duplicateSku },
   supplier: { key, supported, feedOk, blocked, unsupportedReason, checkoutVerified },
   match:    { status: MATCHED|AMBIGUOUS|CONFLICT|NONE, cls: AUTO_CANDIDATE|HIGH_CONFIDENCE|MANUAL_REVIEW|REJECT, reason, fix },
   live:     { fetchedAt, stock: AVAILABLE|UNAVAILABLE|UNKNOWN, cost, currency, verified: bool, variantExists: bool, urlOk: bool },
   shipping: { status, cost, conditionSatisfied },
   profit:   { pass, reason },
   risk:     { duplicateSupplierMapping, skuConflict },
   approval: { mappingApproved },
 }
*/
export function classifyVariant(ctx) {
  try {
    const { shopify = {}, supplier = {}, match = {}, live = {}, shipping, profit, risk = {}, approval = {}, now } = ctx;
    const res = (state, primaryReason, fix) => ({ state, primaryReason, fix, group: GROUP_OF_STATE[state] });

    // 1. INVALID
    if (shopify.productStatus === 'ARCHIVED') return res('INVALID', 'PRODUCT_ARCHIVED', 'Archived in Shopify; out of scope unless restored by owner');
    if (!(shopify.price > 0)) return res('INVALID', 'INVALID_PRICE', 'Set a valid selling price');

    // 2. SUPPLIER
    if (!supplier.key) return res('SUPPLIER_REQUIRED', 'NO_SUPPLIER_TAG', 'Identify supplier and add ספק: tag');
    if (supplier.blocked) return res('SUPPLIER_REQUIRED', 'SUPPLIER_BLOCKED', 'Supplier is blocked; find alternate supplier');
    if (!supplier.supported) return res('SUPPLIER_REQUIRED', supplier.unsupportedReason ?? 'UNSUPPORTED_SUPPLIER', 'Onboard supplier (catalog + shipping + checkout) or find alternate supplier');
    if (!supplier.feedOk) return res('SUPPLIER_REQUIRED', 'SUPPLIER_FEED_FAILED', 'Re-run supplier scan');

    // 3. MAPPING
    if (match.status !== 'MATCHED') return res('MAPPING_REQUIRED', match.reason ?? 'NO_MATCH', match.fix ?? 'Find supplier product/variant');
    if (match.cls === 'MANUAL_REVIEW') return res('MAPPING_REQUIRED', 'MATCH_NEEDS_MANUAL_REVIEW', 'Owner reviews evidence on /verify; fuzzy evidence is never auto-approved');
    if (match.cls !== 'AUTO_CANDIDATE' && match.cls !== 'HIGH_CONFIDENCE') return res('MAPPING_REQUIRED', 'LOW_CONFIDENCE', 'Evidence too weak; re-discover');
    if (live.verified === true && live.variantExists === false) return res('MAPPING_REQUIRED', 'SUPPLIER_VARIANT_GONE', 'Supplier variant no longer exists; re-match');

    // 4. RISK
    if (risk.duplicateSupplierMapping) return res('RISK_BLOCKED', 'DUPLICATE_SUPPLIER_MAPPING', 'Several Shopify variants map to one supplier variant; owner keeps one listing');
    if (risk.skuConflict) return res('RISK_BLOCKED', 'SKU_CONFLICTS_WITH_MATCH', 'Shopify SKU points to another supplier variant');
    if (live.verified === true && live.currency && live.currency !== 'ILS') return res('RISK_BLOCKED', 'CURRENCY_NOT_ILS', 'Supplier price not in ILS');
    if (live.verified === true && live.urlOk === false) return res('RISK_BLOCKED', 'SUPPLIER_URL_BROKEN', 'Supplier product page not reachable');

    // 5. FRESHNESS
    if (!live.fetchedAt || hoursBetween(live.fetchedAt, now) > FRESHNESS_HOURS.stock) return res('STALE', 'SUPPLIER_DATA_STALE', 'Refresh supplier price/stock');

    // 6. STOCK (quantity is never used; UNKNOWN never becomes AVAILABLE)
    if (live.stock === 'UNAVAILABLE') return res('STOCK_BLOCKED', 'STOCK_UNAVAILABLE', 'Wait for supplier restock (auto-recheck)');
    if (live.stock !== 'AVAILABLE') return res('STOCK_BLOCKED', 'STOCK_UNKNOWN', 'Variant-level stock not proven; needs live variant check');

    // 7. SHIPPING
    if (!shippingKnown(shipping)) return res('SHIPPING_BLOCKED', `SHIPPING_${shipping?.status ?? 'UNKNOWN'}${shipping?.rule ? ':' + shipping.rule : ''}`, 'Verify supplier shipping cost for this item');
    if (shipping.conditionSatisfied === false) return res('SHIPPING_BLOCKED', 'SHIPPING_CONDITION_NOT_MET', 'Free-shipping condition not met for a single-unit order');

    // 8. PROFIT
    if (!profit || !profit.pass) return res('PROFIT_BLOCKED', profit?.reason ?? 'PROFIT_UNKNOWN', 'Reprice within policy or drop item');

    // 9. DATA_FIX
    if (shopify.duplicateSku) return res('DATA_FIX', 'DUPLICATE_SKU', 'Set SKU to the matched supplier SKU (unique)');
    if (!(shopify.mediaCount > 0)) return res('DATA_FIX', 'NO_IMAGES', 'Import images from supplier product');

    // 10. LIVE VERIFICATION (per-variant check, separate from catalog scan)
    if (live.verified !== true) return res('STALE', 'LIVE_CHECK_REQUIRED', 'Run live variant verification');

    // 11/12. APPROVAL + CHECKOUT
    if (match.cls === 'HIGH_CONFIDENCE' && !approval.mappingApproved) return res('OWNER_APPROVAL', 'MAPPING_NEEDS_OWNER_APPROVAL', 'Owner confirms match on /verify');
    if (!approval.mappingApproved) return res('AUTO_READY', 'AWAITING_MAPPING_RECORD', 'Record AUTO_CANDIDATE mapping (auditable); no judgement needed');
    if (!supplier.checkoutVerified) return res('AUTO_READY', 'CHECKOUT_UNVERIFIED', 'Verify supplier checkout path with a pilot order');
    return res('SELLABLE', null, null);
  } catch (e) {
    return { state: 'UNKNOWN', primaryReason: 'EVALUATION_ERROR', fix: String(e?.message ?? e), group: 'I_UNKNOWN' };
  }
}
