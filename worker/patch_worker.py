"""Phase 1A security patch for the recovered Worker bundle.

Input : worker/recovered/index.v15.js  (deployed prod v15 == staging v46, sha256 64991b27...)
Output: worker/src/index.js

Every replacement must match exactly once, otherwise the script aborts.
Run: python3 worker/patch_worker.py
"""
import hashlib
import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parent
SRC = ROOT / "recovered" / "index.v15.js"
DST = ROOT / "src" / "index.js"
EXPECTED_SHA = "64991b274e37ac74da527740647366f5826038a52d9adfec9add437a41e8219d"

code = SRC.read_text(encoding="utf-8")
if hashlib.sha256(code.encode()).hexdigest() != EXPECTED_SHA:
    sys.exit("recovered bundle hash mismatch")


def sub(old, new, count=1):
    global code
    n = code.count(old)
    if n != count:
        sys.exit(f"patch anchor found {n}x (expected {count}): {old[:80]!r}")
    code = code.replace(old, new)


# 1. Fail-closed kill switch helpers (inserted before getSettings) ---------------------------
sub(
    "async function getSettings(db) {",
    r'''// SPORTPRO PHASE 1A: fail-closed kill switch.
// Only two values allow anything: the canonical JSON {"active":false} (or legacy "OFF" / {"active":0}).
// Everything else (ON, missing row, malformed value, read error) means BLOCK.
function parseKillSwitch(raw) {
  if (raw === null || raw === undefined) return { state: "INVALID", reason: "missing" };
  const s = typeof raw === "string" ? raw.trim() : raw;
  if (s === "ON") return { state: "ON", reason: "legacy_string_on" };
  if (s === "OFF") return { state: "OFF", reason: "legacy_string_off" };
  let v = s;
  if (typeof s === "string") {
    try { v = JSON.parse(s); } catch { return { state: "INVALID", reason: "malformed" }; }
  }
  if (!v || typeof v !== "object" || Array.isArray(v) || !("active" in v)) return { state: "INVALID", reason: "malformed" };
  if (v.active === true || v.active === 1) return { state: "ON", reason: "active" };
  if (v.active === false || v.active === 0) return { state: "OFF", reason: "inactive" };
  return { state: "INVALID", reason: "ambiguous_active_value" };
}
__name(parseKillSwitch, "parseKillSwitch");
async function readKillSwitch(db) {
  try {
    const row = await db.prepare(`SELECT value FROM system_settings WHERE key = 'kill_switch'`).first();
    if (!row) return { state: "INVALID", reason: "missing" };
    return parseKillSwitch(row.value);
  } catch (e) {
    return { state: "INVALID", reason: "read_error" };
  }
}
__name(readKillSwitch, "readKillSwitch");
async function killSwitchBlock(db, action) {
  const ks = await readKillSwitch(db);
  if (ks.state === "OFF") return null;
  return Response.json(
    { error: "kill_switch_blocked", action, kill_switch: ks.state, reason: ks.reason },
    { status: 423 }
  );
}
__name(killSwitchBlock, "killSwitchBlock");
// SPORTPRO: single central guard for every money / write action.
// Order: kill switch -> environment isolation -> action preconditions -> SELLABLE gate.
// Anything not explicitly allowed is blocked, and every block is written to audit_log (best effort).
// The SELLABLE gate (src/core/eligibility.js + actionGuard.js) is not wired into this legacy schema,
// so REAL (non-test) orders are blocked until it is. Only is_test orders may move, and only when
// SPORTPRO_ENV === "staging" on a store that is NOT the production store.
const GUARDED_ACTIONS = ["approval_1", "approval_2", "checkout_draft", "purchase", "shopify_mutation"];
const PRODUCTION_SHOP_DOMAINS = ["xayj9j-q9.myshopify.com", "sportpro.shop", "www.sportpro.shop"];
async function guardAction(db, env2, action, ctx = {}) {
  const g = await guardDecision(db, env2, action, ctx);
  if (!g.ok) {
    try {
      await db.prepare(
        `INSERT INTO audit_log (actor, action, entity_type, entity_id, details) VALUES ('guard', 'GUARD_BLOCKED', ?, ?, ?)`
      ).bind(action, ctx.so ? String(ctx.so.id) : null, JSON.stringify({ error: g.error, reason: g.reason || null, kill_switch: g.kill_switch || null })).run();
    } catch {
    }
  }
  return g;
}
__name(guardAction, "guardAction");
async function guardDecision(db, env2, action, ctx) {
  if (!GUARDED_ACTIONS.includes(action)) return { ok: false, error: "unknown_action", action };
  const ks = await readKillSwitch(db);
  if (ks.state !== "OFF") return { ok: false, status: 423, error: "kill_switch_blocked", action, kill_switch: ks.state, reason: ks.reason };
  if (!env2 || env2.SPORTPRO_ENV !== "staging") return { ok: false, status: 423, error: "environment_not_staging", action, reason: "writes_and_order_flow_allowed_in_staging_only" };
  const shop = String(env2.SHOPIFY_SHOP_DOMAIN || "").trim().toLowerCase();
  if (!shop || PRODUCTION_SHOP_DOMAINS.includes(shop)) return { ok: false, status: 423, error: "staging_not_isolated", action, reason: "shop_domain_is_production_or_missing" };
  if (action === "shopify_mutation") {
    if (env2.SHOPIFY_WRITES_ENABLED !== "true") return { ok: false, error: "writes_disabled", action };
    return { ok: true };
  }
  const so = ctx.so;
  if (!so) return { ok: false, status: 404, error: "not_found", action };
  if (so.is_test !== 1) return { ok: false, status: 423, error: "sellable_gate_required", action, reason: "real_orders_blocked_until_sellable_gate_is_wired" };
  return { ok: true };
}
__name(guardDecision, "guardDecision");
function guardResponse(g) {
  const { ok, status, ...rest } = g;
  return Response.json(rest, { status: status || 423 });
}
__name(guardResponse, "guardResponse");
async function getSettings(db) {''',
)

