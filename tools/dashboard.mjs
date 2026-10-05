// Builds a static, self-contained dashboard page from <outDir>/dashboard_data.json.
// Usage: node tools/dashboard.mjs <outDir> <out.html>
import fs from 'node:fs';
import path from 'node:path';

const [outDir, htmlFile] = process.argv.slice(2);
const data = JSON.parse(fs.readFileSync(path.join(outDir, 'dashboard_data.json'), 'utf8'));
const json = JSON.stringify(data).replace(/</g, '\\u003c');

const html = `<title>Sportpro Sellable Catalog</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Hebrew:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap">
<style>
/* Layout: operations console. Gate funnel first (summary), then the five owner work lists as tabs, then supplier health. RTL. */
:root {
  --bg: #f4f6f8; --surface: #ffffff; --ink: #14202b; --muted: #5b6875; --line: #dbe1e7;
  --accent: #1f5fa8; --accent-soft: #e3edf8;
  --ok: #1d7a4e; --ok-soft: #e1f2e9; --warn: #9a6200; --warn-soft: #fbf0d9; --bad: #b3261e; --bad-soft: #fae4e2;
  --font-ui: "IBM Plex Sans Hebrew", "Segoe UI", Arial, sans-serif;
  --font-num: "IBM Plex Mono", ui-monospace, "SFMono-Regular", Menlo, monospace;
  --r: 8px;
}
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) {
  --bg: #0f151b; --surface: #17202a; --ink: #e6ecf2; --muted: #96a3b0; --line: #2a3643;
  --accent: #7fb2ec; --accent-soft: #1b2d42; --ok: #6fcf9c; --ok-soft: #15301f; --warn: #e6b75c; --warn-soft: #33270f; --bad: #f08a80; --bad-soft: #3a1a18; color-scheme: dark } }
:root[data-theme="dark"] {
  --bg: #0f151b; --surface: #17202a; --ink: #e6ecf2; --muted: #96a3b0; --line: #2a3643;
  --accent: #7fb2ec; --accent-soft: #1b2d42; --ok: #6fcf9c; --ok-soft: #15301f; --warn: #e6b75c; --warn-soft: #33270f; --bad: #f08a80; --bad-soft: #3a1a18; color-scheme: dark }
* { box-sizing: border-box }
body { background: var(--bg); color: var(--ink); font-family: var(--font-ui); font-size: 14px; line-height: 1.5 }
.wrap { max-width: 1240px; margin: 0 auto; padding-inline: 16px; padding-block: 24px 48px; display: grid; gap: 28px }
header { display: flex; flex-wrap: wrap; gap: 8px 24px; align-items: baseline; justify-content: space-between }
h1 { font-size: 1.6rem; margin: 0; font-weight: 700; text-wrap: balance }
h2 { font-size: 1.05rem; margin: 0 0 10px; font-weight: 600 }
.meta { color: var(--muted); font-size: .85rem }
.num { font-family: var(--font-num); font-variant-numeric: tabular-nums }
.banner { background: var(--bad-soft); color: var(--ink); border-inline-start: 4px solid var(--bad); padding: 12px 14px; border-radius: var(--r); display: grid; gap: 4px }
.banner b { color: var(--bad) }
.funnel { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 10px }
.tile { background: var(--surface); border: 1px solid var(--line); border-radius: var(--r); padding: 12px 14px; display: grid; gap: 2px; min-width: 0 }
.tile .v { font-family: var(--font-num); font-size: 1.5rem; font-weight: 500 }
.tile .k { color: var(--muted); font-size: .8rem; letter-spacing: .02em }
.tile.good .v { color: var(--ok) } .tile.bad .v { color: var(--bad) } .tile.warn .v { color: var(--warn) }
.groups { display: grid; gap: 6px }
.gbar { display: grid; grid-template-columns: 210px 1fr 90px; gap: 10px; align-items: center }
.gbar .track { background: var(--accent-soft); border-radius: 4px; height: 12px; overflow: hidden }
.gbar .fill { background: var(--accent); height: 100% }
.gbar .fill.a { background: var(--ok) } .gbar .fill.b { background: var(--ok); opacity: .55 }
@media (max-width: 640px) { .gbar { grid-template-columns: 1fr 70px } .gbar .track { grid-column: 1 / -1; grid-row: 2 } }
.tabs { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 10px }
.tabs button { font: inherit; border: 1px solid var(--line); background: var(--surface); color: var(--ink); padding: 6px 12px; border-radius: 999px; cursor: pointer }
.tabs button[aria-selected="true"] { background: var(--accent); color: var(--surface); border-color: var(--accent) }
.tabs button:focus-visible, a:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px }
.note { color: var(--muted); font-size: .85rem; margin: 0 0 8px }
.tablebox { overflow-x: auto; background: var(--surface); border: 1px solid var(--line); border-radius: var(--r) }
table { border-collapse: collapse; width: 100%; min-width: 900px }
th, td { text-align: start; padding: 7px 10px; border-bottom: 1px solid var(--line); vertical-align: top }
th { font-size: .75rem; color: var(--muted); font-weight: 600; letter-spacing: .03em; position: sticky; top: 0; background: var(--surface) }
td.t { max-width: 340px }
.chip { display: inline-block; padding: 1px 8px; border-radius: 999px; font-size: .75rem; white-space: nowrap }
.chip.ok { background: var(--ok-soft); color: var(--ok) } .chip.warn { background: var(--warn-soft); color: var(--warn) } .chip.bad { background: var(--bad-soft); color: var(--bad) } .chip.info { background: var(--accent-soft); color: var(--accent) }
a { color: var(--accent) }
.why { font-size: .8rem; color: var(--muted) }
</style>
<div class="wrap" dir="rtl" lang="he">
  <header>
    <h1>Sportpro — קטלוג מוכן למכירה</h1>
    <div class="meta">נוצר <span class="num" id="gen"></span> · מדיניות תמחור <span class="num" id="pol"></span> · קריאה בלבד, אין כתיבה ל-Shopify</div>
  </header>
  <div class="banner" id="banner"></div>
  <section><h2>משפך השערים</h2><div class="funnel" id="tiles"></div></section>
  <section><h2>כל 20,665 הווריאנטים לפי קבוצה (A–I)</h2><div class="groups" id="groups"></div></section>
  <section>
    <h2>רשימות עבודה</h2>
    <div class="tabs" role="tablist" id="tabs"></div>
    <p class="note" id="tabnote"></p>
    <div class="tablebox"><table id="list"></table></div>
  </section>
  <section><h2>בריאות ספקים</h2><div class="tablebox"><table id="sup"></table></div></section>
  <section><h2>סיבות חסימה עיקריות</h2><div class="tablebox"><table id="reasons"></table></div></section>
</div>
<script>
const D = ${json};
const $ = (id) => document.getElementById(id);
const fmt = (n) => (typeof n === 'number' ? n.toLocaleString('he-IL') : n ?? '');
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
$('gen').textContent = D.generated_at.slice(0, 16).replace('T', ' ') + ' UTC';
$('pol').textContent = D.pricing_policy;
const T = D.tiles, P = D.purchasable_now;
$('banner').innerHTML = '<div><b>' + fmt(T.sellable) + ' וריאנטים מוכנים למכירה.</b> אף ספק עדיין לא עבר checkout מאומת, ולכן אין SELLABLE.</div>'
  + '<div>כרגע בחנות: <span class="num">' + fmt(P.variants) + '</span> וריאנטים ניתנים לקנייה, מהם <span class="num">' + fmt(P.unavailable_at_supplier) + '</span> לא זמינים אצל הספק ו-<span class="num">' + fmt(P.loss_making) + '</span> מתומחרים בהפסד.</div>';
const tiles = [
  ['total_discovered', 'וריאנטים שנסרקו אצל ספקים', ''], ['matched', 'מותאמים (AUTO/HIGH)', ''], ['live_verified', 'אומתו חי', ''],
  ['after_fix', 'B — מוכן אחרי תיקון', 'good'], ['sellable', 'SELLABLE', 'good'], ['blocked', 'חסומים', 'bad'],
  ['needs_match', 'C — צריך התאמה', 'warn'], ['no_stock', 'D — אין מלאי', 'warn'], ['no_shipping', 'E — משלוח לא ידוע', 'warn'],
  ['profit_blocked', 'F — רווח חסום', 'bad'], ['no_supplier', 'G — אין ספק', 'bad'], ['data_quality', 'H — איכות נתונים', 'warn'], ['stale', 'I — לא ידוע / ישן', 'warn'],
];
$('tiles').innerHTML = tiles.map(([k, l, c]) => '<div class="tile ' + c + '"><span class="v">' + fmt(T[k]) + '</span><span class="k">' + l + '</span></div>').join('');
const G = { A_VERIFIED_SELLABLE: 'A מוכן למכירה (מאומת)', B_SELLABLE_AFTER_FIX: 'B מוכן אחרי תיקון', C_NEEDS_MATCH: 'C צריך התאמה', D_NEEDS_STOCK: 'D צריך מלאי', E_NEEDS_SHIPPING: 'E צריך משלוח', F_PROFIT_BLOCKED: 'F רווח חסום', G_NO_SUPPLIER: 'G אין ספק', H_DATA_QUALITY: 'H איכות נתונים', I_UNKNOWN: 'I לא ידוע' };
const tot = Object.values(D.groups).reduce((a, b) => a + b, 0);
$('groups').innerHTML = Object.keys(G).map((g) => { const n = D.groups[g] ?? 0; const cls = g[0] === 'A' ? 'a' : g[0] === 'B' ? 'b' : '';
  return '<div class="gbar"><span>' + G[g] + '</span><div class="track"><div class="fill ' + cls + '" style="width:' + (100 * n / tot).toFixed(2) + '%"></div></div><span class="num">' + fmt(n) + '</span></div>'; }).join('');

const pubCols = [['title', 'מוצר'], ['supplier', 'ספק'], ['shopify_status', 'סטטוס'], ['eligible_variants', 'וריאנטים מוכנים'], ['best_net', 'רווח נטו מרבי ₪'], ['avg_margin_pct', 'מרווח %'], ['min_confidence', 'ביטחון'], ['still_missing', 'מה חסר'], ['evidence_url', 'ראיה']];
const tabs = {
  publish: { label: 'לפרסום', note: 'מוצרים שעברו את כל השערים הדטרמיניסטיים ואומתו חי. ממוינים לפי מוכנות: הכי מעט צעדים חסרים קודם. אף אחד עוד לא מוכן לפרסום לפני פיילוט checkout.', rows: D.top_publish, cols: pubCols },
  profit: { label: 'לפי רווח', note: 'אותם מועמדים, ממוינים לפי הרווח הנטו לווריאנט.', rows: D.top_profit, cols: pubCols },
  confidence: { label: 'לפי ביטחון', note: 'אותם מועמדים, ממוינים לפי ביטחון ההתאמה הנמוך ביותר במוצר.', rows: D.top_confidence, cols: pubCols },
  fix: { label: 'לתיקון', note: 'התיקונים הקלים ביותר: מאמץ 1 = פעולה אחת של הבעלים, 3 = בנייה מחדש של וריאנטים. רק מוצרים שהספק מחזיק אותם במלאי.', rows: D.top_fix,
    cols: [['title', 'מוצר'], ['supplier', 'ספק'], ['shopify_status', 'סטטוס'], ['effort', 'מאמץ'], ['fix_types', 'תיקון'], ['variants_unlocked', 'וריאנטים'], ['expected_net_after_fix', 'רווח צפוי ₪'], ['why_blocked', 'למה חסום'], ['evidence_url', 'ראיה']] },
  opp: { label: 'הזדמנויות ספק', note: 'מוצרי ספק שזמינים, עם משלוח ידוע ותמחור אפשרי תחת תקרת 35%, ושלא קיימים בחנות. ביקוש: לא ידוע.', rows: D.top_opportunities,
    cols: [['title', 'מוצר'], ['supplier', 'ספק'], ['brand', 'מותג'], ['available_variants', 'וריאנטים זמינים'], ['supplier_cost_max', 'עלות ₪'], ['shipping_cost', 'משלוח ₪'], ['suggested_min_price', 'מחיר מינימלי ₪'], ['implied_markup_pct', 'markup %'], ['url', 'ראיה']] },
};
const statusChip = (s) => '<span class="chip ' + (s === 'ACTIVE' ? 'ok' : s === 'DRAFT' ? 'info' : 'warn') + '">' + esc(s) + '</span>';
function cell(k, v) {
  if (k === 'evidence_url' || k === 'url') return v ? '<a href="' + esc(v) + '" target="_blank" rel="noopener">ספק ↗</a>' : '';
  if (k === 'shopify_status') return statusChip(v);
  if (k === 'title') return '<td class="t">' + esc(v) + '</td>';
  if (k === 'still_missing' || k === 'why_blocked') return '<span class="why">' + esc(v) + '</span>';
  if (k === 'effort') return '<span class="chip ' + (v === 1 ? 'ok' : v === 2 ? 'warn' : 'bad') + '">' + v + '</span>';
  if (typeof v === 'number') return '<span class="num">' + fmt(v) + '</span>';
  return esc(v);
}
function show(key) {
  const t = tabs[key];
  for (const b of document.querySelectorAll('.tabs button')) b.setAttribute('aria-selected', String(b.dataset.k === key));
  $('tabnote').textContent = t.note + ' (' + t.rows.length + ' שורות)';
  $('list').innerHTML = '<thead><tr>' + t.cols.map(([, l]) => '<th>' + l + '</th>').join('') + '</tr></thead><tbody>'
    + (t.rows.length ? t.rows.map((r) => '<tr>' + t.cols.map(([k]) => { const c = cell(k, r[k]); return c.startsWith('<td') ? c : '<td>' + c + '</td>'; }).join('') + '</tr>').join('') : '<tr><td colspan="9">אין שורות</td></tr>') + '</tbody>';
  try { localStorage.setItem('sp-tab', key); } catch (e) {}
}
$('tabs').innerHTML = Object.entries(tabs).map(([k, t]) => '<button role="tab" id="tab-' + k + '" data-k="' + k + '">' + t.label + '</button>').join('');
for (const b of document.querySelectorAll('.tabs button')) b.addEventListener('click', () => show(b.dataset.k));
let start = 'publish'; try { start = localStorage.getItem('sp-tab') || 'publish'; } catch (e) {}
show(tabs[start] ? start : 'publish');

$('sup').innerHTML = '<thead><tr><th>ספק</th><th>מתועד</th><th>סטטוס</th><th>משלוח</th><th>וריאנטים בקטלוג</th><th>זמינים</th><th>וריאנטים בחנות</th><th>AUTO</th><th>HIGH</th><th>כיסוי מיפוי %</th><th>מועמדים מאומתים</th><th>רווח חציוני ₪</th></tr></thead><tbody>'
  + D.suppliers.map((s) => '<tr><td>' + esc(s.supplier_name) + '</td><td>' + (s.documented ? 'כן' : '<span class="chip warn">לא</span>') + '</td><td>' + esc(s.status) + '</td><td><span class="chip ' + (s.shipping_status === 'VERIFIED' ? 'ok' : s.shipping_status === 'CONDITIONAL' ? 'warn' : 'bad') + '">' + esc(s.shipping_status) + '</span></td>'
  + ['catalog_variants', 'available', 'shopify_variants_tagged', 'matched_auto', 'matched_high', 'mapping_coverage_pct', 'live_verified_candidates', 'median_candidate_net'].map((k) => '<td class="num">' + fmt(s[k]) + '</td>').join('') + '</tr>').join('') + '</tbody>';
$('reasons').innerHTML = '<thead><tr><th>מצב : סיבה</th><th>וריאנטים</th></tr></thead><tbody>' + D.reasons.map(([k, n]) => '<tr><td>' + esc(k) + '</td><td class="num">' + fmt(n) + '</td></tr>').join('') + '</tbody>';
</script>
`;
fs.writeFileSync(htmlFile, html);
console.log(`wrote ${htmlFile} (${(html.length / 1024).toFixed(0)} KB)`);
