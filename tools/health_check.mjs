// Health check (read-only). Probes each supplier adapter (GET, first page, 5 items), reads the latest
// live-verification file, and combines with facts about infrastructure that cannot be probed from here.
// Usage: node tools/health_check.mjs [live.jsonl] [--facts '{"stagingStore":false,...}']
import fs from 'node:fs';
import { adapterFor, ADAPTER_SUPPLIERS } from '../src/suppliers/adapters.js';
import { computeHealth } from '../src/core/health.js';

const args = process.argv.slice(2);
const fi = args.indexOf('--facts');
const facts = fi >= 0 ? JSON.parse(args[fi + 1]) : {};
const liveFile = args.find((a, i) => !a.startsWith('--') && (fi < 0 || i !== fi + 1));

const suppliers = [];
for (const s of ADAPTER_SUPPLIERS) {
  const t0 = Date.now();
  try {
    const r = await adapterFor(s).discover({ page: 1, limit: 5 });
    suppliers.push({ supplier: s, ok: r.status === 200 && r.records.length > 0, status: r.status, records: r.records.length, ms: Date.now() - t0 });
  } catch (e) { suppliers.push({ supplier: s, ok: false, status: 0, error: String(e.message ?? e), ms: Date.now() - t0 }); }
}
let live = {};
if (liveFile && fs.existsSync(liveFile)) {
  const rows = fs.readFileSync(liveFile, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
  live = { total: rows.length, priceOk: rows.filter((r) => r.price > 0 && r.currency === 'ILS').length, available: rows.filter((r) => r.stock === 'AVAILABLE').length,
    unavailable: rows.filter((r) => r.stock === 'UNAVAILABLE').length, unknown: rows.filter((r) => r.stock !== 'AVAILABLE' && r.stock !== 'UNAVAILABLE').length,
    shippingKnown: rows.filter((r) => r.price > 0).length, // Foot Locker rule is VERIFIED for any known price
    priceChanged: facts.priceChanged ?? 0, checkedAt: rows.map((r) => r.checked_at).sort().pop() };
}
const snap = {
  suppliers,
  shopify: { productionReadOk: facts.productionReadOk ?? null, stagingStore: facts.stagingStore ?? false, stagingAppOk: facts.stagingAppOk ?? false },
  d1: { stagingProvisioned: facts.stagingD1 ?? false, schemaOk: facts.schemaOk ?? false, killSwitchState: facts.killSwitchState ?? 'UNKNOWN' },
  live, sellable: { count: facts.sellable ?? 0, target: 3 },
  mapping: { approved: facts.approvedMappings ?? 0, candidates: facts.mappingCandidates ?? null, duplicates: facts.duplicateMappings ?? null },
};
const h = computeHealth(snap);
console.log(`OVERALL: ${h.overall}   (generated ${new Date().toISOString()})`);
console.table(Object.entries(h.checks).map(([k, v]) => ({ check: k, status: v.status, reason: v.reason })));
console.table(suppliers);
if (args.includes('--json')) console.log(JSON.stringify({ ...h, snap }, null, 1));
