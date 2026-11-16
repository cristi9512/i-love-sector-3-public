// Monthly report: the whole sector for one month, compared with the month before.
// Tables rather than charts, so it reads well when shared, printed or copied.
import { t, locale, duration } from './i18n.js';
import { esc, fmtN, catLabel, toast } from './app.js';
import { isParking } from './outcomes.js';

const pct = (n, d) => (d ? Math.round((n / d) * 100) : 0);
const median = (v) => { if (!v.length) return null; const s = v.slice().sort((a, b) => a - b), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const monthName = (m) => new Intl.DateTimeFormat(locale(), { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(m + '-15T12:00:00Z'));
const MIN_N = 20;

function stats(list) {
  const s = { n: list.length, good: 0, bad: 0, open: 0, overdue: 0, ttc: [] };
  for (const it of list) {
    if (it.status === 'good' || it.status === 'partial') s.good++;
    else if (it.status === 'bad') s.bad++;
    else if (it.status === 'open') s.open++;
    if (it.overdue) s.overdue++;
    if (it.closedAt) s.ttc.push(it.closedAt - it.created);
  }
  s.gp = pct(s.good, s.n); s.bp = pct(s.bad, s.n); s.med = median(s.ttc);
  return s;
}
function change(cur, prev) {
  if (prev == null || !prev) return '';
  const d = Math.round(((cur - prev) / prev) * 100);
  return `${d > 0 ? '▲' : d < 0 ? '▼' : '='} ${Math.abs(d)}%`;
}
function groupBy(list, key) {
  const m = new Map();
  for (const it of list) { const k = key(it); if (k == null) continue; if (!m.has(k)) m.set(k, []); m.get(k).push(it); }
  return m;
}
const table = (head, rows, cls = '') => `<div class="table-wrap report-table ${cls}"><table>
  <thead><tr>${head.map((h, i) => `<th${i ? ' class="num"' : ''}>${esc(h)}</th>`).join('')}</tr></thead>
  <tbody>${rows.join('')}</tbody></table></div>`;
const section = (title, body, extra = '') => `<section class="viz-card ${extra}"><h2>${esc(title)}</h2>${body}</section>`;

export function render(root, ctx) {
  const { items, month, months, hasPrev, prevMonth, current, meta } = ctx;
  const inMonth = (m) => [...items.values()].filter((it) => !it.removed && it.day.slice(0, 7) === m);
  const cur = inMonth(month), prev = hasPrev ? inMonth(prevMonth) : [];
  const tools = `<div class="report-tools">
      <label>${esc(t('rMonth'))} <select id="reportMonth" class="select">${months.slice().reverse().map((m) => `<option value="${m}"${m === month ? ' selected' : ''}>${esc(monthName(m))}</option>`).join('')}</select></label>
      <button class="btn btn-outline small" data-r="copy">${esc(t('rCopy'))}</button>
      <button class="btn btn-outline small" data-r="print">${esc(t('rPrint'))}</button>
    </div>`;
  const head = `<div class="viz-head report-head"><h1>${esc(t('rTitle'))} · ${esc(monthName(month))}</h1>${tools}</div>`;
  if (ctx.loading && !cur.length) {
    root.innerHTML = `${head}<p class="fine">${esc(t('rLoading'))}</p><div class="viz-grid"><div class="skeleton tall"></div><div class="skeleton tall"></div></div>`;
    bind(root, ctx);
    return;
  }

  const a = stats(cur), b = hasPrev ? stats(prev) : null;
  const civ = cur.filter((it) => !isParking(it.catId)), par = cur.filter((it) => isParking(it.catId));
  const ac = stats(civ), ap = stats(par);
  const bc = b ? stats(prev.filter((it) => !isParking(it.catId))) : null;

  // notes about completeness
  const notes = [t('rNote')];
  if (month === current) notes.push(t('rPartial'));
  if (meta?.coverageFrom && meta.coverageFrom.slice(0, 7) === month && meta.coverageFrom.slice(8) !== '01') notes.push(t('rFirst', { d: new Intl.DateTimeFormat(locale(), { dateStyle: 'long', timeZone: 'UTC' }).format(new Date(meta.coverageFrom + 'T12:00:00Z')) }));
  if (!hasPrev) notes.push(t('rNoPrev'));

  const d = b ? t('rVsPrev', { d: change(a.n, b.n), m: monthName(prevMonth) }) : '';
  const lead = `<p class="report-lead">${esc(t('rLead', { m: monthName(month), n: fmtN(a.n), d, g: a.gp, b: a.bp, o: fmtN(a.open) }))} ${esc(t('rLeadCivic', { n: fmtN(ac.n), g: ac.gp, b: ac.bp }))}</p>`;

  const tile = (v, l, dd = '') => `<div class="kpi"><b>${v}</b><span>${esc(l)}</span>${dd ? `<span class="delta">${esc(dd)}</span>` : ''}</div>`;
  const pp = (x, y) => (y == null ? '' : `${x - y > 0 ? '▲' : x - y < 0 ? '▼' : '='} ${Math.abs(x - y)} pp`);
  const kpis = `<div class="kpis">
    ${tile(fmtN(a.n), t('rkTotal'), b ? change(a.n, b.n) : '')}
    ${tile(fmtN(ac.n), t('rkCivic'), bc ? change(ac.n, bc.n) : '')}
    ${tile(a.gp + '%', t('rkResolved'), b ? pp(a.gp, b.gp) : '')}
    ${tile(a.bp + '%', t('rkRejected'), b ? pp(a.bp, b.bp) : '')}
    ${tile(fmtN(a.open), t('rkOpen'))}
    ${tile(fmtN(a.overdue), t('rkOverdue'))}
  </div>`;

  // parking vs city problems
  const scopeRows = [[t('scCivic'), ac, bc], [t('scParking'), ap, b ? stats(prev.filter((it) => isParking(it.catId))) : null]].map(([l, s, p]) =>
    `<tr><td>${esc(l)}</td><td class="num">${fmtN(s.n)}</td><td class="num">${p ? change(s.n, p.n) : '—'}</td><td class="num">${s.gp}%</td><td class="num">${s.bp}%</td><td class="num">${fmtN(s.open)}</td></tr>`);
  const scope = section(t('cScope'), table([t('rColType'), t('rColN'), t('rColDelta'), t('rColGood'), t('rColBad'), t('rColOpen')], scopeRows), 'wide');

  // categories
  const pc = groupBy(prev, (it) => it.catId);
  const cats = [...groupBy(cur, (it) => it.catId).entries()].map(([id, l]) => ({ id, name: catLabel(l[0]), s: stats(l), p: pc.get(id)?.length })).sort((x, y) => y.s.n - x.s.n);
  const catRows = cats.map((c) => `<tr><td><button class="link" data-cat="${esc(c.id)}">${esc(c.name)}</button>${isParking(c.id) ? ` <small class="muted">· ${esc(t('scParking'))}</small>` : ''}</td>
    <td class="num">${fmtN(c.s.n)}</td><td class="num">${b ? change(c.s.n, c.p) || '—' : '—'}</td><td class="num">${c.s.gp}%</td><td class="num">${c.s.bp}%</td><td class="num">${fmtN(c.s.open)}</td></tr>`);
  const catsT = section(t('rCats'), table([t('category'), t('rColN'), t('rColDelta'), t('rColGood'), t('rColBad'), t('rColOpen')], catRows), 'wide');

  // neighbourhoods
  const pa = groupBy(prev, (it) => it.area || null);
  const areas = [...groupBy(cur, (it) => it.area || null).entries()].map(([name, l]) => ({ name, s: stats(l), sc: stats(l.filter((it) => !isParking(it.catId))), p: pa.get(name)?.length })).sort((x, y) => y.s.n - x.s.n);
  const areaRows = areas.map((r) => `<tr><td><button class="link" data-area="${esc(r.name)}">${esc(r.name)}</button></td>
    <td class="num">${fmtN(r.s.n)}</td><td class="num">${b ? change(r.s.n, r.p) || '—' : '—'}</td><td class="num">${fmtN(r.sc.n)}</td><td class="num">${r.s.gp}%</td><td class="num">${r.s.bp}%</td></tr>`);
  const areasT = section(t('rAreas'), table([t('dArea'), t('rColN'), t('rColDelta'), t('scCivic'), t('rColGood'), t('rColBad')], areaRows) + `<p class="fine">${esc(t('areaHint'))}</p>`);

  // most often rejected
  const rej = cats.filter((c) => c.s.n >= MIN_N).sort((x, y) => y.s.bp - x.s.bp).slice(0, 6);
  const rejT = section(t('rWorstRej'), table([t('category'), t('rColBad'), t('rColN')], rej.map((c) =>
    `<tr><td>${esc(c.name)}</td><td class="num">${c.s.bp}%</td><td class="num">${fmtN(c.s.n)}</td></tr>`)) + `<p class="fine">${esc(t('rMinN', { n: MIN_N }))}</p>`);

  // slowest to close (only where the archive saw the closing)
  const slow = cats.filter((c) => c.s.ttc.length >= 5).sort((x, y) => y.s.med - x.s.med).slice(0, 6);
  const slowT = section(t('rSlow'), slow.length
    ? table([t('category'), t('rColMed'), t('count')], slow.map((c) => `<tr><td>${esc(c.name)}</td><td class="num">${esc(duration(c.s.med))}</td><td class="num">${fmtN(c.s.ttc.length)}</td></tr>`))
      + (a.med != null ? `<p class="fine">${esc(t('rkTtc'))}: ${esc(duration(a.med))} · ${t('kN', { n: fmtN(a.ttc.length) })}</p>` : '')
    : `<p class="muted">${esc(t('rSlowNone'))}</p>`);

  // places that keep coming back
  const cells = groupBy(cur.filter((it) => isFinite(it.lat)), (it) => `${Math.round(it.lat / 0.00055)}:${Math.round(it.lng / 0.00077)}:${it.catId}`);
  const spots = [...cells.values()].filter((l) => l.length >= 3).sort((x, y) => y.length - x.length).slice(0, 8).map((l) => ({
    n: l.length, name: catLabel(l[0]), cat: l[0].catId, area: l[0].area, s: stats(l),
    lat: l.reduce((sum, x) => sum + x.lat, 0) / l.length, lng: l.reduce((sum, x) => sum + x.lng, 0) / l.length,
  }));
  const spotsT = section(t('rSpots'), spots.length ? `<ol class="spots">${spots.map((s) => `<li><button data-zone="${s.lat.toFixed(6)},${s.lng.toFixed(6)}" data-zone-cat="${esc(s.cat)}">
      <span class="spot-n">${fmtN(s.n)}×</span><span class="spot-main"><b>${esc(s.name)}</b><small>${esc(s.area || '')} · ${t('resolvedPct', { p: s.s.gp })}</small></span><span aria-hidden="true">→</span></button></li>`).join('')}</ol>`
    : `<p class="muted">${esc(t('hotNone'))}</p>`);

  root.innerHTML = `${head}${lead}${kpis}<p class="fine">${notes.map(esc).join(' ')}</p>
    <div class="viz-grid">${scope}${catsT}${rejT}${slowT}${areasT}${spotsT}</div>`;
  bind(root, ctx);
}

function bind(root, ctx) {
  const sel = root.querySelector('#reportMonth');
  if (sel) sel.onchange = () => ctx.onMonth(sel.value);
  root.onclick = (e) => {
    const r = e.target.closest('[data-r]');
    if (r?.dataset.r === 'print') return window.print();
    if (r?.dataset.r === 'copy') {
      navigator.clipboard?.writeText(location.href).then(() => toast(t('rCopied')), () => {});
      return;
    }
    const c = e.target.closest('[data-cat]'); if (c) return ctx.onCategory(c.dataset.cat);
    const a = e.target.closest('[data-area]'); if (a) return ctx.onArea(a.dataset.area);
    const z = e.target.closest('[data-zone]');
    if (z) { const [lat, lng] = z.dataset.zone.split(',').map(Number); ctx.onZone(lat, lng, z.dataset.zoneCat); }
  };
}
