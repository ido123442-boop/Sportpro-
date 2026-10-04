# SPORTPRO — Safety Audit (Phase 0)

Snapshot 2026-10-04. Labels: **VERIFIED / INFERRED / UNKNOWN / BLOCKED**. No production changes were made.

## 1. Live risks in production right now (VERIFIED)

These exist today, independent of the Worker, because Shopify itself accepts orders:

| # | Risk | Evidence | Severity |
|---|---|---|---|
| R1 | **Customers can buy items the supplier does not have.** 2,146 purchasable ACTIVE variants map to a supplier variant that is UNAVAILABLE right now. | `shopify_variants.csv`: `shopify_status=ACTIVE`, (`inventory_tracked=false` or `inventory_qty>0`), `supplier_stock=UNAVAILABLE` | High |
| R2 | **Customers can buy items we sell below cost.** 1,319 purchasable ACTIVE variants have net < 0 after supplier cost, verified shipping and fees (median −20.61 ₪, worst −376.88 ₪, e.g. Head Gravity Pro 2024: ours 753 ₪, AroSport 1,066 ₪). | `profit_net < 0` | High |
| R3 | **Inventory is not a safety net.** 9,906 variants have tracking disabled (sell unlimited). Tracked quantities are synthetic placeholders (1/2/10, or a uniform 1–10). They are not supplier data, since no supplier exposes quantities. | DATA_QUALITY §4 | High |
| R4 | **Four API apps have written to production**, including a Claude chat connector (2,109 creates) and an app that destroyed 999 products on 2026-08-28. Their scopes are unreadable from here (`appInstallations` → access denied). | `production_mutations.csv` | High |
| R5 | **Bulk status changes without a dry-run trail.** 4,783 products were drafted in 8 minutes (2026-10-01). No diff, approval or rollback record is visible in Shopify, and the selection rule is unknown. | CURRENT_STATE §E | High |
| R6 | 99 ACTIVE products from suppliers not in the documented architecture: Footlocker 81 (feed OK, undocumented) and Decathlon 18 (no feed: price and stock unverifiable). | CURRENT_STATE §B.3 | Medium |

R1 and R2 are risks only if an order arrives. Shopify shows 0 orders in the readable window, so there is no realized loss yet. Mitigating them **would be a production write** (status or inventory changes). That needs your decision, a dry run and a rollback plan (§5), so it has **not** been done.

## 2. Control audit

| Control | Expected | Finding | Label |
|---|---|---|---|
| Kill switch | ON; blocks supplier purchasing | Endpoint exists (`GET/POST /api/kill-switch`), state unreadable without a token. The UI toggles with `{active: !current}`, so a stale page can flip it the wrong way. | BLOCKED (state) / VERIFIED (UI design flaw) |
| Webhook HMAC | Reject unsigned/invalid | Webhook route not found by GET probing; the route is registered by app *SportPro Manager* and invisible to this connector. Not tested (sending webhooks is forbidden). | BLOCKED |
| Duplicate webhook / order protection | Idempotent | Claimed (Durable Object lock); code unavailable | BLOCKED |
| Purchase guards | Supplier order number + transaction confirmation required | UI sends `{supplier_order_number, transaction_confirmation}` to `/api/supplier-orders/{id}/purchase`. Server-side enforcement unverified. | VERIFIED (UI) / BLOCKED (server) |
| Approval guards | Two-stage, authenticated identity | UI sends `stage` 1/2 and `approved_by:'owner'` **as a client-supplied string**. Identity is not proven to be derived from the token. | VERIFIED (UI) / INFERRED risk |
| **Low-confidence mapping approval** | Server must refuse | **UI sends `acknowledge_low_conf:true` unconditionally** on every single approve (`POST /api/verify/discovery/approve`), and exposes batch-approve endpoints. Whether the server honors the flag is BLOCKED (no source), but the UI is designed so the flag is always set. | **VERIFIED (UI) — security issue** |
| Auth on API | Token required | All `/api/*` return 401 without a token, including unknown paths (auth before routing) | VERIFIED |
| Token storage | httpOnly session | Bearer tokens in `localStorage` (`vt`, `ot`, `at`) | VERIFIED (weak) |
| Staging/production isolation | Separate D1, separate Shopify credential, no shared side effects | Same build; only one Shopify store exists; both envs' bindings unreadable. **INFERRED: staging can write to production Shopify.** | BLOCKED / INFERRED risk |
| D1 isolation | Separate DBs | — | BLOCKED |
| Shopify credential isolation | One writer, least privilege | 4 writer apps, scopes unknown | VERIFIED (4 writers) |
| Checkout isolation | No automatic supplier payment | No automatic checkout seen in UI (checkout-draft + manual purchase evidence). Server unverified. | VERIFIED (UI) / BLOCKED |
| Repo confidentiality | Private | `ido123442-boop/Sportpro-` is **public** | VERIFIED |