# 2. ingestOrder: queue the order unless the kill switch is explicitly OFF ----------------------
sub(
    "  if (settings.kill_switch?.active) {\n    await insertOrder(",
    "  if ((await readKillSwitch(db)).state !== \"OFF\") {\n    await insertOrder(",
)

# 3. killSwitchActive (used by the test simulator): fail closed ------------------------------
sub(
    '''  try {
    return !!(JSON.parse(row.value) && JSON.parse(row.value).active);
  } catch {
    return false;
  }
}
__name(killSwitchActive, "killSwitchActive");''',
    '''  return parseKillSwitch(row ? row.value : null).state !== "OFF";
}
__name(killSwitchActive, "killSwitchActive");''',
)
sub(
    '''async function killSwitchActive(db) {
  const row = await db.prepare(
    `SELECT value FROM system_settings WHERE key = 'kill_switch'`
  ).first();''',
    '''async function killSwitchActive(db) {
  let row = null;
  try {
    row = await db.prepare(
      `SELECT value FROM system_settings WHERE key = 'kill_switch'`
    ).first();
  } catch {
    return true;
  }''',
)

# 4. GET / POST /api/kill-switch -------------------------------------------------------------
sub(
    '''  if (path === "/api/kill-switch" && request.method === "GET") {
    const row = await db.prepare(
      `SELECT value FROM system_settings WHERE key = 'kill_switch'`
    ).first();
    let active = false;
    try {
      active = !!(row && JSON.parse(row.value).active);
    } catch {
      active = false;
    }
    return Response.json({
      kill_switch_active: active,''',
    '''  if (path === "/api/kill-switch" && request.method === "GET") {
    const ks = await readKillSwitch(db);
    return Response.json({
      kill_switch_active: ks.state !== "OFF",
      kill_switch_state: ks.state,
      kill_switch_reason: ks.reason,''',
)
sub(
    '''  if (path === "/api/kill-switch" && request.method === "POST") {
    const body = await request.json();
    const active = body.active ? 1 : 0;
    await db.prepare(
      `UPDATE system_settings SET value = json_set(value, '$.active', json(?)),
         updated_at = datetime('now') WHERE key = 'kill_switch'`
    ).bind(JSON.stringify(active)).run();''',
    '''  if (path === "/api/kill-switch" && request.method === "POST") {
    const body = await request.json().catch(() => ({}));
    if (typeof body.active !== "boolean") {
      return Response.json({ error: "active_must_be_boolean" }, { status: 400 });
    }
    if (body.active === false && body.confirm !== "DISABLE_KILL_SWITCH") {
      return Response.json({ error: "confirm_required", confirm: "DISABLE_KILL_SWITCH" }, { status: 400 });
    }
    const active = body.active ? 1 : 0;
    await db.prepare(
      `INSERT INTO system_settings (key, value, updated_at) VALUES ('kill_switch', ?, datetime('now'))
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`
    ).bind(JSON.stringify({ active: body.active })).run();''',
)

