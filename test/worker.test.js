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

function makeEnv({ killSwitch = '{"active":true}', withSettingsTable = true } = {}) {
  const db = new DatabaseSync(':memory:');
  db.exec(SCHEMA);
  if (!withSettingsTable) db.exec('DROP TABLE system_settings');
  else if (killSwitch !== null) db.prepare("INSERT INTO system_settings (key, value) VALUES ('kill_switch', ?)").run(killSwitch);
  db.exec(`INSERT INTO suppliers (id, code, name, platform, status) VALUES (1, 'footlocker', 'Foot Locker', 'shopify', 'ACTIVE')`);
  const locks = new Map();
  return {
    DB: d1(db), _db: db,
    ADMIN_TOKEN: ADMIN, WEBHOOK_SECRET, SHOPIFY_SHOP_DOMAIN: 'example.myshopify.com', SHOPIFY_CLIENT_ID: 'x', SHOPIFY_CLIENT_SECRET: 'y',
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

function seedOrder(env, { soStatus = 'PENDING', approvals = [] } = {}) {
  const db = env._db;
  db.exec(`INSERT INTO orders (id, shopify_order_id, financial_status, status) VALUES (1, 'S1', 'paid', 'READY_FOR_APPROVAL')`);
  db.prepare(`INSERT INTO supplier_orders (id, order_id, supplier_id, status, items) VALUES (1, 1, 1, ?, ?)`).run(soStatus, JSON.stringify([{ sku: 'X', qty: 1 }]));
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
  seedOrder(env, { soStatus: 'PAYMENT_PENDING_SUPPLIER', approvals: [1] });
  const r = await call(env, 'POST', '/api/supplier-orders/1/purchase', { supplier_order_number: 'N1', transaction_confirmation: 'T1' });
  assert.equal(r.status, 409); assert.equal(r.json.error, 'two_approvals_required');
  assert.equal(env._db.prepare('SELECT COUNT(*) n FROM supplier_purchases').get().n, 0);
});

test('kill switch OFF: approval #2 without approval #1 is refused; purchase without evidence refused', async () => {
  const env = makeEnv({ killSwitch: '{"active":false}' });
  seedOrder(env, { soStatus: 'APPROVED' });
  const r2 = await call(env, 'POST', '/api/approvals', { supplier_order_id: 1, stage: 2, decision: 'APPROVED', approved_by: 'owner' });
  assert.equal(r2.status, 409);
  const p = await call(env, 'POST', '/api/supplier-orders/1/purchase', {});
  assert.equal(p.status, 400);
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
