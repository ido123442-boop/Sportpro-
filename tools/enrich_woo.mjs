// Re-run only the WooCommerce per-variation enrichment on an existing scan dir (GET only).
// Usage: node tools/enrich_woo.mjs <scanDir>
import fs from 'node:fs';
import path from 'node:path';
import { SUPPLIERS, enrichWooVariations } from './scan_suppliers.mjs';
const dir = process.argv[2];
const summaryFile = path.join(dir, '_scan_summary.json');
const summary = JSON.parse(fs.readFileSync(summaryFile, 'utf8'));
await Promise.all(summary.filter((r) => r.type === 'woo' && r.ok).map(async (r) => {
  r.variation_enrichment = await enrichWooVariations(r.supplier, SUPPLIERS[r.supplier], path.join(dir, `${r.supplier}.jsonl`), path.join(dir, `${r.supplier}.variations.jsonl`));
  r.variation_enrichment.finished = new Date().toISOString();
  fs.writeFileSync(summaryFile, JSON.stringify(summary, null, 2));
}));
console.log(JSON.stringify(summary.filter((r) => r.variation_enrichment).map((r) => ({ s: r.supplier, ...r.variation_enrichment }))));
