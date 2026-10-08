// Runs the real (patched) Worker bundle in Node against an in-memory SQLite database with the
// recovered legacy D1 schema. No network: global fetch is replaced and every call is recorded.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';

const SCHEMA = fs.readFileSync(new URL('../worker/schema/legacy_staging_schema.sql', import.meta.url), 'utf8');
const worker = await import('../worker/src/index.js');
const W = worker.default;
const ADMIN = 'test-admin-token';
const WEBHOOK_SECRET = 'test-webhook-secret';

// ---- minimal D1 adapter over node:sqlite ----
function d1(db) {
  const norm = (a) => (a === undefined ? null : typeof a === 'boolean' ? (a ? 1 : 0) : a);
  const stmt = (sql, args = []) => ({
    bind: (...a) => stmt(sql, a.map(norm)),
    first: async (col) => { const r = db.prepare(sql).get(...args); return r === undefined ? null : col ? r[col] : { ...r }; },
    all: async () => ({ results: db.prepare(sql).all(...args).map((r) => ({ ...r })), success: true }),
    run: async () => { const r = db.prepare(sql).run(...args); return { success: true, meta: { changes: Number(r.changes), last_row_id: Number(r.lastInsertRowid) } }; },
  });
  return { prepare: (sql) => stmt(sql), batch: async (list) => Promise.all(list.map((s) => s.run())), _db: db };
}

function makeEnv({ killSwitch = '{"active":true}', withSettingsTable = true, sportproEnv = 'staging', shop = 'sportpro-staging-dev.myshopify.com' } = {}) {
  const db = new DatabaseSync(':memory:');
  db.exec(SCHEMA);
  if (!withSettingsTable) db.exec('DROP TABLE system_settings');
  else if (killSwitch !== null) db.prepare("INSERT INTO system_settings (key, value) VALUES ('kill_switch', ?)").run(killSwitch);
  db.exec(`INSERT INTO suppliers (id, code, name, platform, status) VALUES (1, 'footlocker', 'Foot Locker', 'shopify', 'ACTIVE')`);
  const locks = new Map();
  return {
    DB: d1(db), _db: db,
    ADMIN_TOKEN: ADMIN, WEBHOOK_SECRET, SPORTPRO_ENV: sportproEnv, SHOPIFY_SHOP_DOMAIN: shop, SHOPIFY_CLIENT_ID: 'x', SHOPIFY_CLIENT_SECRET: 'y',
    PROCUREMENT_LOCK: {
      idFromName: (n) => n,
      get: (id) => ({ fetch: async (u) => { const a = new URL(u).pathname.slice(1); if (a === 'acquire') { if (locks.has(id)) return Response.json({ acquired: false }); locks.set(id, 1); return Response.json({ acquired: true }); } locks.delete(id); return Response.json({ released: true }); } }),
    },
  };
}

const fetchCalls = [];
globalThis.fetch = async (url, init) => { fetchCalls.push(String(url)); return new Response(JSON.stringify({ access_token: 'SHOULD_NEVER_BE_RETURNED' }), { status: 200 }); };

