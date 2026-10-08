// Duplicate report over the classified Shopify catalog (read-only; writes a local CSV, deletes nothing).
// Usage: node tools/duplicates_report.mjs <variants_classified.csv> [out.csv]
import { findDuplicates, summarize } from '../src/core/duplicates.js';
import { readCsv, writeCsv } from './lib_csv.mjs';

const [file, out] = process.argv.slice(2);
const rows = readCsv(file);
const items = rows.map((r) => ({
  id: r.variant_id, sku: r.sku, barcode: r.barcode, brand: r.vendor && !/^sport ?pro$/i.test(r.vendor) ? r.vendor : '', title: r.product_title,
  size: r.variant_title, supplierCode: r.supplier_tag || null, supplierSku: r.supplier_sku || null, shopifyVariantId: r.variant_id,
}));
const res = findDuplicates(items);
console.log(JSON.stringify(summarize(res), null, 1));
if (out) writeCsv(out, res.filter((r) => r.class !== 'UNIQUE').map((r) => ({ variant_id: r.id, class: r.class, matched_on: r.matchedOn.join('|'), with: r.with.slice(0, 10).join('|') })));