## 3. Proposed fix: low-confidence approval (not deployed)

Implementation: `src/core/approvalGuard.js`. Tests: `test/approvalGuard.test.js`, 9 tests, all passing.

Rules:
1. The server **recomputes** tier and confidence from the *stored* candidate evidence. Request fields (`acknowledge_low_conf`, `confidence`, `tier`) are ignored for authorization and recorded as `ignored` in the audit trail.
2. Tiers: **EXACT** (exact identifier with no size/color contradiction), **HIGH** (stored confidence ≥ 0.95 *and* size match), otherwise **REVIEW**. Any competing candidate → REVIEW (`AMBIGUOUS_MAPPING`).
3. Single approve is allowed for EXACT or HIGH only. **Batch approve is allowed for EXACT only.**
4. REVIEW-tier items are refused and moved to `REVIEW_REQUIRED`. To approve one, evidence must be added and confidence recomputed server-side. No client flag can bypass this.
5. Approval produces `MAPPING_APPROVED` only. It never sets `MANUAL_VERIFIED` or `supplier_ready`; sellability is decided separately by the eligibility gate.
6. The actor comes from the authenticated token (`role === 'owner'`); `approved_by` in the body is ignored.
7. Stale UI protection: if the client's `evidenceHash` differs from the stored one → `EVIDENCE_CHANGED`.
8. Duplicate approval → `ALREADY_APPROVED`. Rejected candidates cannot be approved.

UI change (when source is recovered): delete `acknowledge_low_conf:true` from both approve calls; disable batch-approve unless every selected item is EXACT; display the server's tier.

Integration sketch for the Worker handler (pseudo-code):
```js
const candidate = await db.getCandidate(body.id);            // trusted
const actor = await auth.fromBearer(request);                  // never from body
const r = evaluateApproval({ candidate, request: body, actor, batch: false });
await db.audit({ action: 'APPROVE_MAPPING', ...r.audit, result: r.code });
if (!r.allowed) return json({ error: r.code, tier: r.tier }, 409);
await db.transitionCandidate(candidate.id, 'NEW', r.nextStatus);  // compare-and-set
```

## 4. Test status

| Suite | Result |
|---|---|
| New: `test/approvalGuard.test.js` (9) + `test/core.test.js` (24) | **33/33 pass** (`npm test`, Node 22) |
| Historical 73/73, 86/86, E2E | **BLOCKED**: no source code to run. Not reported as pass. |

## 5. Protocol for any future production write (unchanged requirement)

Every Shopify write must have: dry-run file → diff → exact count → sample → owner approval → execution log → post-check → rollback file. Rollback for status changes is cheap and deterministic (restore the previous `status` per product ID from the pre-change snapshot), so the snapshot must be taken first. The current snapshot (`shopify_full.jsonl`, sha256 `b1d0f58f…930872b`) can serve as that baseline for a write made today.