async function call(env, method, path, body, { auth = true } = {}) {
  const headers = { 'content-type': 'application/json' };
  if (auth) headers.authorization = `Bearer ${ADMIN}`;
  const res = await W.fetch(new Request(`https://w.test${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) }), env, {});
  let json = null; try { json = await res.clone().json(); } catch {}
  return { status: res.status, json, text: json ? null : await res.text() };
}

function seedOrder(env, { soStatus = 'PENDING', approvals = [], isTest = 0 } = {}) {
  const db = env._db;
  db.exec(`INSERT INTO orders (id, shopify_order_id, financial_status, status) VALUES (1, 'S1', 'paid', 'READY_FOR_APPROVAL')`);
  db.prepare(`INSERT INTO supplier_orders (id, order_id, supplier_id, status, items, is_test) VALUES (1, 1, 1, ?, ?, ?)`).run(soStatus, JSON.stringify([{ sku: 'X', qty: 1 }]), isTest);
  for (const st of approvals) db.prepare(`INSERT INTO approvals (order_id, supplier_order_id, stage, decision, approved_by) VALUES (1, 1, ?, 'APPROVED', 'owner')`).run(st);
}

// ---------------- kill switch parsing ----------------
test('kill switch parser: only explicit OFF allows; everything else blocks', () => {
  const p = worker.__parseKillSwitch;
  assert.equal(p('{"active":false}').state, 'OFF');
  assert.equal(p('{"active":0}').state, 'OFF');
  assert.equal(p('OFF').state, 'OFF');
  assert.equal(p('ON').state, 'ON');
  assert.equal(p('{"active":true}').state, 'ON');
  for (const bad of ['maybe', '', '{"active":"no"}', '{"active":null}', '{}', '[]', 'off', '{"active":2}', null, undefined]) {
    assert.notEqual(p(bad).state, 'OFF', `must block: ${bad}`);
  }
});

test('GET /api/kill-switch: legacy "ON" now reads as active (was reported as off)', async () => {
  const r = await call(makeEnv({ killSwitch: 'ON' }), 'GET', '/api/kill-switch');
  assert.equal(r.status, 200); assert.equal(r.json.kill_switch_active, true); assert.equal(r.json.kill_switch_state, 'ON');
});

test('GET /api/kill-switch: malformed, missing row, missing table -> active (blocked)', async () => {
  for (const env of [makeEnv({ killSwitch: '{"active":"yes"}' }), makeEnv({ killSwitch: null }), makeEnv({ withSettingsTable: false })]) {
    const r = await call(env, 'GET', '/api/kill-switch');
    assert.equal(r.json.kill_switch_active, true);
    assert.equal(r.json.kill_switch_state, 'INVALID');
  }
});

test('POST /api/kill-switch: requires boolean; disabling requires explicit confirm; works on legacy "ON" value', async () => {
  const env = makeEnv({ killSwitch: 'ON' });
  assert.equal((await call(env, 'POST', '/api/kill-switch', { active: 'false' })).status, 400);
  assert.equal((await call(env, 'POST', '/api/kill-switch', { active: false })).status, 400);
  const on = await call(env, 'POST', '/api/kill-switch', { active: true, by: 'owner' });
  assert.equal(on.status, 200);
  assert.equal(env._db.prepare("SELECT value FROM system_settings WHERE key='kill_switch'").get().value, '{"active":true}');
  const off = await call(env, 'POST', '/api/kill-switch', { active: false, confirm: 'DISABLE_KILL_SWITCH', by: 'owner' });
  assert.equal(off.status, 200);
  assert.equal((await call(env, 'GET', '/api/kill-switch')).json.kill_switch_state, 'OFF');
});

// ---------------- kill switch ON / malformed / missing blocks every money path ----------------
const BLOCKING = { ON: '{"active":true}', LEGACY_ON: 'ON', MALFORMED: 'not-json', MISSING: null };
for (const [label, ks] of Object.entries(BLOCKING)) {
  test(`kill switch ${label}: approval #1, approval #2, checkout draft, purchase are all blocked (423)`, async () => {
    const env = makeEnv({ killSwitch: ks });
    seedOrder(env, { soStatus: 'PAYMENT_PENDING_SUPPLIER', approvals: [1, 2] });
    const results = [
      await call(env, 'POST', '/api/approvals', { supplier_order_id: 1, stage: 1, decision: 'APPROVED', approved_by: 'owner' }),
      await call(env, 'POST', '/api/approvals', { supplier_order_id: 1, stage: 2, decision: 'APPROVED', approved_by: 'owner' }),
      await call(env, 'POST', '/api/supplier-orders/1/checkout-draft', {}),
      await call(env, 'POST', '/api/supplier-orders/1/purchase', { supplier_order_number: 'N1', transaction_confirmation: 'T1' }),
    ];
    for (const r of results) { assert.equal(r.status, 423); assert.equal(r.json.error, 'kill_switch_blocked'); }
    assert.equal(env._db.prepare('SELECT COUNT(*) n FROM supplier_purchases').get().n, 0);
  });
}

