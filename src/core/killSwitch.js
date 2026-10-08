// Kill switch parser.
// Same semantics as the patched Worker (worker/patch_worker.py): only explicit OFF allows.
export function parseKillSwitch(raw) {
  if (raw === null || raw === undefined) return { state: 'INVALID', reason: 'missing' };
  const s = typeof raw === 'string' ? raw.trim() : raw;
  if (s === 'ON') return { state: 'ON', reason: 'legacy_string_on' };
  if (s === 'OFF') return { state: 'OFF', reason: 'legacy_string_off' };
  let v = s;
  if (typeof s === 'string') { try { v = JSON.parse(s); } catch { return { state: 'INVALID', reason: 'malformed' }; } }
  if (!v || typeof v !== 'object' || Array.isArray(v) || !('active' in v)) return { state: 'INVALID', reason: 'malformed' };
  if (v.active === true || v.active === 1) return { state: 'ON', reason: 'active' };
  if (v.active === false || v.active === 0) return { state: 'OFF', reason: 'inactive' };
  return { state: 'INVALID', reason: 'ambiguous_active_value' };
}

