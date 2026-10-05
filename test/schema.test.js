import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { DatabaseSync } from 'node:sqlite';

const SQL = fs.readFileSync(new URL('../migrations/0001_supplier_first.sql', import.meta.url), 'utf8');
function db() {
  const d = new DatabaseSync(':memory:');
  d.exec(SQL);
  d.exec(`INSERT INTO supplier_catalog (supplier_id, supplier_name, domain) VALUES ('footlocker','Foot Locker','www.footlocker.co.il');
    INSERT INTO supplier_products (id, supplier_id, supplier_product_id, first_seen_at, last_seen_at, source_hash) VALUES (1,'footlocker','p1','t','t','h');
    INSERT INTO supplier_variants (id, supplier_product_ref, supplier_id, supplier_variant_id, first_seen_at, last_seen_at) VALUES (1,1,'footlocker','v1','t','t'), (2,1,'footlocker','v2','t','t');`);
  return d;
}
const throws = (d, sql, re) => assert.throws(() => d.exec(sql), re);

test('migration applies cleanly and is idempotent', () => { const d = db(); d.exec(SQL); });

test('checkout cannot be marked verified without evidence', () => {
  throws(db(), `UPDATE supplier_catalog SET checkout_verified = 1 WHERE supplier_id='footlocker'`, /CHECK/);
  throws(db(), `UPDATE supplier_catalog SET status = 'CHECKOUT_VERIFIED' WHERE supplier_id='footlocker'`, /CHECK/);
});

test('stock is tri-state only (no quantities)', () => {
  throws(db(), `INSERT INTO supplier_stock (supplier_variant_ref, stock_status, observed_at, source) VALUES (1,'2','t','x')`, /CHECK/);
});

test('shipping VERIFIED requires source + verified_at', () => {
  throws(db(), `INSERT INTO supplier_shipping (supplier_id, rule_json, status) VALUES ('footlocker','{}','VERIFIED')`, /CHECK/);
});

const match = (id, sv, shopify, extra = '') => `INSERT INTO product_matches (id, shopify_variant_id, shopify_product_id, supplier_variant_ref, confidence, match_class, match_method, evidence_json, evidence_hash, created_at${extra ? ',' + extra.split('=')[0] : ''}) VALUES (${id},'${shopify}','sp',${sv},1,'AUTO_CANDIDATE','SKU_EXACT','{}','h','t'${extra ? ",'" + extra.split('=')[1] + "'" : ''})`;
test('one active mapping per Shopify variant (duplicate mapping blocked)', () => {
  const d = db(); d.exec(match(1, 1, 's1'));
  throws(d, match(2, 2, 's1'), /UNIQUE/);
});
test('one approved Shopify listing per supplier variant', () => {
  const d = db();
  d.exec(match(1, 1, 's1')); d.exec(match(2, 1, 's2'));
  d.exec(`UPDATE product_matches SET status='MAPPING_APPROVED', approved_by='owner', approved_at='t' WHERE id=1`);
  throws(d, `UPDATE product_matches SET status='MAPPING_APPROVED', approved_by='owner', approved_at='t' WHERE id=2`, /UNIQUE/);
});
test('MANUAL_REVIEW/REJECT cannot be approved; approval needs approver', () => {
  const d = db(); d.exec(match(1, 1, 's1'));
  d.exec(`UPDATE product_matches SET match_class='MANUAL_REVIEW', confidence=0.8 WHERE id=1`);
  throws(d, `UPDATE product_matches SET status='MAPPING_APPROVED', approved_by='owner', approved_at='t' WHERE id=1`, /CHECK/);
  const e = db(); e.exec(match(1, 1, 's1'));
  throws(e, `UPDATE product_matches SET status='MAPPING_APPROVED' WHERE id=1`, /CHECK/);
});