test('missing settings table -> every money path fails closed (request errors, nothing purchased)', async () => {
  const env = makeEnv({ withSettingsTable: false });
  seedOrder(env, { soStatus: 'PAYMENT_PENDING_SUPPLIER', approvals: [1, 2] });
  for (const [m, p, b] of [['POST', '/api/supplier-orders/1/purchase', { supplier_order_number: 'N1', transaction_confirmation: 'T1' }], ['POST', '/api/supplier-orders/1/checkout-draft', {}], ['POST', '/api/approvals', { supplier_order_id: 1, stage: 1, decision: 'APPROVED' }]]) {
    let status;
    try { status = (await call(env, m, p, b)).status; } catch { status = 500; } // Workers turn an uncaught error into HTTP 500
    assert.ok(status === 423 || status >= 500, `${p} -> ${status}`);
  }
  assert.equal(env._db.prepare('SELECT COUNT(*) n FROM supplier_purchases').get().n, 0);
  assert.equal(env._db.prepare('SELECT COUNT(*) n FROM approvals').get().n, 2);
});

test('kill switch OFF: purchase still blocked without both approvals (even if status says payment pending)', async () => {
  const env = makeEnv({ killSwitch: '{"active":false}' });
  seedOrder(env, { soStatus: 'PAYMENT_PENDING_SUPPLIER', approvals: [1], isTest: 1 });
  const r = await call(env, 'POST', '/api/supplier-orders/1/purchase', { supplier_order_number: 'N1', transaction_confirmation: 'T1' });
  assert.equal(r.status, 409); assert.equal(r.json.error, 'two_approvals_required');
  assert.equal(env._db.prepare('SELECT COUNT(*) n FROM supplier_purchases').get().n, 0);
});

test('kill switch OFF: approval #2 without approval #1 is refused; purchase without evidence refused', async () => {
  const env = makeEnv({ killSwitch: '{"active":false}' });
  seedOrder(env, { soStatus: 'APPROVED', isTest: 1 });
  const r2 = await call(env, 'POST', '/api/approvals', { supplier_order_id: 1, stage: 2, decision: 'APPROVED', approved_by: 'owner' });
  assert.equal(r2.status, 409); assert.equal(r2.json.error, 'stage1_not_approved');
  const p = await call(env, 'POST', '/api/supplier-orders/1/purchase', {});
  assert.equal(p.status, 400);
});

test('central guard: REAL (non-test) orders blocked on approval #1/#2, checkout draft, purchase even with kill switch OFF', async () => {
  const cases = [
    ['PENDING', [], 'POST', '/api/approvals', { supplier_order_id: 1, stage: 1, decision: 'APPROVED', approved_by: 'owner' }, 'approval_1'],
    ['APPROVED', [1], 'POST', '/api/approvals', { supplier_order_id: 1, stage: 2, decision: 'APPROVED', approved_by: 'owner' }, 'approval_2'],
    ['APPROVED', [1], 'POST', '/api/supplier-orders/1/checkout-draft', {}, 'checkout_draft'],
    ['PAYMENT_PENDING_SUPPLIER', [1, 2], 'POST', '/api/supplier-orders/1/purchase', { supplier_order_number: 'N1', transaction_confirmation: 'T1' }, 'purchase'],
  ];
  for (const [soStatus, approvals, method, path, body, action] of cases) {
    const env = makeEnv({ killSwitch: '{"active":false}' });
    seedOrder(env, { soStatus, approvals, isTest: 0 });
    const r = await call(env, method, path, body);
    assert.equal(r.status, 423, `${action} must be blocked`);
    assert.equal(r.json.error, 'sellable_gate_required'); assert.equal(r.json.action, action);
    assert.equal(env._db.prepare('SELECT status FROM supplier_orders WHERE id = 1').get().status, soStatus, 'state unchanged');
    assert.equal(env._db.prepare('SELECT COUNT(*) n FROM supplier_purchases').get().n, 0);
    assert.equal(env._db.prepare('SELECT COUNT(*) n FROM approvals').get().n, approvals.length);
  }
});

test('central guard: unknown action is refused; test orders pass only when kill switch is OFF', async () => {
  const env = makeEnv({ killSwitch: '{"active":false}' });
  assert.equal((await worker.__guardAction(env.DB, env, 'refund', {})).ok, false);
  assert.equal((await worker.__guardAction(env.DB, env, 'purchase', { so: { is_test: 1 } })).ok, true);
  assert.equal((await worker.__guardAction(env.DB, env, 'purchase', { so: { is_test: 0 } })).error, 'sellable_gate_required');
  const envOn = makeEnv({ killSwitch: 'ON' });
  assert.equal((await worker.__guardAction(envOn.DB, envOn, 'purchase', { so: { is_test: 1 } })).error, 'kill_switch_blocked');
});

