// Shopify sync planner: produces a DRY-RUN queue of desired product states plus a rollback file.
// It never calls Shopify. Execution (later) must be done by the single approved writer.
import { createHash } from 'node:crypto';

export const SYNC_POLICIES = Object.freeze({
  // Only SELLABLE variants may make a product ACTIVE.
  STRICT: 'STRICT',
  // Minimal risk reduction: deactivate ACTIVE products whose every purchasable variant is
  // supplier-UNAVAILABLE or loss-making (net < 0 with verified shipping). Nothing is activated.
  RISK_MINIMUM: 'RISK_MINIMUM',
});

const hash = (o) => createHash('sha256').update(JSON.stringify(o)).digest('hex').slice(0, 16);

/*
 products: [{ productId, title, status, variants: [{ variantId, state, primaryReason, purchasable, supplierStock, profitNet }] }]
 returns { queue: [...], rollback: [...] } — only rows where desired != current are emitted.
*/
export function planSync(products, { policy = SYNC_POLICIES.STRICT, generatedAt }) {
  const queue = []; const rollback = [];
  for (const p of products) {
    if (p.status === 'ARCHIVED') continue;
    let desired = p.status; let reason; let evidence;
    const sellable = p.variants.filter((v) => v.state === 'SELLABLE');
    if (policy === SYNC_POLICIES.STRICT) {
      desired = sellable.length ? 'ACTIVE' : 'DRAFT';
      reason = sellable.length ? 'HAS_SELLABLE_VARIANT' : 'NO_SELLABLE_VARIANT';
      evidence = { sellable: sellable.length, states: countBy(p.variants, (v) => v.state) };
    } else {
      const buyable = p.variants.filter((v) => v.purchasable);
      const bad = buyable.filter((v) => v.supplierStock === 'UNAVAILABLE' || (typeof v.profitNet === 'number' && v.profitNet < 0));
      if (p.status === 'ACTIVE' && buyable.length > 0 && bad.length === buyable.length) {
        desired = 'DRAFT';
        reason = 'ALL_PURCHASABLE_VARIANTS_UNAVAILABLE_OR_LOSS';
        evidence = { purchasable: buyable.length, unavailable: bad.filter((v) => v.supplierStock === 'UNAVAILABLE').length, loss: bad.filter((v) => v.profitNet < 0).length };
      } else { desired = p.status; }
    }
    if (desired === p.status) continue;
    const decision = { productId: p.productId, from: p.status, to: desired, reason, evidence, policy };
    const decisionId = hash(decision);
    queue.push({ product_id: p.productId, title: p.title, current_state: p.status, desired_state: desired, reason, evidence: JSON.stringify(evidence), policy, decision_id: decisionId, generated_at: generatedAt });
    rollback.push({ product_id: p.productId, restore_status: p.status, decision_id: decisionId });
  }
  return { queue, rollback };
}

// Idempotent application plan given the live state right before execution:
// rows already in desired state are skipped; rows whose current state drifted from the plan are refused.
export function reconcileBeforeWrite(queue, liveStatusById) {
  return queue.map((q) => {
    const live = liveStatusById.get(q.product_id);
    if (live === q.desired_state) return { ...q, action: 'SKIP_ALREADY_APPLIED' };
    if (live !== q.current_state) return { ...q, action: 'REFUSE_DRIFT', live_state: live ?? 'MISSING' };
    return { ...q, action: 'APPLY' };
  });
}

// After a (partial) execution, compute what must be rolled back: only rows that were actually applied.
export function rollbackSet(results, rollback) {
  const applied = new Set(results.filter((r) => r.ok && r.action === 'APPLY').map((r) => r.decision_id));
  return rollback.filter((r) => applied.has(r.decision_id));
}

function countBy(arr, f) { const m = {}; for (const x of arr) { const k = f(x); m[k] = (m[k] ?? 0) + 1; } return m; }