# 5. Kill switch before approvals #1/#2, checkout draft, purchase, simulator order ---------------
sub(
    '''  if (path === "/api/approvals" && request.method === "POST") {
    const body = await request.json();''',
    '''  if (path === "/api/approvals" && request.method === "POST") {
    const ksBlockApproval = await killSwitchBlock(db, "approval");
    if (ksBlockApproval) return ksBlockApproval;
    const body = await request.json();''',
)
sub(
    '''  if (draft && request.method === "POST") {
    const id = Number(draft[1]);''',
    '''  if (draft && request.method === "POST") {
    const ksBlockDraft = await killSwitchBlock(db, "checkout_draft");
    if (ksBlockDraft) return ksBlockDraft;
    const id = Number(draft[1]);''',
)
sub(
    '''  if (purch && request.method === "POST") {
    const id = Number(purch[1]);''',
    '''  if (purch && request.method === "POST") {
    const ksBlockPurchase = await killSwitchBlock(db, "purchase");
    if (ksBlockPurchase) return ksBlockPurchase;
    const id = Number(purch[1]);''',
)
# purchase: require both approvals to exist, independent of the status column
sub(
    '''    if (canonicalStatus(so.status) !== "PAYMENT_PENDING_SUPPLIER") {
      return Response.json({ error: `awaiting_payment_required:${so.status}` }, { status: 409 });
    }''',
    '''    const gPurchase = await guardAction(db, env2, "purchase", { so });
    if (!gPurchase.ok) return guardResponse(gPurchase);
    if (canonicalStatus(so.status) !== "PAYMENT_PENDING_SUPPLIER") {
      return Response.json({ error: `awaiting_payment_required:${so.status}` }, { status: 409 });
    }
    const approvalRows = await db.prepare(
      `SELECT stage FROM approvals WHERE supplier_order_id = ? AND decision = 'APPROVED'`
    ).bind(id).all();
    const approvedStages = new Set((approvalRows.results || []).map((r) => Number(r.stage)));
    if (!approvedStages.has(1) || !approvedStages.has(2)) {
      return Response.json({ error: "two_approvals_required" }, { status: 409 });
    }''',
)

# 5b. Central guard (SELLABLE gate) after the supplier order is loaded -------------------------
sub(
    '''    if (!so) return Response.json({ error: "not_found" }, { status: 404 });
    const st = canonicalStatus(so.status);
    if (st !== "APPROVED") {''',
    '''    if (!so) return Response.json({ error: "not_found" }, { status: 404 });
    const gDraft = await guardAction(db, env2, "checkout_draft", { so });
    if (!gDraft.ok) return guardResponse(gDraft);
    const st = canonicalStatus(so.status);
    if (st !== "APPROVED") {''',
)
sub(
    '''    if (!so) return Response.json({ error: "not_found" }, { status: 404 });
    const dup = await db.prepare(''',
    '''    if (!so) return Response.json({ error: "not_found" }, { status: 404 });
    const gApproval = await guardAction(db, env2, stage === 2 ? "approval_2" : "approval_1", { so });
    if (!gApproval.ok) return guardResponse(gApproval);
    const dup = await db.prepare(''',
)