test('webhook with kill switch ON (or malformed) only queues the order; no procurement', async () => {
  for (const ks of ['ON', 'garbage']) {
    const env = makeEnv({ killSwitch: ks });
    const body = JSON.stringify({ id: 9001, name: '#9001', financial_status: 'paid', line_items: [{ id: 1, variant_id: 555, quantity: 1, price: '100.00', title: 'X' }], customer: {}, shipping_address: {} });
    const hmac = crypto.createHmac('sha256', WEBHOOK_SECRET).update(body).digest('base64');
    const res = await W.fetch(new Request('https://w.test/webhooks/shopify', { method: 'POST', headers: { 'X-Shopify-Hmac-Sha256': hmac, 'X-Shopify-Webhook-Id': `wh-${ks}`, 'X-Shopify-Topic': 'orders/create' }, body }), env, {});
    const j = await res.json();
    assert.equal(res.status, 200);
    assert.match(JSON.stringify(j), /kill_switch/);
    assert.equal(env._db.prepare('SELECT COUNT(*) n FROM supplier_orders').get().n, 0);
  }
});

test('webhook with bad HMAC is rejected', async () => {
  const env = makeEnv();
  const res = await W.fetch(new Request('https://w.test/webhooks/shopify', { method: 'POST', headers: { 'X-Shopify-Hmac-Sha256': 'bad' }, body: '{}' }), env, {});
  assert.equal(res.status, 401);
});

// ---------------- Shopify mutations ----------------
test('Shopify mutation blocked: writes disabled by default, and kill switch must be OFF', async () => {
  fetchCalls.length = 0;
  const env = makeEnv({ killSwitch: '{"active":false}' });
  await assert.rejects(worker.__shopifyGraphQL(env, 'mutation { productUpdate(input:{}) { userErrors { message } } }'), /writes_disabled/);
  const env2 = { ...makeEnv({ killSwitch: '{"active":true}' }), SHOPIFY_WRITES_ENABLED: 'true' };
  await assert.rejects(worker.__shopifyGraphQL(env2, '  mutation X { a }'), /kill_switch_ON/);
  const env3 = { ...makeEnv({ killSwitch: 'broken' }), SHOPIFY_WRITES_ENABLED: 'true' };
  await assert.rejects(worker.__shopifyGraphQL(env3, 'mutation { a }'), /kill_switch_INVALID/);
  assert.equal(fetchCalls.length, 0, 'no network call may happen for a blocked mutation');
});

// ---------------- mint-token removed ----------------
test('POST /api/recovery/mint-token is gone: 410, no token, no call to Shopify OAuth', async () => {
  fetchCalls.length = 0;
  for (const method of ['POST', 'GET']) {
    const r = await call(makeEnv(), method, '/api/recovery/mint-token', method === 'POST' ? {} : undefined);
    assert.equal(r.status, 410);
    assert.ok(!JSON.stringify(r.json).includes('access_token'));
  }
  assert.ok(!fetchCalls.some((u) => u.includes('/admin/oauth/access_token')));
});

test('mint-token without auth is still 401 (auth before routing)', async () => {
  const r = await call(makeEnv(), 'POST', '/api/recovery/mint-token', {}, { auth: false });
  assert.equal(r.status, 401);
});

// ---------------- acknowledge_low_conf removed ----------------
test('discovery approve: confidence < 0.90 refused even when client sends acknowledge_low_conf', async () => {
  const env = makeEnv();
  env._db.exec(`INSERT INTO discovery_candidates (id, shopify_product_id, shopify_variant_id, supplier_code, supplier_variant_id, confidence, status) VALUES (7, 'p', 'v', 'footlocker', 'sv', 0.80, 'NEW')`);
  const r = await call(env, 'POST', '/api/verify/discovery/approve', { id: 7, acknowledge_low_conf: true });
  assert.equal(r.status, 409); assert.equal(r.json.error, 'confidence_below_0_90');
  assert.equal(env._db.prepare("SELECT status FROM discovery_candidates WHERE id=7").get().status, 'NEW');
  assert.equal(env._db.prepare('SELECT COUNT(*) n FROM product_mappings').get().n, 0);
});

