// Health checks -> GREEN | YELLOW | RED with a reason. Pure: the caller supplies a snapshot of facts.
// Unknown facts are never GREEN.
export const CHECKS = Object.freeze(['SUPPLIER_HEALTH', 'SHOPIFY_HEALTH', 'D1_HEALTH', 'SELLABLE_HEALTH', 'PRICE_HEALTH', 'STOCK_HEALTH', 'SHIPPING_HEALTH', 'MAPPING_HEALTH']);
const pct = (a, b) => (b > 0 ? (a / b) * 100 : null);
const band = (v, green, yellow) => (v == null ? 'RED' : v >= green ? 'GREEN' : v >= yellow ? 'YELLOW' : 'RED');

/*
 snap = {
   suppliers: [{ supplier, ok: bool, status, ms }],
   shopify: { productionReadOk, stagingStore: bool, stagingAppOk: bool },
   d1: { stagingProvisioned: bool, schemaOk: bool, killSwitchState },
   live: { total, priceOk, available, unavailable, unknown, shippingKnown, priceChanged },
   sellable: { count, target },
   mapping: { approved, candidates, duplicates },
 }
*/
export function computeHealth(snap = {}) {
  const r = {};
  const sup = snap.suppliers ?? [];
  const okS = sup.filter((s) => s.ok).length;
  r.SUPPLIER_HEALTH = { status: sup.length === 0 ? 'RED' : okS === sup.length ? 'GREEN' : okS >= sup.length / 2 ? 'YELLOW' : 'RED', reason: `${okS}/${sup.length} supplier feeds reachable` };
  const sh = snap.shopify ?? {};
  r.SHOPIFY_HEALTH = sh.stagingStore !== true
    ? { status: 'RED', reason: `no isolated staging store (production read-only ${sh.productionReadOk === true ? 'OK' : 'UNKNOWN'})` }
    : sh.stagingAppOk === true ? { status: 'GREEN', reason: 'staging store + app reachable' } : { status: 'YELLOW', reason: 'staging store exists, app not verified' };
  const d1 = snap.d1 ?? {};
  r.D1_HEALTH = d1.stagingProvisioned !== true ? { status: 'RED', reason: 'isolated staging D1 not provisioned' }
    : d1.schemaOk !== true ? { status: 'RED', reason: 'schema not verified' }
    : d1.killSwitchState !== 'ON' && d1.killSwitchState !== 'OFF' ? { status: 'YELLOW', reason: `kill switch ${d1.killSwitchState ?? 'UNKNOWN'}` }
    : { status: 'GREEN', reason: `schema ok, kill switch ${d1.killSwitchState}` };
  const s = snap.sellable ?? {};
  r.SELLABLE_HEALTH = !(s.count > 0) ? { status: 'RED', reason: `SELLABLE=${s.count ?? 'UNKNOWN'}` } : s.count >= (s.target ?? 1) ? { status: 'GREEN', reason: `SELLABLE=${s.count}` } : { status: 'YELLOW', reason: `SELLABLE=${s.count} < target ${s.target}` };
  const l = snap.live ?? {};
  const pricePct = pct((l.priceOk ?? 0) - (l.priceChanged ?? 0), l.total);
  r.PRICE_HEALTH = { status: band(pricePct, 95, 80), reason: l.total ? `${l.priceOk}/${l.total} live prices, ${l.priceChanged ?? 0} changed since scan` : 'no live checks' };
  const unknownPct = pct(l.unknown ?? 0, l.total);
  const availPct = pct(l.available ?? 0, l.total);
  r.STOCK_HEALTH = { status: unknownPct == null ? 'RED' : unknownPct > 5 ? 'RED' : availPct >= 80 ? 'GREEN' : 'YELLOW', reason: l.total ? `${l.available} AVAILABLE / ${l.unavailable} UNAVAILABLE / ${l.unknown} UNKNOWN` : 'no live checks' };
  r.SHIPPING_HEALTH = { status: band(pct(l.shippingKnown ?? 0, l.total), 95, 80), reason: l.total ? `${l.shippingKnown}/${l.total} with known shipping` : 'no live checks' };
  const m = snap.mapping ?? {};
  r.MAPPING_HEALTH = !(m.approved > 0) ? { status: 'RED', reason: `approved mappings=${m.approved ?? 'UNKNOWN'} (candidates ${m.candidates ?? 'UNKNOWN'})` } : (m.duplicates ?? 0) > 0 ? { status: 'YELLOW', reason: `${m.duplicates} duplicate mappings` } : { status: 'GREEN', reason: `${m.approved} approved` };
  const overall = Object.values(r).some((x) => x.status === 'RED') ? 'RED' : Object.values(r).some((x) => x.status === 'YELLOW') ? 'YELLOW' : 'GREEN';
  return { overall, checks: r };
}
