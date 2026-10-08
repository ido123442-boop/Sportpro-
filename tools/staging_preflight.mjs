// Staging deploy preflight (read-only). Refuses any config that could touch production.
// Usage: node tools/staging_preflight.mjs <wrangler.staging.toml>
import fs from 'node:fs';

export const PRODUCTION = Object.freeze({
  shopDomains: ['xayj9j-q9.myshopify.com', 'sportpro.shop', 'www.sportpro.shop'],
  workerNames: ['sportpro-automation'],
  d1Ids: ['b936ce23-c9d7-4ac5-aa59-84040c8c9c2e'],
  legacyStagingD1Ids: ['fa32a45c-60bc-4d1d-9e58-44916ed2d2ca'], // holds production-store data
});

const val = (toml, key) => { const m = toml.match(new RegExp(`^\\s*${key}\\s*=\\s*"([^"]*)"`, 'm')); return m ? m[1] : null; };

export function preflight(toml) {
  const fails = [];
  const env = val(toml, 'SPORTPRO_ENV');
  const shop = (val(toml, 'SHOPIFY_SHOP_DOMAIN') ?? '').toLowerCase();
  const name = val(toml, 'name');
  const d1 = val(toml, 'database_id');
  const writes = val(toml, 'SHOPIFY_WRITES_ENABLED');
  if (env !== 'staging') fails.push('SPORTPRO_ENV_NOT_STAGING');
  if (!shop || shop.includes('<') || !shop.endsWith('.myshopify.com')) fails.push('SHOP_DOMAIN_NOT_SET');
  if (PRODUCTION.shopDomains.includes(shop)) fails.push('SHOP_DOMAIN_IS_PRODUCTION');
  if (!name || PRODUCTION.workerNames.includes(name)) fails.push('WORKER_NAME_IS_PRODUCTION');
  if (!d1 || d1.includes('<')) fails.push('D1_ID_NOT_SET');
  if (PRODUCTION.d1Ids.includes(d1)) fails.push('D1_IS_PRODUCTION');
  if (PRODUCTION.legacyStagingD1Ids.includes(d1)) fails.push('D1_IS_LEGACY_STAGING_WITH_PRODUCTION_DATA');
  if (writes !== 'false') fails.push('SHOPIFY_WRITES_MUST_DEFAULT_FALSE');
  const fps = (val(toml, 'PRODUCTION_CLIENT_ID_SHA256') ?? '').split(',').map((x) => x.trim()).filter(Boolean);
  if (!fps.length || fps.some((x) => !/^[a-f0-9]{64}$/.test(x))) fails.push('PRODUCTION_FINGERPRINT_NOT_SET');
  const crons = toml.match(/^\s*crons\s*=\s*\[([^\]]*)\]/m);
  if (crons && crons[1].trim()) fails.push('CRON_PRESENT');
  if (/\b(shpat|shpss|shpca|cfut)_[A-Za-z0-9]/.test(toml)) fails.push('SECRET_IN_CONFIG');
  return { ok: fails.length === 0, fails };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const r = preflight(fs.readFileSync(process.argv[2], 'utf8'));
  console.log(JSON.stringify(r));
  process.exit(r.ok ? 0 : 1);
}