test('served /verify page no longer sends acknowledge_low_conf', async () => {
  const res = await W.fetch(new Request('https://w.test/verify'), makeEnv(), {});
  const html = await res.text();
  assert.equal(res.status, 200);
  assert.ok(!html.includes('acknowledge_low_conf'));
});

test('unauthenticated API access is refused', async () => {
  const r = await call(makeEnv(), 'GET', '/api/kill-switch', undefined, { auth: false });
  assert.equal(r.status, 401);
});

// =====================================================================================
// MASTER COMMAND 2 — the 15 required scenarios (numbered as in the command).
// Worker = real patched bundle; core = src/core/actionGuard.js (SELLABLE gate).
// =====================================================================================
const { authorizeAction } = await import('../src/core/actionGuard.js');
const { evaluateProfit } = await import('../src/core/pricing.js');

const PURCHASE_BODY = { supplier_order_number: 'N1', transaction_confirmation: 'T1' };
const ACTION_CALLS = {
  approval_1: ['PENDING', [], '/api/approvals', { supplier_order_id: 1, stage: 1, decision: 'APPROVED', approved_by: 'owner' }],
  approval_2: ['APPROVED', [1], '/api/approvals', { supplier_order_id: 1, stage: 2, decision: 'APPROVED', approved_by: 'owner' }],
  checkout_draft: ['APPROVED', [1], '/api/supplier-orders/1/checkout-draft', {}],
  purchase: ['PAYMENT_PENDING_SUPPLIER', [1, 2], '/api/supplier-orders/1/purchase', PURCHASE_BODY],
};
async function attempt(envOpts, action, isTest = 1) {
  const env = makeEnv(envOpts);
  const [soStatus, approvals, path, body] = ACTION_CALLS[action];
  seedOrder(env, { soStatus, approvals, isTest });
  const r = await call(env, 'POST', path, body);
  return { r, env, soStatus, approvals };
}
function assertUnchanged({ env, soStatus, approvals }) {
  assert.equal(env._db.prepare('SELECT status FROM supplier_orders WHERE id = 1').get().status, soStatus);
  assert.equal(env._db.prepare('SELECT COUNT(*) n FROM approvals').get().n, approvals.length);
  assert.equal(env._db.prepare('SELECT COUNT(*) n FROM supplier_purchases').get().n, 0);
}

for (const [n, action] of [[1, 'approval_1'], [2, 'approval_2'], [3, 'checkout_draft'], [4, 'purchase']]) {
  test(`MC2-${n}: Kill Switch ON + ${action} -> BLOCK (even for a test order in staging)`, async () => {
    const a = await attempt({ killSwitch: '{"active":true}' }, action, 1);
    assert.equal(a.r.status, 423); assert.equal(a.r.json.error, 'kill_switch_blocked');
    assertUnchanged(a);
  });
}

test('MC2-5: Kill Switch ON + Shopify mutation -> BLOCK, no network call', async () => {
  fetchCalls.length = 0;
  const env = { ...makeEnv({ killSwitch: 'ON' }), SHOPIFY_WRITES_ENABLED: 'true' };
  await assert.rejects(worker.__shopifyGraphQL(env, 'mutation { productCreate(input:{title:"x"}) { userErrors { message } } }'), /kill_switch_ON/);
  assert.equal(fetchCalls.length, 0);
});

const NOW = '2026-10-08T10:00:00Z';
function sellableCtx(over = {}) {
  const cost = 319.9, ship = 0, price = 373.89;
  return {
    now: NOW,
    shopify: { productStatus: 'ACTIVE', price, mediaCount: 4, duplicateSku: false },
    supplier: { key: 'footlocker', supported: true, feedOk: true, checkoutVerified: true },
    match: { status: 'MATCHED', cls: 'AUTO_CANDIDATE' },
    live: { fetchedAt: '2026-10-08T09:30:00Z', stock: 'AVAILABLE', cost, currency: 'ILS', verified: true, variantExists: true, urlOk: true },
    shipping: { status: 'VERIFIED', cost: ship, conditionSatisfied: true },
    profit: evaluateProfit({ sellingPrice: price, supplierCost: cost, shippingCost: ship }),
    risk: {}, approval: { mappingApproved: true },
    ...over,
  };
}
const guard = (action, over = {}, extra = {}) => authorizeAction({
  settings: { kill_switch: '{"active":false}' }, action, sellableCtx: sellableCtx(over),
  approvals: { stage1: true, stage2: true }, evidence: { supplierOrderNumber: 'N1', transactionConfirmation: 'T1' }, shopifyWritesEnabled: true, ...extra,
});

