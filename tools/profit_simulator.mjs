// Profit simulator (offline; no Shopify, no network).
// Usage:
//   node tools/profit_simulator.mjs <input.csv|input.json> [--out result.csv]
//     input columns: supplier, sku, cost, shipping (optional -> supplier rule), selling_price (optional -> recommended),
//                    stock (optional), confidence (optional), risk_pass (optional true/false)
//   node tools/profit_simulator.mjs --simulate [--shipping <ILS>]   (cost tiers 100..5000)
// SELLABLE here is the PRODUCT-LEVEL verdict of src/core/sellable.js; system gates (kill switch,
// target isolation, human approvals) are evaluated again at action time and are not assumed here.
import fs from 'node:fs';
import { loadPolicy, quote, simulate } from '../src/core/pricingEngine.js';
import { evaluateSellable } from '../src/core/sellable.js';
import { shippingFor } from '../src/core/shipping.js';
import { supplierById } from '../src/core/registry.js';
import { readCsv, writeCsv } from './lib_csv.mjs';

const args = process.argv.slice(2);
const opt = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };
const policy = loadPolicy();

export function simulateRow(row, { now = new Date().toISOString() } = {}) {
  const cost = row.cost === '' || row.cost == null ? null : Number(row.cost);
  const ship = row.shipping !== undefined && row.shipping !== '' && row.shipping != null ? { status: 'VERIFIED', cost: Number(row.shipping), rule: 'INPUT' } : shippingFor(row.supplier, { unitCost: cost });
  const q = quote({ cost, shipping: ship.cost, policy, sellingPrice: row.selling_price ? Number(row.selling_price) : null });
  const sup = supplierById(row.supplier);
  const s = evaluateSellable({
    now, killSwitch: '{"active":false}', // product-level only (see header)
    supplier: { code: row.supplier, verified: sup?.checkout_verified === true },
    mapping: { shopifySku: row.sku, supplierSku: row.sku, variantVerified: Boolean(row.stock), confidence: row.confidence ? Number(row.confidence) : 0, duplicate: false },
    live: { price: cost, currency: 'ILS', stock: row.stock || 'UNKNOWN', checkedAt: row.stock ? now : null, variantExists: Boolean(row.stock) },
    shipping: ship, pricing: { sellingPrice: q.selling_price ?? (row.selling_price ? Number(row.selling_price) : q.recommended_price), policy },
    risk: { pass: String(row.risk_pass ?? '').toLowerCase() === 'true' }, blocks: [],
  });
  return {
    supplier: row.supplier, SKU: row.sku, cost, shipping: ship.cost, selling_price: q.selling_price, minimum_price: q.minimum_price, recommended_price: q.recommended_price,
    fees: q.fees, net_profit: q.net_profit, margin: q.margin, markup: q.markup, price_status: q.status, price_reason: q.reason,
    risk: String(row.risk_pass ?? '').toLowerCase() === 'true' ? 'PASS' : 'UNVERIFIED', SELLABLE: s.sellable ? 'YES' : 'NO', blocking: s.reasons.join('|'),
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  if (args.includes('--simulate')) {
    const fixed = opt('--shipping');
    const rows = simulate(policy, { shippingFor: (c) => (fixed != null ? Number(fixed) : c >= 199 ? 0 : 14.9) });
    console.log(`policy ${policy.version} — PRICING_POLICY_STATUS=${policy.status} (tiers ${policy.tiersStatus}); shipping=${fixed ?? 'Foot Locker rule'}`);
    console.table(rows.map((r) => ({ cost: r.cost, shipping: r.shipping, minimum_price: r.minimum_price, recommended_price: r.recommended_price, net_profit: r.net_profit, margin: r.margin, markup: r.markup, result: r.status, note: r.reason })));
  } else {
    const file = args.find((a) => !a.startsWith('--') && a !== opt('--out'));
    if (!file) { console.error('usage: node tools/profit_simulator.mjs <input.csv|json> [--out out.csv] | --simulate'); process.exit(2); }
    const input = file.endsWith('.json') ? JSON.parse(fs.readFileSync(file, 'utf8')) : readCsv(file);
    const out = input.map((r) => simulateRow(r));
    if (opt('--out')) writeCsv(opt('--out'), out); else console.table(out);
  }
}
