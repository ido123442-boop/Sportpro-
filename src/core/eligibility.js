// SELLABLE contract. Every variant gets exactly ONE primary state; gates are evaluated
// in a fixed order and the first failing gate decides. Anything the evaluator cannot
// decide is UNKNOWN (never silently SELLABLE).
import { shippingKnown } from './shipping.js';

export const STATES = Object.freeze([
  'SELLABLE', 'AUTO_READY', 'OWNER_APPROVAL', 'DATA_FIX', 'MAPPING_REQUIRED', 'SUPPLIER_REQUIRED',
  'STOCK_BLOCKED', 'SHIPPING_BLOCKED', 'PROFIT_BLOCKED', 'RISK_BLOCKED', 'STALE', 'INVALID', 'UNKNOWN',
]);

export const FRESHNESS_HOURS = Object.freeze({ price: 24, stock: 24, shipping: 24 * 30 });

const hoursBetween = (a, b) => (new Date(b) - new Date(a)) / 36e5;

// ctx: see docs/SPORTPRO_ARCHITECTURE_V2.md §3 for field definitions.
export function classifyVariant(ctx) {
  try {
    const { shopify = {}, supplier = {}, match = {}, live = {}, shipping, profit, risk = {}, approval = {}, now } = ctx;
    const res = (state, primaryReason, fix) => ({ state, primaryReason, fix });

    // 1. INVALID — the Shopify record itself cannot be sold
    if (shopify.productStatus === 'ARCHIVED') return res('INVALID', 'PRODUCT_ARCHIVED', 'Archived in Shopify; out of scope unless restored by owner');
    if (!(shopify.price > 0)) return res('INVALID', 'INVALID_PRICE', 'Set a valid selling price');

    // 2. SUPPLIER_REQUIRED — no usable supplier source
    if (!supplier.key) return res('SUPPLIER_REQUIRED', 'NO_SUPPLIER_TAG', 'Identify supplier and add ספק: tag');
    if (!supplier.supported) return res('SUPPLIER_REQUIRED', supplier.unsupportedReason ?? 'UNSUPPORTED_SUPPLIER', 'Onboard supplier (catalog feed + shipping + checkout) or find alternate supplier');
    if (!supplier.feedOk) return res('SUPPLIER_REQUIRED', 'SUPPLIER_FEED_FAILED', 'Re-run supplier scan');

    // 3. STALE — supplier data too old to trust
    if (!live.fetchedAt || hoursBetween(live.fetchedAt, now) > FRESHNESS_HOURS.stock) return res('STALE', 'SUPPLIER_DATA_STALE', 'Refresh supplier price/stock');

    // 4. MAPPING_REQUIRED — no deterministic supplier variant
    if (match.status !== 'MATCHED') return res('MAPPING_REQUIRED', match.reason ?? 'NO_MATCH', match.fix ?? 'Find supplier product/variant');

    // 5. RISK_BLOCKED — routing would not be deterministic
    if (risk.duplicateSupplierMapping) return res('RISK_BLOCKED', 'DUPLICATE_SUPPLIER_MAPPING', 'Two Shopify variants map to one supplier variant; owner must pick one');
    if (risk.skuConflict) return res('RISK_BLOCKED', 'SKU_CONFLICTS_WITH_MATCH', 'Shopify SKU points to a different supplier variant than the title/options match');

    // 6. STOCK
    if (live.stock === 'UNAVAILABLE') return res('STOCK_BLOCKED', 'STOCK_UNAVAILABLE', 'Wait for supplier restock (auto-recheck)');
    if (live.stock !== 'AVAILABLE') return res('STOCK_BLOCKED', 'STOCK_UNKNOWN', 'Variant-level stock not exposed; needs live variant check');

    // 7. SHIPPING
    if (!shippingKnown(shipping)) return res('SHIPPING_BLOCKED', `SHIPPING_${shipping?.status ?? 'UNKNOWN'}${shipping?.rule ? ':' + shipping.rule : ''}`, 'Verify supplier shipping cost for this item');

    // 8. PROFIT
    if (!profit || !profit.pass) return res('PROFIT_BLOCKED', profit?.reason ?? 'PROFIT_UNKNOWN', 'Reprice (min profit/margin) or drop item');

    // 9. DATA_FIX — supply chain passes, Shopify record needs a deterministic fix
    if (shopify.duplicateSku) return res('DATA_FIX', 'DUPLICATE_SKU', 'Set SKU to the matched supplier SKU (unique)');
    if (!(shopify.mediaCount > 0)) return res('DATA_FIX', 'NO_IMAGES', 'Import images from supplier product');

    // 10/11/12 — approval and checkout gates
    if (match.tier !== 'EXACT' && !approval.mappingApproved) return res('OWNER_APPROVAL', 'MAPPING_NEEDS_OWNER_APPROVAL', 'Owner confirms title/options match on /verify');
    if (!approval.mappingApproved) return res('AUTO_READY', 'AWAITING_MAPPING_RECORD', 'Record EXACT mapping (auditable) — no human judgement required');
    if (!supplier.checkoutVerified) return res('AUTO_READY', 'CHECKOUT_UNVERIFIED', 'Verify supplier checkout path with a pilot order');
    return res('SELLABLE', null, null);
  } catch (e) {
    return { state: 'UNKNOWN', primaryReason: 'EVALUATION_ERROR', fix: String(e?.message ?? e) };
  }
}