test('MC2-6: Kill Switch OFF + non-sellable -> BLOCK (core gate and Worker real order)', async () => {
  const d = guard('PURCHASE', { approval: { mappingApproved: false } });
  assert.equal(d.allowed, false); assert.match(d.reason, /^NOT_SELLABLE:/);
  for (const action of Object.keys(ACTION_CALLS)) {
    const a = await attempt({ killSwitch: '{"active":false}' }, action, 0);
    assert.equal(a.r.status, 423); assert.equal(a.r.json.error, 'sellable_gate_required');
    assertUnchanged(a);
  }
});

test('MC2-7: Kill Switch OFF + sellable + only one approval -> BLOCK', async () => {
  assert.equal(guard('PURCHASE', {}, { approvals: { stage1: true, stage2: false } }).reason, 'TWO_APPROVALS_REQUIRED');
  const env = makeEnv({ killSwitch: '{"active":false}' });
  seedOrder(env, { soStatus: 'PAYMENT_PENDING_SUPPLIER', approvals: [1], isTest: 1 });
  const r = await call(env, 'POST', '/api/supplier-orders/1/purchase', PURCHASE_BODY);
  assert.equal(r.status, 409); assert.equal(r.json.error, 'two_approvals_required');
  assert.equal(env._db.prepare('SELECT COUNT(*) n FROM supplier_purchases').get().n, 0);
});

test('MC2-8: Kill Switch OFF + sellable + two approvals -> ALLOWED in isolated staging only', async () => {
  assert.equal(guard('PURCHASE').allowed, true);
  // staging, non-production store, test order: purchase record is written (simulation; no payment, no network)
  fetchCalls.length = 0;
  const ok = await attempt({ killSwitch: '{"active":false}' }, 'purchase', 1);
  assert.equal(ok.r.status, 200, JSON.stringify(ok.r.json));
  assert.equal(ok.env._db.prepare('SELECT COUNT(*) n FROM supplier_purchases').get().n, 1);
  assert.equal(fetchCalls.length, 0);
  // same request outside staging, or staging pointed at the production store -> BLOCK
  for (const [opts, err] of [
    [{ sportproEnv: 'production' }, 'environment_not_staging'],
    [{ sportproEnv: null }, 'environment_not_staging'],
    [{ shop: 'xayj9j-q9.myshopify.com' }, 'staging_not_isolated'],
    [{ shop: '' }, 'staging_not_isolated'],
  ]) {
    const a = await attempt({ killSwitch: '{"active":false}', ...opts }, 'purchase', 1);
    assert.equal(a.r.status, 423); assert.equal(a.r.json.error, err);
    assertUnchanged(a);
  }
});

test('MC2-9: real (non-test) order -> BLOCKED in the test environment, block is audited', async () => {
  const a = await attempt({ killSwitch: '{"active":false}' }, 'approval_1', 0);
  assert.equal(a.r.json.error, 'sellable_gate_required');
  const row = a.env._db.prepare("SELECT * FROM audit_log WHERE action = 'GUARD_BLOCKED'").get();
  assert.ok(row); assert.equal(row.entity_type, 'approval_1'); assert.match(row.details, /sellable_gate_required/);
});

