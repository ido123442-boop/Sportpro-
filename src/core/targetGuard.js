// Production protection: SHOP + ENVIRONMENT + CREDENTIALS must match before ANY write.
//   STAGING    + DEV SHOP        = ALLOW (if credentials are provably not production)
//   STAGING    + PRODUCTION SHOP = BLOCK
//   PRODUCTION + DEV SHOP        = BLOCK
//   PRODUCTION + PRODUCTION SHOP = BLOCK until an explicit production approval/deploy policy exists
// Same logic is inlined in the Worker (worker/patch_worker.py: assertNonProductionTarget); a parity
// test runs both over the same matrix.

export const PRODUCTION_TARGET = Object.freeze({
  shopDomains: Object.freeze(['xayj9j-q9.myshopify.com', 'sportpro.shop', 'www.sportpro.shop']),
  shopIds: Object.freeze(['99554459955', 'gid://shopify/Shop/99554459955']),
});

const norm = (s) => String(s ?? '').trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');

/*
 t = {
   environment: 'staging' | 'production' | anything,
   shopDomain, shopId (optional),
   clientIdSha256: hex sha256 of the Shopify client id in use (optional but required for staging),
   productionFingerprints: [hex sha256 of production client ids]  (must be configured in staging),
   productionApproved: boolean (no code path sets this today)
 }
*/
export function checkTarget(t = {}) {
  const deny = (reason) => ({ allowed: false, reason });
  const env = String(t.environment ?? '');
  const shop = norm(t.shopDomain);
  const id = String(t.shopId ?? '').trim();
  const isProdShop = PRODUCTION_TARGET.shopDomains.includes(shop) || (id && PRODUCTION_TARGET.shopIds.includes(id));
  if (!shop) return deny('SHOP_UNKNOWN');
  if (env === 'staging') {
    if (isProdShop) return deny('STAGING_TARGETS_PRODUCTION_SHOP');
    if (!shop.endsWith('.myshopify.com')) return deny('SHOP_DOMAIN_NOT_MYSHOPIFY');
    const fps = (t.productionFingerprints ?? []).map((x) => String(x).trim().toLowerCase()).filter(Boolean);
    if (!fps.length) return deny('PRODUCTION_FINGERPRINTS_UNSET');
    const cid = String(t.clientIdSha256 ?? '').trim().toLowerCase();
    if (!cid) return deny('CLIENT_ID_UNKNOWN');
    if (fps.includes(cid)) return deny('STAGING_USES_PRODUCTION_CREDENTIALS');
    return { allowed: true, reason: null };
  }
  if (env === 'production') {
    if (!isProdShop) return deny('PRODUCTION_ENV_TARGETS_NON_PRODUCTION_SHOP');
    if (t.productionApproved !== true) return deny('PRODUCTION_WRITES_NOT_APPROVED');
    return { allowed: true, reason: null };
  }
  return deny('ENVIRONMENT_UNKNOWN');
}

export function assertNonProductionTarget(t) {
  const r = checkTarget(t);
  if (!r.allowed) throw new Error(`target_blocked:${r.reason}`);
  if (t.environment !== 'staging') throw new Error('target_blocked:NOT_STAGING');
  return true;
}
