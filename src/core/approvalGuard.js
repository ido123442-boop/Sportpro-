// Server-side mapping-approval guard (PROPOSED fix for the /verify low-confidence issue).
//
// Rule: the client can never raise a mapping's trust level. In particular the request
// field `acknowledge_low_conf` is ignored for authorization. Confidence and tier are
// recomputed on the server from stored evidence; anything below the approval threshold
// is refused and routed to REVIEW_REQUIRED. Batch approval only accepts EXACT-tier items.
// Approval never produces MANUAL_VERIFIED or supplier_ready: it produces
// MAPPING_APPROVED, which is one input to the separate eligibility gate.

export const APPROVAL_POLICY = Object.freeze({
  minSingleApproveConfidence: 0.95, // HIGH or EXACT may be approved one at a time by the owner
  batchTier: 'EXACT',               // batch approval: EXACT only
});

export const TIERS = Object.freeze({ EXACT: 'EXACT', HIGH: 'HIGH', REVIEW: 'REVIEW', NO_MATCH: 'NO_MATCH' });

// Deterministic tier from evidence. Evidence is the stored candidate record, never the request.
export function tierFromEvidence(ev) {
  if (!ev || !ev.supplierVariantId || !ev.shopifyVariantId) return { tier: TIERS.NO_MATCH, confidence: 0, reasons: ['MISSING_IDS'] };
  const reasons = [];
  if (ev.competingCandidates > 0) reasons.push('AMBIGUOUS_MAPPING');
  if (ev.sizeMatch === false) reasons.push('SIZE_MISMATCH');
  if (ev.colorMatch === false) reasons.push('COLOR_MISMATCH');
  if (reasons.length) return { tier: TIERS.REVIEW, confidence: Math.min(ev.confidence ?? 0, 0.5), reasons };
  if ((ev.barcodeExact || ev.skuExact) && ev.sizeMatch !== false) return { tier: TIERS.EXACT, confidence: 1, reasons: ['IDENTIFIER_EXACT'] };
  const c = Number(ev.confidence ?? 0);
  if (!(c >= 0 && c <= 1)) return { tier: TIERS.REVIEW, confidence: 0, reasons: ['INVALID_CONFIDENCE'] };
  if (c >= APPROVAL_POLICY.minSingleApproveConfidence && ev.sizeMatch === true) return { tier: TIERS.HIGH, confidence: c, reasons: ['ATTRIBUTES_MATCH'] };
  return { tier: TIERS.REVIEW, confidence: c, reasons: ['LOW_CONFIDENCE'] };
}

// request: parsed JSON body from the client (untrusted). candidate: stored record (trusted).
// actor: authenticated identity derived from the token (NOT request.approved_by).
export function evaluateApproval({ candidate, request = {}, actor, killSwitchActive = true, batch = false }) {
  const deny = (code, extra = {}) => ({ allowed: false, code, nextStatus: 'REVIEW_REQUIRED', ...extra });
  if (!actor || !actor.id || actor.role !== 'owner') return { allowed: false, code: 'FORBIDDEN', nextStatus: null };
  if (!candidate) return { allowed: false, code: 'NOT_FOUND', nextStatus: null };
  if (candidate.status === 'MAPPING_APPROVED') return { allowed: false, code: 'ALREADY_APPROVED', nextStatus: null };
  if (candidate.status === 'REJECTED') return { allowed: false, code: 'REJECTED_CANDIDATE', nextStatus: null };
  if (request.evidenceHash && candidate.evidenceHash && request.evidenceHash !== candidate.evidenceHash) {
    return { allowed: false, code: 'EVIDENCE_CHANGED', nextStatus: null }; // UI showed stale evidence
  }
  const t = tierFromEvidence(candidate.evidence);
  const ignored = 'acknowledge_low_conf' in request ? ['acknowledge_low_conf'] : [];
  if (batch && t.tier !== APPROVAL_POLICY.batchTier) return deny('BATCH_REQUIRES_EXACT', { tier: t.tier, ignored });
  if (t.tier === TIERS.EXACT || t.tier === TIERS.HIGH) {
    return {
      allowed: true, code: 'APPROVED', nextStatus: 'MAPPING_APPROVED', tier: t.tier, confidence: t.confidence,
      audit: { actorId: actor.id, candidateId: candidate.id, evidenceHash: candidate.evidenceHash ?? null, tier: t.tier, ignored },
      killSwitchActive, // approval of a mapping is independent of purchasing; returned for audit only
    };
  }
  return deny(t.reasons[0] === 'LOW_CONFIDENCE' ? 'LOW_CONFIDENCE' : t.reasons[0], { tier: t.tier, reasons: t.reasons, ignored });
}