test('MC2-10: test order -> full flow allowed in staging (approval #1 -> draft -> approval #2 -> purchase record)', async () => {
  fetchCalls.length = 0;
  const env = makeEnv({ killSwitch: '{"active":false}' });
  env._db.exec("UPDATE suppliers SET base_url = 'https://www.footlocker.co.il', checkout_method = 'cart_permalink' WHERE id = 1");
  seedOrder(env, { soStatus: 'PENDING', isTest: 1 });
  env._db.prepare('UPDATE supplier_orders SET items = ?, supplier_total = 319.9, supplier_shipping = 0 WHERE id = 1').run(JSON.stringify([{ title: 'U AUTHENTIC', quantity: 1, supplier_variant_id: '44817809080473', supplier_cost: 319.9 }]));
  const a1 = await call(env, 'POST', '/api/approvals', { supplier_order_id: 1, stage: 1, decision: 'APPROVED', approved_by: 'owner' });
  assert.equal(a1.status, 200, JSON.stringify(a1.json));
  const d = await call(env, 'POST', '/api/supplier-orders/1/checkout-draft', {});
  assert.equal(d.status, 200, JSON.stringify(d.json));
  assert.equal(d.json.test_customer_used, true);
  assert.match(d.json.draft.checkout_url, /^https:\/\/www\.footlocker\.co\.il\/cart\/44817809080473:1/);
  const a2 = await call(env, 'POST', '/api/approvals', { supplier_order_id: 1, stage: 2, decision: 'APPROVED', approved_by: 'owner' });
  assert.equal(a2.status, 200, JSON.stringify(a2.json));
  const p = await call(env, 'POST', '/api/supplier-orders/1/purchase', PURCHASE_BODY);
  assert.equal(p.status, 200, JSON.stringify(p.json));
  assert.equal(env._db.prepare('SELECT status FROM supplier_orders WHERE id = 1').get().status, 'PURCHASED');
  assert.equal(fetchCalls.length, 0, 'no supplier or Shopify call during the simulated flow');
  const audited = env._db.prepare('SELECT action FROM audit_log ORDER BY id').all().map((r) => r.action);
  console.log('# MC2-10 audit trail:', audited.join(' > '));
  assert.ok(audited.includes('CHECKOUT_DRAFT_CREATED'));
  assert.ok(audited.length >= 3, 'every step leaves an audit row');
});

test('MC2-11: missing D1 table -> FAIL CLOSED on every money path', async () => {
  for (const action of Object.keys(ACTION_CALLS)) {
    const env = makeEnv({ withSettingsTable: false });
    const [soStatus, approvals, path, body] = ACTION_CALLS[action];
    seedOrder(env, { soStatus, approvals, isTest: 1 });
    const r = await call(env, 'POST', path, body);
    assert.equal(r.status, 423, action); assert.equal(r.json.kill_switch, 'INVALID');
    assertUnchanged({ env, soStatus, approvals });
  }
  const g = await worker.__guardAction(makeEnv({ withSettingsTable: false }).DB, { SPORTPRO_ENV: 'staging', SHOPIFY_SHOP_DOMAIN: 'x.myshopify.com', SHOPIFY_WRITES_ENABLED: 'true' }, 'shopify_mutation');
  assert.equal(g.ok, false);
});

test('MC2-12: unknown stock -> BLOCK', () => {
  for (const a of ['APPROVAL_1', 'PURCHASE', 'SHOPIFY_MUTATION'])
    assert.equal(guard(a, { live: { ...sellableCtx().live, stock: 'UNKNOWN' } }).reason, 'NOT_SELLABLE:STOCK_BLOCKED:STOCK_UNKNOWN');
});

test('MC2-13: unknown shipping -> BLOCK', () => {
  for (const sh of [{ status: 'UNKNOWN', cost: null }, null, { status: 'CONDITIONAL', cost: null }])
    assert.match(guard('PURCHASE', { shipping: sh }).reason, /^NOT_SELLABLE:SHIPPING_BLOCKED:/);
});

test('MC2-14: negative profit -> BLOCK', () => {
  const profit = evaluateProfit({ sellingPrice: 300, supplierCost: 319.9, shippingCost: 0 });
  assert.ok(profit.net < 0);
  assert.equal(guard('PURCHASE', { profit }).reason, 'NOT_SELLABLE:PROFIT_BLOCKED:PROFIT_BELOW_MIN');
});

test('MC2-15: markup above maximum (35%) -> BLOCK', () => {
  const profit = evaluateProfit({ sellingPrice: 450, supplierCost: 319.9, shippingCost: 0 });
  assert.equal(profit.reason, 'MARKUP_ABOVE_MAX');
  assert.equal(guard('PUBLISH_LISTING', { profit }).reason, 'NOT_SELLABLE:PROFIT_BLOCKED:MARKUP_ABOVE_MAX');
});
