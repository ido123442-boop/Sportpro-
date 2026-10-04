// Deterministic text / size / option normalization. Pure functions.
const BIDI = /[‎‏‪-‮⁦-⁩؜﻿]/g;
const UNICODE_FRACTIONS = { '⅓': ' 1/3', '⅔': ' 2/3', '½': ' 1/2', '¼': ' 1/4', '¾': ' 3/4' };

export function normText(s) {
  return String(s ?? '')
    .normalize('NFKC')
    .replace(BIDI, '')
    .toLowerCase()
    .replace(/["'`״׳]/g, '')
    .replace(/[^\p{L}\p{N}.]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export const normKey = (s) => normText(s).replace(/[\s.]/g, '');

export function normSku(s) {
  const v = String(s ?? '').normalize('NFKC').replace(BIDI, '').trim().toUpperCase();
  return v || null;
}

// "41 1/3" -> "41.33", "41⅔" -> "41.67", "EU 42" -> "42", "42.0" -> "42", " xl " -> "XL"
export function normSize(s) {
  // expand unicode fractions before NFKC (NFKC turns '41⅔' into '412⁄3')
  let v = String(s ?? '').replace(/[⅓⅔½¼¾]/g, (c) => UNICODE_FRACTIONS[c]).normalize('NFKC').replace(BIDI, '').trim();
  if (!v) return '';
  v = v.replace(/^(eu|us|uk|מידה)\s*/i, '');
  const frac = v.match(/^(\d+)\s+(\d)\s*\/\s*(\d)$/);
  if (frac) {
    const f = Number(frac[2]) / Number(frac[3]);
    return (Number(frac[1]) + f).toFixed(2).replace(/\.?0+$/, '');
  }
  if (/^\d+(\.\d+)?$/.test(v)) return String(Number(v));
  return normKey(v).toUpperCase();
}

const IGNORED_OPTION_VALUES = new Set(['defaulttitle', 'default', '']);

// Normalized, order-independent signature of a variant's option values.
export function optionSignature(values) {
  const out = [];
  for (const raw of values ?? []) {
    const k = normKey(raw);
    if (IGNORED_OPTION_VALUES.has(k)) continue;
    out.push(normSize(raw));
  }
  return out.sort().join('|');
}
