// "Se repetă" tab: places where the same kind of problem was reported again
// after a report there had been closed as resolved. Data: data/recurrence.json,
// computed by the collector (scripts/recurrence.mjs). Neutral wording on purpose.
import { t, locale, catName } from './i18n.js';
import { esc, fmtN } from './app.js';
import { catIconSVG, clusterHTML } from './pins.js';

const PAGE = 30;
const pct = (n, d) => (d ? Math.round((n / d) * 100) : 0);
let data = null, loading = null, map = null, layer = null, appliedState = null;
const view = { cat: '', area: '', shown: PAGE, sort: { cat: 'resolved', area: 'resolved' }, selected: null };

async function load() {
  if (data) return data;
  loading ??= fetch('data/recurrence.json', { cache: 'no-cache' }).then((r) => (r.ok ? r.json() : null)).catch(() => null);
  data = await loading;
  return data;
}
const day = (s) => new Intl.DateTimeFormat(locale(), { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(new Date(s.slice(0, 10) + 'T12:00:00Z'));

export async function render(root, ctx) {
  if (!data) root.innerHTML = '<div class="viz-grid"><div class="skeleton tall"></div></div>';
  const d = await load();
  if (!d) { root.innerHTML = `<p class="muted">${esc(t('recNone'))}</p>`; return; }
  // take the filters from the link once; later changes come from this tab itself
  if (ctx.state && ctx.state !== appliedState) { Object.assign(view, ctx.state); appliedState = ctx.state; }

  const places = d.places.filter((p) => (!view.cat || p.cat === view.cat) && (!view.area || p.area === view.area));
  const catOpts = Object.entries(d.byCategory).sort((a, b) => b[1].resolved - a[1].resolved);
  const areaOpts = Object.keys(d.byArea).sort((a, b) => a.localeCompare(b, 'ro'));
  const tot = d.totals;
  const rule = d.rule;

  const head = `<div class="viz-head"><h1>${esc(t('recTitle'))}</h1></div>
    <p class="report-lead">${esc(t('recLead', { n: fmtN(tot.places), m: fmtN(tot.cameBack) }))}</p>
    <div class="kpis">
      <div class="kpi"><b>${fmtN(tot.places)}</b><span>${esc(t('recKPlaces'))}</span></div>
      <div class="kpi"><b>${fmtN(tot.cameBack)}</b><span>${esc(t('recKAgain'))}</span></div>
      <div class="kpi"><b>${pct(tot.recurred, tot.resolved)}%</b><span>${esc(t('recKRate'))}</span><small>${esc(t('recKRateSub', { n: fmtN(tot.resolved), d: rule.windowDays }))}</small></div>
    </div>
    <details class="method"><summary>${esc(t('recHow'))}</summary>
      <ul>${t('recRule', { r: rule.radiusM, w: rule.windowDays, g: rule.gapDays, p: rule.placeholderMin }).split('|').map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
    </details>`;

  const filters = `<div class="rec-filters">
      <select id="recCat" class="select"><option value="">${esc(t('catAll'))}</option>${catOpts.map(([id, c]) => `<option value="${esc(id)}"${id === view.cat ? ' selected' : ''}>${esc(catName(id, c.name))}</option>`).join('')}</select>
      <select id="recArea" class="select"><option value="">${esc(t('allAreas'))}</option>${areaOpts.map((a) => `<option${a === view.area ? ' selected' : ''}>${esc(a)}</option>`).join('')}</select>
      <span class="muted">${esc(d.places.length < tot.places && !view.cat && !view.area ? t('recShownTop', { n: fmtN(places.length), t: fmtN(tot.places) }) : t('recShown', { n: fmtN(places.length) }))}</span>
    </div>`;

  const rows = places.slice(0, view.shown).map((p, i) => `<li class="rec-place${view.selected === p.lat + ',' + p.lng ? ' active' : ''}" data-place="${p.lat},${p.lng}">
      <div class="rec-top"><span class="rec-ic">${catIconSVG(p.cat, 14)}</span>
        <b>${esc(catName(p.cat, p.name))}</b><span class="muted">${esc(p.area || '')}</span>
        <button class="link rec-zoom" data-zoom="${p.lat},${p.lng}" data-cat="${esc(p.cat)}">${esc(t('recOnMap'))}</button></div>
      <div class="rec-sub">${esc(t('recPlaceLine', { n: fmtN(p.n), a: fmtN(p.again), f: day(p.first), l: day(p.last) }))}${p.open ? ` · ${esc(t('recOpen', { n: p.open }))}` : ''}</div>
      <div class="rec-line" aria-label="${esc(t('recTimeline'))}">${p.reports.map(([tk, at, col, back]) =>
        `<a href="#id=${esc(tk)}" class="rec-dot${back ? ' back' : ''}" style="--status-color:var(--c-${col})" title="${esc(tk)} · ${esc(day(at))}${back ? ' · ' + esc(t('recBack')) : ''}"></a>`).join('')}</div>
    </li>`).join('');
  const more = places.length > view.shown ? `<button class="btn btn-ghost" data-more>${esc(t('showMore', { n: fmtN(places.length - view.shown) }))}</button>` : '';

  const table = (kind, entries, label) => {
    const key = view.sort[kind];
    const sorted = entries.map(([k, c]) => ({ k, name: kind === 'cat' ? catName(k, c.name) : k, ...c, p: pct(c.recurred, c.resolved) }))
      .sort((a, b) => (key === 'name' ? a.name.localeCompare(b.name, 'ro') : b[key] - a[key]));
    const th = (col, txt, num) => `<th${num ? ' class="num"' : ''}><button class="link sort${key === col ? ' on' : ''}" data-sort="${kind}:${col}">${esc(txt)}</button></th>`;
    return `<div class="table-wrap report-table"><table><thead><tr>${th('name', label)}${th('resolved', t('recColRes'), 1)}${th('recurred', t('recColAgain'), 1)}${th('p', '%', 1)}</tr></thead>
      <tbody>${sorted.map((r) => `<tr><td>${esc(r.name)}</td><td class="num">${fmtN(r.resolved)}</td><td class="num">${fmtN(r.recurred)}</td><td class="num">${r.p}%</td></tr>`).join('')}</tbody></table></div>`;
  };

  root.innerHTML = `${head}
    <div class="rec-grid">
      <section class="viz-card rec-list-card"><h2>${esc(t('recPlaces'))}</h2>${filters}<ol class="rec-list">${rows || `<li class="muted">${esc(t('recNoMatch'))}</li>`}</ol>${more}</section>
      <section class="viz-card rec-map-card"><div id="recMap"></div></section>
    </div>
    <div class="viz-grid">
      <section class="viz-card"><h2>${esc(t('recByCat'))}</h2><p class="fine">${esc(t('recTableNote', { d: rule.windowDays }))}</p>${table('cat', Object.entries(d.byCategory), t('category'))}</section>
      <section class="viz-card"><h2>${esc(t('recByArea'))}</h2><p class="fine">${esc(t('recTableNote', { d: rule.windowDays }))}</p>${table('area', Object.entries(d.byArea), t('dArea'))}</section>
    </div>`;

  drawMap(ctx, places);
  bind(root, ctx);
}

function drawMap(ctx, places) {
  const el = document.getElementById('recMap');
  if (!el) return;
  if (map) { map.remove(); map = null; }
  map = ctx.makeMap(el);
  layer = L.markerClusterGroup({
    showCoverageOnHover: false, maxClusterRadius: (z) => (z >= 16 ? 20 : 40),
    iconCreateFunction: (c) => { const { html, size } = clusterHTML(c); return L.divIcon({ html, className: '', iconSize: [size, size] }); },
  }).addTo(map);
  for (const p of places) {
    const size = Math.min(34, 18 + Math.sqrt(p.again) * 3);
    const icon = L.divIcon({ className: '', iconSize: [size, size], iconAnchor: [size / 2, size / 2],
      html: `<div class="rec-pin" style="width:${size}px;height:${size}px">${catIconSVG(p.cat, Math.round(size * 0.5))}</div>` });
    L.marker([p.lat, p.lng], { icon, title: `${catName(p.cat, p.name)} · ${p.again}` })
      .on('click', () => select(`${p.lat},${p.lng}`, true)).addTo(layer);
  }
}

function select(key, scroll) {
  view.selected = key;
  document.querySelectorAll('.rec-place').forEach((li) => li.classList.toggle('active', li.dataset.place === key));
  if (scroll) document.querySelector(`.rec-place[data-place="${key}"]`)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
}

function bind(root, ctx) {
  root.querySelector('#recCat').onchange = (e) => { view.cat = e.target.value; view.shown = PAGE; ctx.onState?.({ cat: view.cat, area: view.area }); render(root, ctx); };
  root.querySelector('#recArea').onchange = (e) => { view.area = e.target.value; view.shown = PAGE; ctx.onState?.({ cat: view.cat, area: view.area }); render(root, ctx); };
  root.onclick = (e) => {
    if (e.target.closest('[data-more]')) { view.shown += PAGE; render(root, ctx); return; }
    const s = e.target.closest('[data-sort]');
    if (s) { const [kind, col] = s.dataset.sort.split(':'); view.sort[kind] = col; render(root, ctx); return; }
    const z = e.target.closest('[data-zoom]');
    if (z) { const [lat, lng] = z.dataset.zoom.split(',').map(Number); select(z.dataset.zoom, false); map?.setView([lat, lng], 18); document.getElementById('recMap')?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); return; }
    const li = e.target.closest('.rec-place');
    if (li && !e.target.closest('a')) select(li.dataset.place, false);
  };
}

export function invalidate() { map?.invalidateSize(); }
