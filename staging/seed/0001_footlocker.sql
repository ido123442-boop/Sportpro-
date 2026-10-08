-- STAGING ONLY. Legacy D1 schema (worker/schema/legacy_staging_schema.sql).
-- Registers Foot Locker IL and the pilot supplier variant (VEE3BKA040). No Shopify IDs, no mappings,
-- nothing ACTIVE: status REVIEW_REQUIRED until checkout is validated end-to-end.
-- Never apply to the production D1 (b936ce23-...).
INSERT INTO suppliers (code, name, platform, base_url, status, paused, checkout_method, shipping_policy, notes)
VALUES ('footlocker', 'Foot Locker IL', 'shopify', 'https://www.footlocker.co.il', 'REVIEW_REQUIRED', 0, 'cart_permalink',
  '{"free_above":199,"base_cost":14.9,"currency":"ILS","source":"https://www.footlocker.co.il/policies/shipping-policy","verified_at":"2026-10-08"}',
  'staging only; see config/suppliers/footlocker.json')
ON CONFLICT(code) DO NOTHING;

INSERT INTO shipping_policies (supplier_code, rules_json, source, verified_at, verified_by)
VALUES ('footlocker', '[{"type":"FREE_ABOVE","threshold":199},{"type":"FLAT","cost":14.9}]',
  'https://www.footlocker.co.il/policies/shipping-policy', '2026-10-08', 'claude-readonly-check')
ON CONFLICT(supplier_code) DO NOTHING;

INSERT INTO supplier_products (supplier_id, supplier_product_id, title, url, active, last_verified_at, platform)
SELECT id, '8216717852825', 'U AUTHENTIC סניקרס', 'https://www.footlocker.co.il/products/f098990100', 0, '2026-10-08T13:25:08Z', 'shopify'
FROM suppliers WHERE code = 'footlocker'
ON CONFLICT(supplier_id, supplier_product_id) DO NOTHING;

INSERT INTO supplier_variants (supplier_product_id, supplier_variant_id, sku, title, price, stock, shipping_cost, last_checked_at, size, barcode, brand, currency, discovery_status)
SELECT sp.id, '44817809080473', 'VEE3BKA040', '35', 319.9, NULL, 0, '2026-10-08T13:25:08Z', '35', '700053288836', 'VANS', 'ILS', 'DISCOVERED'
FROM supplier_products sp JOIN suppliers s ON s.id = sp.supplier_id
WHERE s.code = 'footlocker' AND sp.supplier_product_id = '8216717852825'
ON CONFLICT(supplier_product_id, supplier_variant_id) DO NOTHING;
