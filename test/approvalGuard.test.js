import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateApproval, tierFromEvidence } from '../src/core/approvalGuard.js';

const owner = { id: 'u1', role: 'owner' };
const cand = (evidence, extra = {}) => ({ id: 'c1', status: 'NEW', evidenceHash: 'h1', evidence: { supplierVariantId: 's1', shopifyVariantId: 'v1', competingCandidates: 0, ...evidence }, ...extra });

test('low confidence + acknowledge_low_conf=true is still refused', () => {
  const r = evaluateApproval({ candidate: cand({ confidence: 0.6, sizeMatch: true }), request: { acknowledge_low_conf: true }, actor: owner });
  assert.equal(r.allowed, false);
  assert.equal(r.code, 'LOW_CONFIDENCE');
  assert.equal(r.nextStatus, 'REVIEW_REQUIRED');
  assert.deepEqual(r.ignored, ['acknowledge_low_conf']);
});

test('client-supplied confidence/tier in request is ignored', () => {
  const r = evaluateApproval({ candidate: cand({ confidence: 0.4 }), request: { confidence: 1, tier: 'EXACT', acknowledge_low_conf: true }, actor: owner });
  assert.equal(r.allowed, false);
});

test('exact SKU match can be approved; status is MAPPING_APPROVED, never MANUAL_VERIFIED/supplier_ready', () => {
  const r = evaluateApproval({ candidate: cand({ skuExact: true, sizeMatch: true }), actor: owner });
  assert.equal(r.allowed, true);
  assert.equal(r.nextStatus, 'MAPPING_APPROVED');
  assert.notEqual(r.nextStatus, 'MANUAL_VERIFIED');
});

test('high confidence with size match approved singly but refused in batch', () => {
  const c = cand({ confidence: 0.97, sizeMatch: true });
  assert.equal(evaluateApproval({ candidate: c, actor: owner }).allowed, true);
  const b = evaluateApproval({ candidate: c, actor: owner, batch: true });
  assert.equal(b.allowed, false);
  assert.equal(b.code, 'BATCH_REQUIRES_EXACT');
});

test('ambiguous mapping refused even with exact SKU', () => {
  const r = evaluateApproval({ candidate: cand({ skuExact: true, sizeMatch: true, competingCandidates: 2 }), request: { acknowledge_low_conf: true }, actor: owner });
  assert.equal(r.allowed, false);
  assert.equal(r.code, 'AMBIGUOUS_MAPPING');
});

test('size or color mismatch refused', () => {
  assert.equal(evaluateApproval({ candidate: cand({ skuExact: true, sizeMatch: false }), actor: owner }).code, 'SIZE_MISMATCH');
  assert.equal(evaluateApproval({ candidate: cand({ confidence: 0.99, sizeMatch: true, colorMatch: false }), actor: owner }).code, 'COLOR_MISMATCH');
});

test('non-owner or missing actor refused; approved_by in body is not identity', () => {
  const c = cand({ skuExact: true, sizeMatch: true });
  assert.equal(evaluateApproval({ candidate: c, request: { approved_by: 'owner' }, actor: null }).code, 'FORBIDDEN');
  assert.equal(evaluateApproval({ candidate: c, actor: { id: 'x', role: 'viewer' } }).code, 'FORBIDDEN');
});

test('duplicate approval and stale evidence refused', () => {
  assert.equal(evaluateApproval({ candidate: cand({ skuExact: true }, { status: 'MAPPING_APPROVED' }), actor: owner }).code, 'ALREADY_APPROVED');
  assert.equal(evaluateApproval({ candidate: cand({ skuExact: true, sizeMatch: true }), request: { evidenceHash: 'old' }, actor: owner }).code, 'EVIDENCE_CHANGED');
});

test('invalid or missing confidence fails closed', () => {
  assert.equal(tierFromEvidence({ supplierVariantId: 's', shopifyVariantId: 'v', confidence: 'abc', sizeMatch: true }).tier, 'REVIEW');
  assert.equal(tierFromEvidence({ supplierVariantId: 's', shopifyVariantId: 'v', confidence: 7, sizeMatch: true }).tier, 'REVIEW');
  assert.equal(tierFromEvidence(null).tier, 'NO_MATCH');
});
