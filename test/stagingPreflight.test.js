import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { preflight } from '../tools/staging_preflight.mjs';

const tpl = fs.readFileSync(new URL('../worker/wrangler.staging.toml.example', import.meta.url), 'utf8');
const filled = tpl.replace('<DEV_STORE_HANDLE>', 'sportpro-dev').replace('<NEW_STAGING_D1_ID>', '11111111-2222-3333-4444-555555555555').replace('<SHA256_OF_PRODUCTION_CLIENT_ID>', 'a'.repeat(64));

test('template as shipped fails (placeholders), filled template passes', () => {
  assert.equal(preflight(tpl).ok, false);
  assert.deepEqual(preflight(filled), { ok: true, fails: [] });
});

test('any production linkage fails the preflight', () => {
  const cases = [
    [filled.replace('sportpro-dev.myshopify.com', 'xayj9j-q9.myshopify.com'), 'SHOP_DOMAIN_IS_PRODUCTION'],
    [filled.replace('11111111-2222-3333-4444-555555555555', 'b936ce23-c9d7-4ac5-aa59-84040c8c9c2e'), 'D1_IS_PRODUCTION'],
    [filled.replace('11111111-2222-3333-4444-555555555555', 'fa32a45c-60bc-4d1d-9e58-44916ed2d2ca'), 'D1_IS_LEGACY_STAGING_WITH_PRODUCTION_DATA'],
    [filled.replace('name = "sportpro-automation-staging-iso"', 'name = "sportpro-automation"'), 'WORKER_NAME_IS_PRODUCTION'],
    [filled.replace('SPORTPRO_ENV = "staging"', 'SPORTPRO_ENV = "production"'), 'SPORTPRO_ENV_NOT_STAGING'],
    [filled.replace('SHOPIFY_WRITES_ENABLED = "false"', 'SHOPIFY_WRITES_ENABLED = "true"'), 'SHOPIFY_WRITES_MUST_DEFAULT_FALSE'],
    [filled.replace('crons = []', 'crons = ["*/5 * * * *"]'), 'CRON_PRESENT'],
    [filled.replace('a'.repeat(64), 'not-a-hash'), 'PRODUCTION_FINGERPRINT_NOT_SET'],
  ];
  for (const [toml, fail] of cases) assert.ok(preflight(toml).fails.includes(fail), fail);
});
