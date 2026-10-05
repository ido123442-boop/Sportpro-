// Supplier shipping rules. Every rule carries its evidence. UNKNOWN is never converted to 0.
// Cost is computed for a single-unit supplier order (worst case for thresholds).
export const SHIPPING_STATUS = Object.freeze({ VERIFIED: 'VERIFIED', CONDITIONAL: 'CONDITIONAL', UNKNOWN: 'UNKNOWN', EXCEPTION: 'EXCEPTION' });

const MEGASPORT_APPAREL_FOOTWEAR = /(נעל|כפכפ|סנדל|חולצ|מכנס|טייצ|גופי|ג'קט|גקט|סווטשירט|מעיל|בגדי ים|גרבי|גוזי|שמל|חצאי|בגד|ביגוד)/;

export const SHIPPING_RULES = Object.freeze({
  arosport: { source: 'https://www.arosport.co.il/policies/shipping-policy', checkedAt: '2026-10-04', text: 'דואר שליחים מהיר בעלות 29 ש"ח' },
  dugit: { source: 'https://www.dugit.co.il/policies/shipping-policy', checkedAt: '2026-10-04', text: 'שליח עד הבית בעלות 30 ש"ח ... ללא עלות בהזמנה מעל 250 ש"ח' },
  footlocker: { source: 'https://www.footlocker.co.il/policies/shipping-policy', checkedAt: '2026-10-04', text: 'הזמנות מ-199 ₪ ומעלה חינם; מתחת 14.90 ₪' },
  bashgal: { source: 'https://www.bashgal.co.il/policies/shipping-policy', checkedAt: '2026-10-04', text: 'משלוח עד הבית: 35 ₪ (עד 20 ק"ג בנפח רגיל); חריגים משתנים' },
  energym: { source: 'https://www.energym.co.il/policies/shipping-policy', checkedAt: '2026-10-04', text: 'משלוח עד הבית: 35 ₪ (עד 20 ק"ג בנפח רגיל); חריגים משתנים' },
  megasport: { source: 'https://www.megasport.co.il/ (site banner; policy page empty)', checkedAt: '2026-10-04', text: 'משלוח חינם בקניה מעל 300 ₪ על ביגוד והנעלה; below threshold: not published' },
  bealion: { source: 'https://www.bealion.co.il/ (site banner)', checkedAt: '2026-10-04', text: 'משלוח חינם בקניה מעל 249₪; below threshold: not published' },
});

// All inputs must be SUPPLIER evidence (never the Shopify listing's own product type).
// division: supplier category tag (MegaSport 'DIVISION:APPAREL|footwear|equipment|...').
export function shippingFor(supplier, { unitCost, grams, productType, division } = {}) {
  const r = SHIPPING_RULES[supplier];
  const S = SHIPPING_STATUS;
  const unknown = (rule) => ({ status: S.UNKNOWN, cost: null, rule, source: r?.source ?? null });
  if (!r) return unknown('NO_VERIFIED_POLICY');
  if (!(unitCost > 0)) return unknown('UNIT_COST_UNKNOWN');
  switch (supplier) {
    case 'arosport': return { status: S.VERIFIED, cost: 29, rule: 'FLAT_29', source: r.source };
    case 'dugit': return { status: S.VERIFIED, cost: unitCost > 250 ? 0 : 30, rule: unitCost > 250 ? 'FREE_OVER_250' : 'FLAT_30', source: r.source };
    case 'footlocker': return { status: S.VERIFIED, cost: unitCost >= 199 ? 0 : 14.9, rule: unitCost >= 199 ? 'FREE_FROM_199' : 'FLAT_14_90', source: r.source };
    case 'bashgal':
    case 'energym':
      if (!(grams > 0)) return unknown('WEIGHT_UNKNOWN');
      if (grams > 20000) return { status: S.EXCEPTION, cost: null, rule: 'OVERSIZE_OVER_20KG', source: r.source };
      return { status: S.CONDITIONAL, cost: 35, rule: 'HOME_35_UP_TO_20KG', source: r.source };
    case 'megasport': {
      const div = String(division ?? '').toLowerCase();
      const apparelOrFootwear = div ? (div === 'apparel' || div === 'footwear') : MEGASPORT_APPAREL_FOOTWEAR.test(productType ?? '');
      if (unitCost >= 300 && apparelOrFootwear) return { status: S.CONDITIONAL, cost: 0, rule: 'FREE_OVER_300_APPAREL_FOOTWEAR', source: r.source };
      if (div && !apparelOrFootwear) return unknown('NON_APPAREL_DIVISION_COST_UNPUBLISHED');
      return unknown('BELOW_THRESHOLD_OR_NON_APPAREL_COST_UNPUBLISHED');
    }
    case 'bealion':
      if (unitCost > 249) return { status: S.CONDITIONAL, cost: 0, rule: 'FREE_OVER_249', source: r.source };
      return unknown('BELOW_THRESHOLD_COST_UNPUBLISHED');
    default: return unknown('NO_RULE');
  }
}

// For CONDITIONAL rules the condition was evaluated for a single-unit order (conditionSatisfied=true).
// At order time the condition must be re-evaluated against the actual supplier cart.
export const shippingKnown = (s) => s && (s.status === SHIPPING_STATUS.VERIFIED || s.status === SHIPPING_STATUS.CONDITIONAL) && s.cost !== null;