test('SELLABLE decision requires match, verification run and pricing references', () => {
  throws(db(), `INSERT INTO sellable_decisions (shopify_variant_id, state, inputs_hash, decided_at) VALUES ('s1','SELLABLE','h','t')`, /CHECK/);
  throws(db(), `INSERT INTO sellable_decisions (shopify_variant_id, state, inputs_hash, decided_at) VALUES ('s1','STOCK_BLOCKED','h','t')`, /CHECK/); // reason required
  throws(db(), `INSERT INTO sellable_decisions (shopify_variant_id, state, primary_reason, inputs_hash, decided_at) VALUES ('s1','MAYBE_OK','x','h','t')`, /CHECK/);
});

test('sync queue: decision ids unique (idempotent enqueue); APPLIED requires approval', () => {
  const d = db();
  const ins = `INSERT INTO shopify_sync_queue (decision_id, shopify_product_id, current_state, desired_state, reason, evidence_json, policy, rollback_json, generated_at) VALUES ('d1','p','ACTIVE','DRAFT','r','{}','STRICT','{}','t')`;
  d.exec(ins); throws(d, ins, /UNIQUE/);
  throws(d, `UPDATE shopify_sync_queue SET status='APPLIED' WHERE decision_id='d1'`, /CHECK/);
});

test('SKU proposal cannot be approved with a collision; approval always required', () => {
  const d = db();
  d.exec(`INSERT INTO sku_proposals (id, shopify_variant_id, proposed_sku, supplier_id, supplier_variant_id, confidence, evidence_json, collision_status) VALUES (1,'s1','X','footlocker','v1',1,'{}','COLLIDES_WITH_EXISTING_SHOPIFY_SKU')`);
  throws(d, `UPDATE sku_proposals SET status='APPROVED' WHERE id=1`, /CHECK/);
  throws(d, `UPDATE sku_proposals SET approval_required=0 WHERE id=1`, /CHECK/);
});

test('supplier order: duplicate idempotency key blocked; PURCHASED needs evidence + stage-2 approval', () => {
  const d = db();
  d.exec(`INSERT INTO orders (id, shopify_order_id, financial_status, hmac_verified, state, received_at, payload_hash) VALUES (1,'o1','PAID',1,'RECEIVED','t','h')`);
  const so = `INSERT INTO supplier_orders (order_ref, supplier_id, idempotency_key, state) VALUES (1,'footlocker','o1:l1','AWAITING_APPROVAL')`;
  d.exec(so); throws(d, so, /UNIQUE/);
  throws(d, `INSERT INTO orders (shopify_order_id, financial_status, hmac_verified, state, received_at, payload_hash) VALUES ('o1','PAID',1,'RECEIVED','t','h')`, /UNIQUE/);
  throws(d, `UPDATE supplier_orders SET state='PURCHASED' WHERE idempotency_key='o1:l1'`, /CHECK/);
  throws(d, `UPDATE supplier_orders SET stage2_approved_by='owner' WHERE idempotency_key='o1:l1'`, /CHECK/); // stage 2 before stage 1
  d.exec(`UPDATE supplier_orders SET stage1_approved_by='owner', stage2_approved_by='owner', supplier_order_number='N', transaction_confirmation='T', purchased_at='t', state='PURCHASED' WHERE idempotency_key='o1:l1'`);
});

test('append-only: audit log and supplier history cannot be rewritten; supplier knowledge never deleted', () => {
  const d = db();
  d.exec(`INSERT INTO audit_log (at, actor, action, entity, entity_id) VALUES ('t','owner','X','e','1')`);
  throws(d, `UPDATE audit_log SET actor='x'`, /append-only/);
  throws(d, `DELETE FROM audit_log`, /append-only/);
  throws(d, `DELETE FROM supplier_variants WHERE id=1`, /never deleted/);
  throws(d, `DELETE FROM supplier_products WHERE id=1`, /never deleted/);
  d.exec(`UPDATE supplier_variants SET status='REMOVED' WHERE id=1`);
});
