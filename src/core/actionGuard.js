// Central authorization for every action that can move money or change Shopify.
// Order of checks: action known -> settings -> kill switch (fail closed) -> target (production
// protection) -> SELLABLE (src/core/sellable.js, the only authority) -> action preconditions.
// Returns { allowed, reason, sellableReasons? }. Anything missing or unreadable => allowed:false.
import { parseKillSwitch } from './killSwitch.js';
import { evaluateSellable } from './sellable.js';
import { checkTarget } from './targetGuard.js';

export { parseKillSwitch };
export const ACTIONS = Object.freeze(['APPROVAL_1', 'APPROVAL_2', 'CHECKOUT_DRAFT', 'PURCHASE', 'SHOPIFY_MUTATION', 'PUBLISH_LISTING']);

/*
 ctx = {
   settings: { kill_switch: <raw stored value> },
   action: one of ACTIONS,
   target: { environment, shopDomain, shopId, clientIdSha256, productionFingerprints, productionApproved },
   sellableInput: input for evaluateSellable (killSwitch and target are taken from this ctx, never from the input),
   approvals: { stage1: bool, stage2: bool },
   evidence: { supplierOrderNumber, transactionConfirmation },
   shopifyWritesEnabled: bool,
 }
*/
export function authorizeAction(ctx) {
  const deny = (reason, extra = {}) => ({ allowed: false, reason, ...extra });
  try {
    const { settings, action, target, sellableInput, approvals = {}, evidence = {}, shopifyWritesEnabled = false } = ctx ?? {};
    if (!ACTIONS.includes(action)) return deny('UNKNOWN_ACTION');
    if (!settings || typeof settings !== 'object') return deny('SETTINGS_MISSING');
    const ks = parseKillSwitch(settings.kill_switch);
    if (ks.state !== 'OFF') return deny(`KILL_SWITCH_${ks.state}`);
    if (!target) return deny('TARGET_MISSING');
    const t = checkTarget(target);
    if (!t.allowed) return deny(`TARGET_BLOCKED:${t.reason}`);

    if (!sellableInput) return deny('SELLABLE_CONTEXT_MISSING');
    const s = evaluateSellable({ ...sellableInput, killSwitch: settings.kill_switch, target });
    if (!s.sellable) return deny(`NOT_SELLABLE:${s.reasons.join('|')}`, { sellableReasons: s.reasons });

    switch (action) {
      case 'SHOPIFY_MUTATION':
      case 'PUBLISH_LISTING':
        return shopifyWritesEnabled === true ? { allowed: true, reason: null } : deny('SHOPIFY_WRITES_DISABLED');
      case 'APPROVAL_1':
        return { allowed: true, reason: null };
      case 'APPROVAL_2':
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
