// Shared fixtures: a fully SELLABLE pilot variant (U AUTHENTIC / 35, Foot Locker) on an isolated staging target.
import crypto from 'node:crypto';
export const NOW = '2026-10-08T10:00:00Z';
export const PROD_CLIENT_FP = crypto.createHash('sha256').update('production-client-id').digest('hex');
export const STAGING_CLIENT_FP = crypto.createHash('sha256').update('staging-client-id').digest('hex');

export const stagingTarget = (over = {}) => ({
  environment: 'staging', shopDomain: 'sportpro-dev.myshopify.com', shopId: 'gid://shopify/Shop/1',
  clientIdSha256: STAGING_CLIENT_FP, productionFingerprints: [PROD_CLIENT_FP], ...over,
});

export const sellableInput = (over = {}) => ({
  now: NOW,
  killSwitch: '{"active":false}',
  supplier: { code: 'footlocker', verified: true },
  mapping: { shopifySku: 'VEE3BKA040', supplierSku: 'VEE3BKA040', shopifySize: '35', supplierSize: '35', variantVerified: true, confidence: 1, duplicate: false },
  live: { price: 319.9, currency: 'ILS', stock: 'AVAILABLE', checkedAt: '2026-10-08T09:30:00Z', variantExists: true },
  shipping: { status: 'VERIFIED', cost: 0, conditionSatisfied: true },
  pricing: { sellingPrice: 373.9 },
  risk: { pass: true },
  blocks: [],
  ...over,
});
