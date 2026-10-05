// Supplier stock -> AVAILABLE | UNAVAILABLE | UNKNOWN. Quantities are never inferred.
export const shopifyStock = (available) => (available === true ? 'AVAILABLE' : available === false ? 'UNAVAILABLE' : 'UNKNOWN');

// WooCommerce Store API: AVAILABLE only if in stock AND purchasable AND not on backorder.
export function wooStock(v) {
  const cls = v?.stock_availability?.class ?? '';
  if (v?.is_in_stock === true && v?.is_purchasable === true && !/backorder|out-of-stock/.test(cls)) return 'AVAILABLE';
  if (v?.is_in_stock === false || /out-of-stock/.test(cls)) return 'UNAVAILABLE';
  return 'UNKNOWN';
}