# 5c. Orders API: unreadable settings (missing table, D1 error) -> explicit fail-closed block --------
sub(
    '''  const settings = await getSettings(db);
  if (path === "/api/procurement/queue" && request.method === "GET") {''',
    '''  let settings;
  try {
    settings = await getSettings(db);
  } catch (e) {
    return Response.json({ error: "settings_unavailable_fail_closed", kill_switch: "INVALID" }, { status: 423 });
  }
  if (path === "/api/procurement/queue" && request.method === "GET") {''',
)

# 6. Shopify GraphQL: mutations are disabled unless explicitly enabled AND kill switch is OFF ---
sub(
    '''async function shopifyGraphQL(env2, query, variables = {}) {
  const token = await getAdminToken(env2);''',
    '''async function shopifyGraphQL(env2, query, variables = {}) {
  if (/^\\s*mutation\\b/i.test(String(query))) {
    const g = await guardAction(env2.DB, env2, "shopify_mutation");
    if (!g.ok) throw new Error(`shopify_mutation_blocked:${g.error === "kill_switch_blocked" ? "kill_switch_" + g.kill_switch : g.error}`);
  }
  const token = await getAdminToken(env2);''',
)

# 7. Remove the Shopify token minting endpoint -------------------------------------------------
start = code.index('  if (path === "/api/recovery/mint-token" && method === "POST") {')
end = code.index('  if (path === "/api/recovery/discovery-import" && method === "POST") {')
code = code[:start] + '''  if (path === "/api/recovery/mint-token") {
    // SPORTPRO PHASE 1A: removed. This endpoint returned a full Shopify Admin access token.
    return Response.json({ error: "endpoint_removed" }, { status: 410 });
  }
''' + code[end:]

# 8. Low-confidence discovery approvals: no client override -----------------------------------
sub(
    '''    if (conf < 0.9 && !b.acknowledge_low_conf)
      return Response.json({ error: "low_confidence_needs_acknowledge", confidence: conf }, { status: 409 });''',
    '''    if (!(conf >= 0.9))
      return Response.json({ error: "confidence_below_0_90", confidence: conf }, { status: 409 });''',
)
# UI: stop sending the flag; block low-confidence approvals in the page as well
sub(
    "api('/api/verify/discovery/approve',{method:'POST',body:JSON.stringify({id:l.id,acknowledge_low_conf:true})})",
    "api('/api/verify/discovery/approve',{method:'POST',body:JSON.stringify({id:l.id})})",
)
sub(
    "api('/api/verify/discovery/approve',{method:'POST',body:JSON.stringify({id:r.id,acknowledge_low_conf:true})})",
    "api('/api/verify/discovery/approve',{method:'POST',body:JSON.stringify({id:r.id})})",
)

# 9. Expose pure helpers for tests (no effect on the Worker runtime) --------------------------
sub(
    '''export {
  ProcurementLock,
  index_default as default
};''',
    '''export {
  ProcurementLock,
  index_default as default,
  parseKillSwitch as __parseKillSwitch,
  shopifyGraphQL as __shopifyGraphQL,
  guardAction as __guardAction
};''',
)

if "acknowledge_low_conf" in code:
    sys.exit("acknowledge_low_conf still present")
if "access_token: d.access_token" in code:
    sys.exit("mint-token response still present")

DST.write_text(code, encoding="utf-8")
print("patched ->", DST, hashlib.sha256(code.encode()).hexdigest()[:16])
