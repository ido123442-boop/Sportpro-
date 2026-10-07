// Central authorization for every action that can move money or change Shopify.
// Order of checks: kill switch (fail closed) -> action-specific preconditions.
// Returns { allowed, reason }. Anything missing or unreadable => allowed:false.
import { classifyVariant } from './eligibility.js';

export const ACTIONS = Object.freeze(['APPROVAL_1', 'APPROVAL_2', 'CHECKOUT_DRAFT', 'PURCHASE', 'SHOPIFY_MUTATION', 'PUBLISH_LISTING']);

// Same semantics as the patched Worker (worker/patch_worker.py): only explicit OFF allows.
export function parseKillSwitch(raw) {
  if (raw === null || raw === undefined) return { state: 'INVALID', reason: 'missing' };
  const s = typeof raw === 'string' ? raw.trim() : raw;
  if (s === 'ON') return { state: 'ON', reason: 'legacy_string_on' };
  if (s === 'OFF') return { state: 'OFF', reason: 'legacy_string_off' };
  let v = s;
  if (typeof s === 'string') { try { v = JSON.parse(s); } catch { return { state: 'INVALID', reason: 'malformed' }; } }
  if (!v || typeof v !== 'object' || Array.isArray(v) || !('active' in v)) return { state: 'INVALID', reason: 'malformed' };
  if (v.active === true || v.active === 1) return { state: 'ON', reason: 'active' };
  if (v.active === false || v.active === 0) return { state: 'OFF', reason: 'inactive' };
  return { state: 'INVALID', reason: 'ambiguous_active_value' };
}

/*
 ctx = {
   settings: { kill_switch: <raw stored value> } | undefined,
   action: one of ACTIONS,
   sellableCtx: input for classifyVariant (required for PUBLISH_LISTING, SHOPIFY_MUTATION and every order action),
   approvals: { stage1: bool, stage2: bool },
   evidence: { supplierOrderNumber, transactionConfirmation },
   shopifyWritesEnabled: bool,
 }
*/
export function authorizeAction(ctx) {
  const deny = (reason) => ({ allowed: false, reason });
  try {
    const { settings, action, sellableCtx, approvals = {}, evidence = {}, shopifyWritesEnabled = false } = ctx ?? {};
    if (!ACTIONS.includes(action)) return deny('UNKNOWN_ACTION');
    if (!settings || typeof settings !== 'object') return deny('SETTINGS_MISSING');
    const ks = parseKillSwitch(settings.kill_switch);
    if (ks.state !== 'OFF') return deny(`KILL_SWITCH_${ks.state}`);

    // every action requires the variant to be SELLABLE right now
    if (!sellableCtx) return deny('SELLABLE_CONTEXT_MISSING');
    const gate = classifyVariant(sellableCtx);
    if (gate.state !== 'SELLABLE') return deny(`NOT_SELLABLE:${gate.state}:${gate.primaryReason}`);

    switch (action) {
      case 'SHOPIFY_MUTATION':
      case 'PUBLISH_LISTING':
        return shopifyWritesEnabled === true ? { allowed: true, reason: null } : deny('SHOPIFY_WRITES_DISABLED');
      case 'APPROVAL_1':
        return { allowed: true, reason: null };
      case 'APPROVAL_2':
        return approvals.stage1 === true ? { allowed: true, reason: null } : deny('APPROVAL_1_MISSING');
      case 'CHECKOUT_DRAFT':
        return approvals.stage1 === true ? { allowed: true, reason: null } : deny('APPROVAL_1_MISSING');
      case 'PURCHASE':
        if (approvals.stage1 !== true || approvals.stage2 !== true) return deny('TWO_APPROVALS_REQUIRED');
        if (!evidence.supplierOrderNumber || !evidence.transactionConfirmation) return deny('PURCHASE_EVIDENCE_MISSING');
        return { allowed: true, reason: null };
      default:
        return deny('UNKNOWN_ACTION');
    }
  } catch (e) {
    return deny(`EVALUATION_ERROR:${e?.message ?? e}`);
  }
}
