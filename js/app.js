import { t, setLang, getLang, locale, catName, catNameEn, statusText, applyStatic, duration } from './i18n.js';
import { loadMeta, getMeta, loadRange, fetchTicket, fromLive, todayKey, toDayKey, addDays, daysBetween } from './data.js';
import { areaOf, distanceM, insidePolygon, fromBucharest } from './geo.js';
import { ic } from './icons.js';

const OFFICIAL = 'https://iloves3.primarie3.ro/citycareweb/';
const REPO = 'https://github.com/cristi9512/i-love-sector-3-public';
const PAGE = 50;
const PARKING_CATS = new Set(['1', '2', '27', '200']);
const CENTER = [44.4155, 26.1605];
const PRESETS = [1, 7, 30, 90, 180];
const STATUS_ORDER = ['good', 'partial', 'bad', 'other', 'open'];
const STATUS_FILTER = {
  all: () => true,
  open: (k) => k === 'open',
  good: (k) => k === 'good' || k === 'partial',
  bad: (k) => k === 'bad',
  other: (k) => k === 'other',
};

const $ = (s) => document.querySelector(s);
const state = {
  tab: 'list', days: 7, from: null, to: null,
  status: 'all', cats: null, q: '', hideParking: false, area: null,
  reply: 'any', stuck: 0, edited: false, removed: 'hide', zone: null, inView: false,
  sort: 'new', mapMode: 'pins',
  archiveRaw: new Map(), liveRaw: new Map(), items: new Map(), dirty: new Set(),
  base: [], prevBase: null, view: [], listItems: [], shown: PAGE, selected: null,
  loading: false, gen: 0, picking: false, assets: null, loadInfo: null,
};

/* ================= helpers ================= */
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const fold = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const rtf = () => new Intl.RelativeTimeFormat(locale(), { numeric: 'auto' });
const dtf = () => new Intl.DateTimeFormat(locale(), { dateStyle: 'long', timeStyle: 'short', timeZone: 'Europe/Bucharest' });
const dshort = () => new Intl.DateTimeFormat(locale(), { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Bucharest' });
export const fmtN = (n) => Number(n).toLocaleString(locale());

export function relTime(d) {
  const s = (d - Date.now()) / 1000, a = Math.abs(s), f = rtf();
  if (a < 60) return f.format(0, 'second');
  if (a < 3600) return f.format(Math.round(s / 60), 'minute');
  if (a < 86400) return f.format(Math.round(s / 3600), 'hour');
  if (a < 86400 * 30) return f.format(Math.round(s / 86400), 'day');
  return f.format(Math.round(s / (86400 * 30)), 'month');
}

export function statusKey(code, label) {
  const l = fold(label);
  if (code === 'O') return 'open';
  if (l.includes('nefavorabil')) return 'bad';
  if (l.includes('partial')) return 'partial';
  if (l.includes('favorabil')) return 'good';
  return 'other';
}

function parseReply(raw) {
  const s = String(raw || '').trim();
  if (!s) return null;
  const m = /^(.{0,60}?)\s*Registratura\s+([\s\S]*)$/.exec(s);
  if (m) {
    const dept = m[1].trim();
    return { from: dept && !/^nespecificat$/i.test(dept) ? dept : null, text: m[2].trim() };
  }
  return { from: null, text: s };
}

/**
 * When the archive saw the report close (open → closed) and get its first reply.
 * Only meaningful for reports first seen while still open.
 */
function deriveTimes(rec) {
  if (rec.firstStatus !== 'O') return { closedAt: null, replyAt: null };
  let cur = 'O', closedAt = null, replyAt = null;
  for (const [at, kind, val] of rec.history || []) {
    if (kind === 's') {
      const code = String(val).split('|')[0];
      if (!closedAt && cur === 'O' && code === 'C') closedAt = new Date(at);
      cur = code;
    } else if (kind === 'r' && !replyAt) replyAt = new Date(at);
  }
  return { closedAt, replyAt };
}

function buildItem(id) {
  const a = state.archiveRaw.get(id), l = state.liveRaw.get(id);
  const rec = a && l ? { ...a, ...l } : a || l;
  if (!rec || !rec.createdAt) return null;
  const created = fromBucharest(rec.createdAt);
  const key = statusKey(rec.status, rec.statusLabel);
  const reply = parseReply(rec.reply);
  const { closedAt, replyAt } = a ? deriveTimes(a) : { closedAt: null, replyAt: null };
  const area = areaOf(rec.lat, rec.lng, state.assets?.areas);
  return {
    id: rec.id, ticket: rec.ticket, reg: rec.reg, createdAt: rec.createdAt, created, day: rec.createdAt.slice(0, 10),
    catId: rec.categoryId, categoryRo: rec.category, desc: String(rec.description || '').trim(), edited: !!rec.edited,
    lat: rec.lat, lng: rec.lng, statusCode: rec.status, statusLabel: rec.statusLabel, status: key,
    reply, removed: !!(a?.removedAt && !l), removedAt: a?.removedAt ? new Date(a.removedAt) : null,
    firstSeen: a?.firstSeen ? new Date(a.firstSeen) : null, firstStatus: a?.firstStatus || null,
    history: a?.history || [], lastChanged: a?.lastChanged ? new Date(a.lastChanged) : created,
    closedAt, replyAt, area, live: !!l,
    search: fold([rec.ticket, rec.reg, rec.category, catNameEn(rec.categoryId), rec.description, rec.reply, area].join(' \u0001 ')),
  };
}
export const catLabel = (it) => catName(it.catId, it.categoryRo);

function highlight(text, tokens) {
  const src = String(text ?? '');
  if (!tokens.length) return esc(src);
  let folded = '';
  const map = [];
  for (let i = 0; i < src.length; i++) {
    const f = fold(src[i]);
    for (let j = 0; j < f.length; j++) { folded += f[j]; map.push(i); }
  }
  const ranges = [];
  for (const tk of tokens) {
    let idx = 0;
    while ((idx = folded.indexOf(tk, idx)) !== -1) { ranges.push([map[idx], map[idx + tk.length - 1] + 1]); idx += tk.length; }
  }
  if (!ranges.length) return esc(src);
  ranges.sort((a, b) => a[0] - b[0]);
  let out = '', pos = 0;
  for (const [a, b] of ranges) {
    if (a < pos) continue;
    out += esc(src.slice(pos, a)) + '<mark>' + esc(src.slice(a, b)) + '</mark>';
    pos = b;
  }
  return out + esc(src.slice(pos));
}

export function toast(msg) {
  const el = $('#toast');
  el.textContent = msg;
  el.hidden = false;
  clearTimeout(toast._t);
  toast._t = setTimeout(() => (el.hidden = true), 3200);
}

/* ================= range ================= */
function currentRange() {
  const today = todayKey();
  if (state.days === 'custom') return { from: state.from, to: state.to, len: daysBetween(state.from, state.to) + 1 };
  if (state.days === 1) return { from: addDays(today, -1), to: today, len: 1, hours: 24 };
  return { from: addDays(today, -(state.days - 1)), to: today, len: state.days };
}
function prevRange(r) {
  if (r.hours) return { from: addDays(r.from, -1), to: r.to, hours: true };
  if (r.len > 90) return null;
  return { from: addDays(r.from, -r.len), to: addDays(r.from, -1) };
}
function inRange(it, r) {
  if (r.hours) return it.created >= Date.now() - 24 * 3600e3;
  return it.day >= r.from && it.day <= r.to;
}
function inPrev(it, p) {
  if (!p) return false;
  if (p.hours) { const age = Date.now() - it.created; return age >= 24 * 3600e3 && age < 48 * 3600e3; }
  return it.day >= p.from && it.day <= p.to;
}

/* ================= loading ================= */
async function load() {
  const gen = ++state.gen;
  loadRange.ctrl?.abort();
  const ctrl = new AbortController();
  loadRange.ctrl = ctrl;
  const r = currentRange();
  if (!r.from || !r.to || r.from > r.to) return;
  const p = prevRange(r);
  const meta = getMeta();
  // previous period only when the archive has it (no extra load on the city's server)
  const loadFrom = p && (!meta?.coverageFrom || p.from >= meta.coverageFrom) ? p.from : r.from;
  state.comparePrev = loadFrom === p?.from;

  state.loading = true;
  state.shown = PAGE;
  setProgress(0.03);
  renderAll(true);
  const info = await loadRange(loadFrom, r.to, {
    signal: ctrl.signal,
    onProgress: (x) => gen === state.gen && setProgress(x),
    onChunk: (recs, source) => {
      if (gen !== state.gen) return;
      const target = source === 'archive' ? state.archiveRaw : state.liveRaw;
      for (const rec of recs) { if (rec.id && rec.createdAt) { target.set(rec.id, rec); state.dirty.add(rec.id); } }
      scheduleRefresh();
    },
  });
  if (gen !== state.gen) return;
  state.loading = false;
  state.loadInfo = info;
  setProgress(null);
  refresh();
  renderDataLine();
  if (info.failed) toast(t('partialFail', { n: info.failed, m: info.total }));
  else if (info.truncated) toast(t('capHit'));
  openFromHash();
}

function setProgress(p) {
  const el = $('#progress');
  if (p == null) { el.hidden = true; return; }
  el.hidden = false;
  el.firstElementChild.style.width = Math.max(3, p * 100) + '%';
}
let refreshTimer = null;
function scheduleRefresh() {
  if (refreshTimer) return;
  refreshTimer = setTimeout(() => { refreshTimer = null; refresh(); }, 300);
}

function syncItems() {
  for (const id of state.dirty) {
    const it = buildItem(id);
    if (it) state.items.set(id, it); else state.items.delete(id);
  }
  state.dirty.clear();
}

/* ================= filtering ================= */
const tokens = () => fold(state.q).split(/\s+/).filter(Boolean);

function passes(it, toks) {
  if (state.removed === 'hide' && it.removed) return false;
  if (state.removed === 'only' && !it.removed) return false;
  if (state.hideParking && PARKING_CATS.has(it.catId)) return false;
  if (state.cats && !state.cats.has(it.catId)) return false;
  if (state.area && it.area !== state.area) return false;
  if (state.reply === 'yes' && !it.reply) return false;
  if (state.reply === 'no' && it.reply) return false;
  if (state.edited && !it.edited) return false;
  if (state.stuck && !(it.status === 'open' && Date.now() - it.created > state.stuck * 864e5)) return false;
  if (state.zone && !(isFinite(it.lat) && distanceM(state.zone, it) <= state.zone.r)) return false;
  for (const tk of toks) if (!it.search.includes(tk)) return false;
  return true;
}

function refresh() {
  syncItems();
  const r = currentRange(), p = state.comparePrev ? prevRange(r) : null;
  const toks = tokens();
  const base = [], prevBase = [];
  for (const it of state.items.values()) {
    if (inRange(it, r)) { if (passes(it, toks)) base.push(it); }
    else if (p && inPrev(it, p) && passes(it, toks)) prevBase.push(it);
  }
  state.base = base;
  state.prevBase = p ? prevBase : null;
  const sf = STATUS_FILTER[state.status];
  const view = base.filter((it) => sf(it.status));
  const by = {
    new: (a, b) => b.created - a.created,
    old: (a, b) => a.created - b.created,
    long: (a, b) => b.desc.length - a.desc.length,
    updated: (a, b) => b.lastChanged - a.lastChanged,
  }[state.sort] || ((a, b) => b.created - a.created);
  view.sort(by);
  state.view = view;
  computeListItems();
  renderAll();
  writeHash();
}

function computeListItems() {
  if (state.inView && map) {
    const b = map.getBounds();
    state.listItems = state.view.filter((it) => isFinite(it.lat) && b.contains([it.lat, it.lng]));
  } else state.listItems = state.view;
}

/* ================= rendering ================= */
function renderAll(skeleton = false) {
  renderControls();
  renderChips();
  renderStats();
  renderCategoryList();
  renderAreaSelect();
  renderList(skeleton);
  renderMap();
  if (state.tab === 'insights') renderInsightsTab();
}

function renderControls() {
  document.querySelectorAll('#range button').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.days === String(state.days))));
  document.querySelectorAll('#status button').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.status === state.status)));
  document.querySelectorAll('#replySeg button').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.reply === state.reply)));
  document.querySelectorAll('.tabs button').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.tab === state.tab)));
  document.querySelectorAll('#mapMode button').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.mode === state.mapMode)));
  $('#customRange').hidden = state.days !== 'custom';
  if (state.days === 'custom') { $('#from').value = state.from; $('#to').value = state.to; }
  if (document.activeElement !== $('#q')) $('#q').value = state.q;
  $('#hideParking').checked = state.hideParking;
  $('#sort').value = state.sort;
  $('#stuck').value = String(state.stuck);
  $('#edited').checked = state.edited;
  $('#removed').value = state.removed;
  $('#inView').checked = state.inView;
  $('#clearZone').hidden = !state.zone;
  if (state.zone) $('#radius').value = String(state.zone.r);
  $('#listView').hidden = state.tab !== 'list';
  $('#insightsView').hidden = state.tab !== 'insights';
  $('#viewToggle').hidden = state.tab !== 'list';
  const n = activeFilterCount();
  $('#moreCount').textContent = n ? String(n) : '';
  $('#moreCount').hidden = !n;
}

function activeFilterCount() {
  return [state.reply !== 'any', state.stuck, state.edited, state.removed !== 'hide', state.zone, state.inView].filter(Boolean).length;
}

function renderChips() {
  const chips = [];
  if (state.q) chips.push(['q', t('chipSearch', { q: state.q })]);
  if (state.area) chips.push(['area', t('chipArea', { a: state.area })]);
  if (state.zone) chips.push(['zone', t('chipZone', { r: state.zone.r })]);
  if (state.reply !== 'any') chips.push(['reply', t(state.reply === 'yes' ? 'chipReplyYes' : 'chipReplyNo')]);
  if (state.stuck) chips.push(['stuck', t('chipStuck', { n: state.stuck })]);
  if (state.edited) chips.push(['edited', t('chipEdited')]);
  if (state.removed !== 'hide') chips.push(['removed', t(state.removed === 'only' ? 'chipRemovedOnly' : 'chipRemovedInclude')]);
  if (state.inView) chips.push(['inView', t('chipInView')]);
  if (state.hideParking) chips.push(['parking', t('chipParking')]);
  if (state.cats) chips.push(['cats', $('#catLabel').textContent]);
  const el = $('#chips');
  el.hidden = !chips.length;
  el.innerHTML = chips.map(([k, label]) => `<button class="chip-btn" data-chip="${k}">${esc(label)} <span aria-hidden="true">${ic('close', 12)}</span></button>`).join('')
    + (chips.length > 1 ? `<button class="link" data-chip="all">${esc(t('clearAll'))}</button>` : '');
}

function renderStats() {
  const base = state.base;
  const c = { open: 0, good: 0, partial: 0, bad: 0, other: 0 };
  let replied = 0;
  const catCount = new Map();
  for (const it of base) {
    c[it.status]++;
    if (it.reply) replied++;
    catCount.set(it.catId, (catCount.get(it.catId) || 0) + 1);
  }
  const top = [...catCount].sort((a, b) => b[1] - a[1])[0];
  const topName = top ? catName(top[0], base.find((x) => x.catId === top[0])?.categoryRo) : '—';
  const pct = (n) => (base.length ? Math.round((n / base.length) * 100) : 0);
  $('#stats').innerHTML = `
    <button class="stat" data-status="all"><b>${fmtN(base.length)}</b><span>${t('statTotal')}${state.loading ? ' · ' + t('loading') : ''}</span></button>
    <button class="stat" data-status="open"><b>${fmtN(c.open)}</b><span><i class="dot s-open"></i>${t('statOpen')} · ${pct(c.open)}%</span></button>
    <button class="stat" data-status="good"><b>${fmtN(c.good + c.partial)}</b><span><i class="dot s-good"></i>${t('statGood')} · ${pct(c.good + c.partial)}%</span></button>
    <button class="stat" data-status="bad"><b>${fmtN(c.bad)}</b><span><i class="dot s-bad"></i>${t('statBad')} · ${pct(c.bad)}%</span></button>
    <div class="stat"><b>${pct(replied)}%</b><span>${t('statReplied')}</span></div>
    <div class="stat"><b class="stat-text" title="${esc(topName)}">${esc(topName)}</b><span>${t('statTop')} · ${fmtN(top?.[1] || 0)}</span></div>`;
}

function renderCategoryList() {
  const counts = new Map(), names = new Map();
  const r = currentRange();
  for (const it of state.items.values()) {
    names.set(it.catId, it.categoryRo);
    if (inRange(it, r)) counts.set(it.catId, (counts.get(it.catId) || 0) + 1);
  }
  const cats = [...names].map(([id, ro]) => ({ id, name: catName(id, ro), n: counts.get(id) || 0 }))
    .sort((a, b) => b.n - a.n || a.name.localeCompare(b.name, locale()));
  $('#catList').innerHTML = cats.map((c) => `
    <label><input type="checkbox" value="${esc(c.id)}" ${!state.cats || state.cats.has(c.id) ? 'checked' : ''}>
      <span>${esc(c.name)}</span><span class="count">${c.n ? fmtN(c.n) : ''}</span></label>`).join('');
  $('#catLabel').textContent = !state.cats ? t('allCats')
    : state.cats.size === 1 ? (cats.find((c) => state.cats.has(c.id))?.name || t('nCats', { n: 1 }))
    : t('nCats', { n: state.cats.size });
}

function renderAreaSelect() {
  const sel = $('#area');
  const areas = (state.assets?.areas || []).map((a) => a.name).sort((a, b) => a.localeCompare(b, 'ro'));
  const html = `<option value="">${esc(t('allAreas'))}</option>` + areas.map((a) => `<option value="${esc(a)}">${esc(a)}</option>`).join('');
  if (sel.dataset.html !== html) { sel.innerHTML = html; sel.dataset.html = html; }
  sel.value = state.area || '';
}

function statusBadge(it) {
  return `<span class="badge" style="--status-color:var(--c-${it.status})"><i class="dot"></i>${esc(statusText(it.status, it.statusLabel))}</span>`;
}

// List previews skip the opening greeting so the first visible line says what
// the report is about. The detail view always shows the full original text.
const GREETING = /^\s*(bun[ăa]\s+(ziua|seara|diminea[țt]a)|stimat[ăae]?(\s+(domn|doamn)\w*)?(\s+primar)?|salut(are)?|hello|doamn[ăe]lor|domnule\s+primar)[\s,!.:;\u2026-]*/i;
function previewText(s) {
  let out = s;
  for (let i = 0; i < 2; i++) out = out.replace(GREETING, '');
  out = out.replace(/^[\s.\u2026,]+/, '');
  return out || s;
}

function cardHTML(it, toks) {
  const desc = it.desc ? highlight(previewText(it.desc), toks) : esc(t('noDesc'));
  return `<article class="card${state.selected === it.id ? ' active' : ''}${it.removed ? ' removed' : ''}" data-id="${esc(it.id)}" style="--status-color:var(--c-${it.status})" tabindex="0">
    <div class="card-top"><span class="card-cat">${highlight(catLabel(it), toks)}</span>
      <time class="card-time" title="${esc(dtf().format(it.created))}">${relTime(it.created)}</time></div>
    <p class="card-desc${it.desc ? '' : ' empty'}">${desc}</p>
    ${it.reply ? `<div class="card-reply"><b>${t('reply')}:</b> ${highlight(it.reply.text, toks)}</div>` : ''}
    <div class="card-meta">${statusBadge(it)}<span class="chip">${highlight(it.ticket, toks)}</span>
      ${it.area ? `<span>${esc(it.area)}</span>` : ''}
      ${it.edited ? `<span title="${esc(t('dEditedNote'))}">${ic('edit', 13)} ${t('edited')}</span>` : ''}
      ${it.removed ? `<span class="removed-tag">${ic('trash', 13)} ${t('removedBadge')}</span>` : ''}</div>
  </article>`;
}

function renderList(skeleton = false) {
  const list = $('#list'), footer = $('#listFooter');
  if (skeleton || (state.loading && !state.view.length)) {
    list.innerHTML = '<div class="skeleton"></div>'.repeat(5);
    footer.innerHTML = '';
    $('#resultCount').textContent = t('loading');
    return;
  }
  const n = state.listItems.length;
  $('#resultCount').textContent = `${fmtN(n)} ${n === 1 ? t('reports1') : t('reportsN')}${state.loading ? ' · ' + t('loading') : ''}`;
  if (!n) {
    list.innerHTML = `<div class="empty-state"><b>${t('noResults')}</b>${t('noResultsHint')}</div>`;
    footer.innerHTML = '';
    return;
  }
  const toks = tokens();
  list.innerHTML = state.listItems.slice(0, state.shown).map((it) => cardHTML(it, toks)).join('');
  footer.innerHTML = n > state.shown ? `<button class="btn btn-ghost" id="more">${t('showMore', { n: fmtN(n - state.shown) })}</button>` : '';
}

function renderDataLine() {
  const meta = getMeta(), info = state.loadInfo;
  const el = $('#dataLine');
  if (!info) { el.textContent = ''; return; }
  if (meta?.lastRun && info.archiveUsed) {
    el.innerHTML = `<span class="pulse" aria-hidden="true"></span>${esc(t('dataFresh', { t: relTime(new Date(meta.lastRun)) }))}${info.liveUsed ? ' · ' + esc(t('dataLive')) : ''}`;
  } else el.textContent = t('dataLiveOnly');
}

/* ================= map ================= */
let map, cluster, heat, zoneCircle, miniMap;
const markers = new Map();

function tileLayer() {
  return L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  });
}
// map shapes are SVG attributes, which can't use CSS variables
const cssVar = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim() || '#0f766e';
function boundaryLayer() {
  return L.polygon(state.assets?.boundary || [], {
    color: cssVar('--primary'), weight: 2, opacity: 0.8, fill: true, fillOpacity: 0.03, dashArray: '6 4', interactive: false,
  });
}

function initMap() {
  map = L.map('map', { zoomControl: true }).setView(CENTER, 13);
  tileLayer().addTo(map);
  if (state.assets?.boundary) {
    const b = boundaryLayer().addTo(map);
    map.fitBounds(b.getBounds(), { padding: [10, 10] });
  }
  cluster = L.markerClusterGroup({
    chunkedLoading: true, showCoverageOnHover: false, maxClusterRadius: 45, spiderfyOnMaxZoom: true,
    iconCreateFunction: (c) => {
      const n = c.getChildCount();
      const size = n < 10 ? 34 : n < 100 ? 40 : 48;
      return L.divIcon({ html: `<div class="marker-cluster-custom" style="width:${size}px;height:${size}px">${n}</div>`, className: '', iconSize: [size, size] });
    },
  });
  map.addLayer(cluster);
  map.on('click', (e) => {
    if (!state.picking) return;
    setZone(e.latlng.lat, e.latlng.lng, Number($('#radius').value) || 300);
  });
  map.on('moveend', () => {
    if (state.inView) { computeListItems(); state.shown = PAGE; renderList(); }
  });
}

function pinIcon(it, active) {
  return L.divIcon({
    className: '', iconSize: [16, 16], iconAnchor: [8, 8], popupAnchor: [0, -8],
    html: `<div class="pin${active ? ' active' : ''}${it.removed ? ' removed' : ''}" style="--status-color:var(--c-${it.status})"></div>`,
  });
}

function popupHTML(it) {
  return `<div class="popup-cat">${esc(catLabel(it))}</div>${statusBadge(it)}
    <div class="popup-desc">${esc(it.desc || t('noDesc'))}</div>
    <div class="popup-meta">${esc(it.ticket)} · ${relTime(it.created)}</div>
    <a href="#" class="popup-more" data-open="${esc(it.id)}">${getLang() === 'ro' ? 'Vezi detalii' : 'View details'} →</a>`;
}

function renderMap() {
  if (!map) return;
  if (state.mapMode === 'heat') {
    if (map.hasLayer(cluster)) map.removeLayer(cluster);
    const pts = state.view.filter((it) => isFinite(it.lat)).map((it) => [it.lat, it.lng, 0.6]);
    if (!heat) heat = L.heatLayer(pts, { radius: 16, blur: 20, maxZoom: 17, minOpacity: 0.25 });
    else heat.setLatLngs(pts);
    if (!map.hasLayer(heat)) heat.addTo(map);
    return;
  }
  if (heat && map.hasLayer(heat)) map.removeLayer(heat);
  if (!map.hasLayer(cluster)) map.addLayer(cluster);
  const wanted = new Set(), toAdd = [];
  for (const it of state.view) {
    if (!isFinite(it.lat) || !isFinite(it.lng)) continue;
    wanted.add(it.id);
    let m = markers.get(it.id);
    if (!m || m._status !== it.status || m._removed !== it.removed) {
      if (m && cluster.hasLayer(m)) cluster.removeLayer(m);
      m = L.marker([it.lat, it.lng], { icon: pinIcon(it, state.selected === it.id), title: catLabel(it) });
      m._status = it.status; m._removed = it.removed;
      m.bindPopup(() => popupHTML(state.items.get(it.id) || it), { maxWidth: 280 });
      m.on('click', () => selectCard(it.id, false));
      markers.set(it.id, m);
    }
    if (!cluster.hasLayer(m)) toAdd.push(m);
  }
  const toRemove = [];
  for (const [id, m] of markers) if (!wanted.has(id) && cluster.hasLayer(m)) toRemove.push(m);
  if (toRemove.length) cluster.removeLayers(toRemove);
  if (toAdd.length) cluster.addLayers(toAdd);
}

function setActiveMarker(id) {
  const prev = state.selected && markers.get(state.selected), prevIt = state.selected && state.items.get(state.selected);
  if (prev && prevIt) prev.setIcon(pinIcon(prevIt, false));
  state.selected = id;
  const m = id && markers.get(id), it = id && state.items.get(id);
  if (m && it) m.setIcon(pinIcon(it, true));
}

function focusOnMap(id) {
  const m = markers.get(id);
  if (!m || !cluster.hasLayer(m)) return;
  cluster.zoomToShowLayer(m, () => { if (map.getZoom() < 16) map.setView(m.getLatLng(), 16); m.openPopup(); });
}

function selectCard(id, scroll = true) {
  setActiveMarker(id);
  document.querySelectorAll('.card.active').forEach((c) => c.classList.remove('active'));
  const card = document.querySelector(`.card[data-id="${CSS.escape(id)}"]`);
  if (card) { card.classList.add('active'); if (scroll) card.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }
}

function drawZone() {
  if (zoneCircle) { zoneCircle.remove(); zoneCircle = null; }
  if (!state.zone || !map) return;
  zoneCircle = L.circle([state.zone.lat, state.zone.lng], {
    radius: state.zone.r, color: cssVar('--primary'), weight: 2, fillOpacity: 0.08, interactive: false,
  }).addTo(map);
}

export function setZone(lat, lng, r, fit = true) {
  state.zone = { lat: +lat.toFixed(6), lng: +lng.toFixed(6), r };
  state.picking = false;
  $('#map').classList.remove('picking');
  $('#pickHint').hidden = true;
  drawZone();
  if (fit && zoneCircle) map.fitBounds(zoneCircle.getBounds(), { padding: [30, 30] });
  state.shown = PAGE;
  refresh();
}

/* ================= detail dialog ================= */
const geoCache = new Map();
function reverseGeocode(lat, lng) {
  const k = lat.toFixed(5) + ',' + lng.toFixed(5);
  if (!geoCache.has(k)) {
    geoCache.set(k, fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=18&accept-language=ro&lat=${lat}&lon=${lng}`)
      .then((r) => r.json())
      .then((j) => {
        const a = j.address || {};
        const street = [a.road || a.pedestrian || a.footway, a.house_number].filter(Boolean).join(' ');
        return [street, a.suburb || a.neighbourhood || a.quarter].filter(Boolean).join(', ') || j.display_name || null;
      }).catch(() => null));
  }
  return geoCache.get(k);
}

function historyHTML(it) {
  const rows = [[it.created, t('dCreated'), null]];
  if (it.firstSeen && it.firstSeen - it.created > 3 * 3600e3) {
    const seen = it.firstStatus === 'O' ? statusText('open', 'Deschisă') : getLang() === 'ro' ? 'închisă' : 'closed';
    rows.push([it.firstSeen, t('dFirstSeen', { s: seen }), it.firstStatus === 'O' ? 'open' : null]);
  }
  for (const [at, kind, val] of it.history) {
    const d = new Date(at);
    if (kind === 's') {
      const [code, label] = String(val).split('|');
      rows.push([d, t('hStatus', { s: statusText(statusKey(code, label), label) }), statusKey(code, label)]);
    } else if (kind === 'r') rows.push([d, t('hReply')]);
    else if (kind === 'd') rows.push([d, t('hDesc')]);
    else if (kind === 'c') rows.push([d, t('hCat', { c: val })]);
    else if (kind === 'x') rows.push([d, t('hRemoved'), 'bad']);
    else if (kind === 'u') rows.push([d, t('hRestored')]);
  }
  const dur = it.closedAt ? t('dClosedAfter', { d: duration(it.closedAt - it.created) })
    : it.status === 'open' ? t('dOpenFor', { d: duration(Date.now() - it.created) }) : '';
  return `<ol class="timeline">${rows.map(([d, label, key]) => `
      <li style="--status-color:${key ? `var(--c-${key})` : 'var(--muted)'}"><span class="tl-dot"></span>
        <div><b>${esc(label)}</b><time>${esc(dtf().format(d))}</time></div></li>`).join('')}</ol>
    ${dur ? `<div class="tl-summary">${esc(dur)}</div>` : ''}
    ${it.history.length ? `<p class="fine">${esc(t('hNote'))}</p>` : ''}`;
}

function openDetail(id) {
  const it = state.items.get(id);
  if (!it) return;
  if (state.tab === 'list') {
    selectCard(id);
    if (matchMedia('(min-width: 861px)').matches) focusOnMap(id);
  }
  const nearby = [...state.items.values()]
    .filter((o) => o.id !== it.id && isFinite(o.lat) && distanceM(it, o) < 75)
    .sort((a, b) => b.created - a.created).slice(0, 6);
  const officialUrl = `${OFFICIAL}?c=${encodeURIComponent(it.ticket)}&lat=${it.lat}&lng=${it.lng}&zoom=18`;
  const reportUrl = `${OFFICIAL}?lat=${it.lat}&lng=${it.lng}&zoom=18`;
  const gmaps = `https://www.google.com/maps/search/?api=1&query=${it.lat},${it.lng}`;
  const link = location.origin + location.pathname + '#id=' + encodeURIComponent(it.ticket);

  $('#detailBody').innerHTML = `<div class="detail-body" style="--status-color:var(--c-${it.status})">
    ${statusBadge(it)} ${it.removed ? `<span class="removed-tag">${ic('trash', 13)} ${t('removedBadge')}</span>` : ''}
    <h2>${esc(catLabel(it))}</h2>
    <div class="sub">${esc(it.ticket)} · ${esc(dtf().format(it.created))} (${relTime(it.created)})${it.area ? ' · ' + esc(it.area) : ''}</div>

    <h3>${t('dDesc')}</h3>
    <div class="text">${it.desc ? esc(it.desc) : `<span class="muted">${t('noDesc')}</span>`}</div>
    ${it.edited ? `<div class="edited-note">${t('dEditedNote')}</div>` : ''}

    <h3>${t('dReply')}${it.reply?.from ? ` · ${esc(it.reply.from)}` : ''}</h3>
    ${it.reply ? `<div class="reply">${esc(it.reply.text)}</div>` : `<div class="muted">${t(it.status === 'open' ? 'dNoReplyOpen' : 'dNoReply')}</div>`}

    <h3>${t('dHistory')}</h3>
    ${historyHTML(it)}

    <h3>${t('dLocation')}</h3>
    <div class="minimap" id="miniMap"></div>
    <dl class="kv">
      <dt>${t('dAddress')}</dt><dd id="addr">${t('dSearching')}</dd>
      ${it.area ? `<dt>${t('dArea')}</dt><dd><a href="#" data-set-area="${esc(it.area)}">${esc(it.area)}</a></dd>` : ''}
      <dt>${t('dCoords')}</dt><dd>${it.lat.toFixed(6)}, ${it.lng.toFixed(6)}</dd>
      <dt>${t('dTicket')}</dt><dd>${esc(it.ticket)}</dd>
      ${it.reg ? `<dt>${t('dReg')}</dt><dd>${esc(it.reg)}</dd>` : ''}
    </dl>

    ${nearby.length ? `<h3>${t('dNearby')}</h3><div class="nearby">${nearby.map((o) => `
      <a href="#" data-open="${esc(o.id)}"><i class="dot" style="background:var(--c-${o.status})"></i>
        <span class="nearby-text"><b>${esc(catLabel(o))}</b> — ${esc(o.desc)}</span><span class="muted small">${relTime(o.created)}</span></a>`).join('')}</div>` : ''}

    <div class="actions">
      <button class="btn btn-primary" data-copy="${esc(link)}">${ic('link')} ${t('copyLink')}</button>
      <a class="btn btn-outline" href="${esc(gmaps)}" target="_blank" rel="noopener">${t('gmaps')}</a>
      <a class="btn btn-outline" href="${esc(officialUrl)}" target="_blank" rel="noopener">${t('official')}</a>
      <a class="btn btn-outline" href="${esc(reportUrl)}" target="_blank" rel="noopener">${ic('plus')} ${t('reportHere')}</a>
    </div>
  </div>`;

  const dlg = $('#detail');
  if (!dlg.open) dlg.showModal();
  dlg.scrollTop = 0;
  history.replaceState(null, '', '#' + hashParams({ id: it.ticket }));
  if (miniMap) { miniMap.remove(); miniMap = null; }
  requestAnimationFrame(() => {
    miniMap = L.map('miniMap', { zoomControl: false, attributionControl: false, scrollWheelZoom: false }).setView([it.lat, it.lng], 17);
    tileLayer().addTo(miniMap);
    if (state.assets?.boundary) boundaryLayer().addTo(miniMap);
    L.marker([it.lat, it.lng], { icon: pinIcon(it, true), interactive: false }).addTo(miniMap);
  });
  reverseGeocode(it.lat, it.lng).then((a) => { const el = $('#addr'); if (el && dlg.open) el.textContent = a || t('dUnavailable'); });
}

/* ================= insights tab ================= */
let insightsMod = null;
async function renderInsightsTab() {
  if (!insightsMod) insightsMod = await import('./insights.js');
  insightsMod.render($('#insightsView'), {
    base: state.base, prevBase: state.prevBase, range: currentRange(), loading: state.loading,
    meta: getMeta(), assets: state.assets, items: state.items,
    onArea: (a) => { state.area = a; state.tab = 'list'; state.shown = PAGE; refresh(); window.scrollTo(0, 0); },
    onZone: (lat, lng, r, cat) => { if (cat) state.cats = new Set([cat]); state.tab = 'list'; renderControls(); setTimeout(() => { map.invalidateSize(); setZone(lat, lng, r); }, 30); },
    onCategory: (id) => { state.cats = new Set([id]); state.tab = 'list'; state.shown = PAGE; refresh(); window.scrollTo(0, 0); },
    onOpen: (id) => openDetail(id),
  });
}

/* ================= export ================= */
function download(name, type, text) {
  const blob = new Blob([text], { type });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
}
function exportRows() {
  return state.listItems.map((it) => ({
    ticket: it.ticket, registration: it.reg, created: it.createdAt, category: it.categoryRo, categoryId: it.catId,
    neighbourhood: it.area || '', status: it.statusCode, statusLabel: it.statusLabel, description: it.desc,
    reply: it.reply?.text || '', edited: it.edited, removed: it.removed, lat: it.lat, lng: it.lng,
    closedSeenAt: it.closedAt ? it.closedAt.toISOString() : '', url: location.origin + location.pathname + '#id=' + it.ticket,
  }));
}
function exportFile(kind) {
  const r = currentRange();
  const name = `sesizari-sector3_${r.from}_${r.to}`;
  const rows = exportRows();
  if (kind === 'json') return download(name + '.json', 'application/json', JSON.stringify(rows, null, 1));
  const cols = Object.keys(rows[0] || { ticket: '' });
  const cell = (v) => { const s = String(v ?? ''); return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  const csv = '﻿' + [cols.join(','), ...rows.map((row) => cols.map((c) => cell(row[c])).join(','))].join('\r\n');
  download(name + '.csv', 'text/csv;charset=utf-8', csv);
}

/* ================= URL state ================= */
function hashParams(extra = {}) {
  const p = new URLSearchParams();
  if (state.tab !== 'list') p.set('tab', state.tab);
  if (state.days === 'custom') { p.set('from', state.from); p.set('to', state.to); }
  else if (state.days !== 7) p.set('days', state.days);
  if (state.status !== 'all') p.set('status', state.status);
  if (state.cats) p.set('cats', [...state.cats].join(','));
  if (state.q) p.set('q', state.q);
  if (state.hideParking) p.set('noparking', '1');
  if (state.area) p.set('area', state.area);
  if (state.reply !== 'any') p.set('reply', state.reply);
  if (state.stuck) p.set('stuck', state.stuck);
  if (state.edited) p.set('edited', '1');
  if (state.removed !== 'hide') p.set('removed', state.removed);
  if (state.zone) p.set('zone', `${state.zone.lat},${state.zone.lng},${state.zone.r}`);
  if (state.inView) p.set('inview', '1');
  if (state.sort !== 'new') p.set('sort', state.sort);
  if (state.mapMode !== 'pins') p.set('map', state.mapMode);
  if (getLang() !== 'ro') p.set('lang', getLang());
  for (const [k, v] of Object.entries(extra)) p.set(k, v);
  return p.toString();
}
function writeHash() {
  if ($('#detail').open || state.pendingId) return;
  history.replaceState(null, '', '#' + hashParams());
}
function readHash() {
  const p = new URLSearchParams(location.hash.slice(1));
  const d = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s || '');
  if (d(p.get('from')) && d(p.get('to'))) { state.days = 'custom'; state.from = p.get('from'); state.to = p.get('to'); }
  else if (PRESETS.includes(+p.get('days'))) state.days = +p.get('days');
  if (p.get('tab') === 'insights') state.tab = 'insights';
  if (STATUS_FILTER[p.get('status')]) state.status = p.get('status');
  if (p.get('cats')) state.cats = new Set(p.get('cats').split(','));
  state.q = p.get('q') || '';
  state.hideParking = p.get('noparking') === '1';
  state.area = p.get('area') || null;
  if (['yes', 'no'].includes(p.get('reply'))) state.reply = p.get('reply');
  if (['7', '30'].includes(p.get('stuck'))) state.stuck = +p.get('stuck');
  state.edited = p.get('edited') === '1';
  if (['include', 'only'].includes(p.get('removed'))) state.removed = p.get('removed');
  const z = (p.get('zone') || '').split(',').map(Number);
  if (z.length === 3 && z.every(isFinite)) state.zone = { lat: z[0], lng: z[1], r: z[2] };
  state.inView = p.get('inview') === '1';
  if (['new', 'old', 'long', 'updated'].includes(p.get('sort'))) state.sort = p.get('sort');
  if (p.get('map') === 'heat') state.mapMode = 'heat';
  state.pendingId = p.get('id') || null;
  let lang = p.get('lang');
  if (!lang) { try { lang = localStorage.getItem('lang'); } catch { /* ignore */ } }
  if (!lang) lang = (navigator.language || 'ro').toLowerCase().startsWith('ro') ? 'ro' : 'en';
  setLang(lang);
}
async function openFromHash(ticket = state.pendingId) {
  state.pendingId = null;
  if (!ticket) return;
  let it = [...state.items.values()].find((x) => x.ticket === ticket);
  if (!it) {
    try {
      const [found] = await fetchTicket(ticket);
      if (found) { state.liveRaw.set(found.id, found); state.dirty.add(found.id); syncItems(); it = state.items.get(found.id); }
    } catch (e) { console.warn(e); }
  }
  if (it) openDetail(it.id); else toast(t('notFound', { t: ticket }));
}

/* ================= events ================= */
function bind() {
  document.querySelector('.tabs').addEventListener('click', (e) => {
    const b = e.target.closest('[data-tab]');
    if (!b) return;
    state.tab = b.dataset.tab;
    renderControls();
    if (state.tab === 'insights') renderInsightsTab();
    else setTimeout(() => map.invalidateSize(), 30);
    writeHash();
  });
  $('#langBtn').addEventListener('click', () => {
    setLang(getLang() === 'ro' ? 'en' : 'ro');
    try { localStorage.setItem('lang', getLang()); } catch { /* ignore */ }
    applyStatic();
    renderAll();
    renderDataLine();
    writeHash();
  });
  $('#range').addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.days === 'custom') {
      state.days = 'custom';
      state.to = state.to || todayKey();
      state.from = state.from || addDays(state.to, -13);
      renderControls();
      return;
    }
    state.days = +b.dataset.days;
    load();
  });
  $('#applyRange').addEventListener('click', () => {
    const f = $('#from').value, to = $('#to').value;
    if (!f || !to || f > to) return toast(t('validRange'));
    if (daysBetween(f, to) > 366) return toast(t('maxRange'));
    state.from = f; state.to = to;
    load();
  });
  const setStatus = (s) => { state.status = s; state.shown = PAGE; refresh(); };
  $('#status').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) setStatus(b.dataset.status); });
  $('#stats').addEventListener('click', (e) => { const s = e.target.closest('[data-status]'); if (s) setStatus(s.dataset.status); });

  let qt;
  $('#q').addEventListener('input', (e) => {
    clearTimeout(qt);
    qt = setTimeout(() => { state.q = e.target.value.trim(); state.shown = PAGE; refresh(); }, 220);
  });
  $('#q').addEventListener('keydown', (e) => {
    const v = e.target.value.trim().toUpperCase();
    if (e.key === 'Enter' && /^CAS-\d+$/.test(v) && ![...state.items.values()].some((x) => x.ticket === v)) {
      openFromHash(v);
    }
  });
  $('#hideParking').addEventListener('change', (e) => { state.hideParking = e.target.checked; state.shown = PAGE; refresh(); });
  $('#sort').addEventListener('change', (e) => { state.sort = e.target.value; state.shown = PAGE; refresh(); });
  $('#area').addEventListener('change', (e) => { state.area = e.target.value || null; state.shown = PAGE; refresh(); });

  // categories dropdown
  const panel = $('#catPanel');
  $('#catBtn').addEventListener('click', (e) => {
    e.stopPropagation();
    panel.hidden = !panel.hidden;
    $('#morePanel').hidden = true;
    $('#catBtn').setAttribute('aria-expanded', String(!panel.hidden));
  });
  $('#catList').addEventListener('change', () => {
    const boxes = [...document.querySelectorAll('#catList input')];
    const checked = boxes.filter((b) => b.checked).map((b) => b.value);
    state.cats = checked.length === boxes.length ? null : new Set(checked);
    state.shown = PAGE; refresh();
  });
  $('#catAll').addEventListener('click', () => { state.cats = null; refresh(); });
  $('#catNone').addEventListener('click', () => { state.cats = new Set(); refresh(); });

  // more filters
  $('#moreBtn').addEventListener('click', (e) => {
    e.stopPropagation();
    $('#morePanel').hidden = !$('#morePanel').hidden;
    panel.hidden = true;
    $('#moreBtn').setAttribute('aria-expanded', String(!$('#morePanel').hidden));
  });
  document.addEventListener('click', (e) => {
    if (!e.target.closest('#catDropdown')) panel.hidden = true;
    if (!e.target.closest('#moreDropdown')) $('#morePanel').hidden = true;
  });
  $('#replySeg').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) { state.reply = b.dataset.reply; state.shown = PAGE; refresh(); } });
  $('#stuck').addEventListener('change', (e) => { state.stuck = +e.target.value; state.shown = PAGE; refresh(); });
  $('#edited').addEventListener('change', (e) => { state.edited = e.target.checked; state.shown = PAGE; refresh(); });
  $('#removed').addEventListener('change', (e) => { state.removed = e.target.value; state.shown = PAGE; refresh(); });
  $('#inView').addEventListener('change', (e) => { state.inView = e.target.checked; state.shown = PAGE; refresh(); });
  $('#radius').addEventListener('change', (e) => { if (state.zone) setZone(state.zone.lat, state.zone.lng, +e.target.value); });
  $('#nearMe').addEventListener('click', () => {
    if (!navigator.geolocation) return toast(t('geoDenied'));
    navigator.geolocation.getCurrentPosition(
      (pos) => { showMapOnMobile(); setZone(pos.coords.latitude, pos.coords.longitude, Number($('#radius').value) || 500); },
      () => toast(t('geoDenied')), { enableHighAccuracy: true, timeout: 10000 });
  });
  $('#pickZone').addEventListener('click', () => {
    state.picking = true;
    $('#morePanel').hidden = true;
    showMapOnMobile();
    $('#map').classList.add('picking');
    $('#pickHint').hidden = false;
  });
  $('#clearZone').addEventListener('click', () => { state.zone = null; drawZone(); state.shown = PAGE; refresh(); });

  $('#chips').addEventListener('click', (e) => {
    const k = e.target.closest('[data-chip]')?.dataset.chip;
    if (!k) return;
    const reset = {
      q: () => (state.q = ''), area: () => (state.area = null), zone: () => { state.zone = null; drawZone(); },
      reply: () => (state.reply = 'any'), stuck: () => (state.stuck = 0), edited: () => (state.edited = false),
      removed: () => (state.removed = 'hide'), inView: () => (state.inView = false), parking: () => (state.hideParking = false),
      cats: () => (state.cats = null),
    };
    if (k === 'all') Object.values(reset).forEach((f) => f()); else reset[k]?.();
    state.shown = PAGE; refresh();
  });

  $('#mapMode').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) { state.mapMode = b.dataset.mode; renderControls(); renderMap(); writeHash(); } });
  $('#exportBtn').addEventListener('click', (e) => { e.stopPropagation(); $('#exportMenu').hidden = !$('#exportMenu').hidden; });
  $('#exportMenu').addEventListener('click', (e) => { const b = e.target.closest('[data-export]'); if (b) { exportFile(b.dataset.export); $('#exportMenu').hidden = true; } });
  document.addEventListener('click', (e) => { if (!e.target.closest('#exportWrap')) $('#exportMenu').hidden = true; });

  const list = $('#list');
  list.addEventListener('click', (e) => { const c = e.target.closest('.card'); if (c) openDetail(c.dataset.id); });
  list.addEventListener('keydown', (e) => {
    const c = e.target.closest('.card');
    if (c && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); openDetail(c.dataset.id); }
  });
  list.addEventListener('mouseover', (e) => { const c = e.target.closest('.card'); if (c && c.dataset.id !== state.selected) setActiveMarker(c.dataset.id); });
  $('#listFooter').addEventListener('click', (e) => { if (e.target.closest('#more')) { state.shown += PAGE * 2; renderList(); } });
  const onScroll = () => {
    if (state.tab !== 'list') return;
    const el = matchMedia('(max-width: 860px)').matches ? document.scrollingElement : list;
    if (el.scrollTop + el.clientHeight > el.scrollHeight - 400 && state.shown < state.listItems.length) { state.shown += PAGE; renderList(); }
  };
  list.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('scroll', onScroll, { passive: true });

  document.addEventListener('click', async (e) => {
    const o = e.target.closest('[data-open]');
    if (o) { e.preventDefault(); openDetail(o.dataset.open); return; }
    const sa = e.target.closest('[data-set-area]');
    if (sa) { e.preventDefault(); $('#detail').close(); state.area = sa.dataset.setArea; state.tab = 'list'; state.shown = PAGE; refresh(); return; }
    const cp = e.target.closest('[data-copy]');
    if (cp) {
      try { await navigator.clipboard.writeText(cp.dataset.copy); toast(t('linkCopied')); }
      catch { prompt(t('copyPrompt'), cp.dataset.copy); }
    }
  });
  const dlg = $('#detail');
  dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });
  dlg.addEventListener('close', () => { if (miniMap) { miniMap.remove(); miniMap = null; } writeHash(); });

  $('#viewToggle').addEventListener('click', () => {
    document.body.classList.toggle('show-map');
    window.scrollTo(0, 0);
    if (document.body.classList.contains('show-map')) setTimeout(() => map.invalidateSize(), 50);
  });
  window.addEventListener('hashchange', () => {
    const id = new URLSearchParams(location.hash.slice(1)).get('id');
    if (id && !$('#detail').open) openFromHash(id);
  });

  // installable app
  let deferred = null;
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferred = e; $('#installBtn').hidden = false; });
  $('#installBtn').addEventListener('click', async () => { if (!deferred) return; deferred.prompt(); await deferred.userChoice; deferred = null; $('#installBtn').hidden = true; });
}

function showMapOnMobile() {
  if (state.tab !== 'list') { state.tab = 'list'; renderControls(); }
  if (matchMedia('(max-width: 860px)').matches) { document.body.classList.add('show-map'); window.scrollTo(0, 0); }
  setTimeout(() => map.invalidateSize(), 50);
}

/* ================= start ================= */
(async function main() {
  readHash();
  applyStatic();
  $('#repoLink').href = REPO;
  try { state.assets = await (await fetch('assets/sector3.json')).json(); } catch { state.assets = null; }
  initMap();
  drawZone();
  bind();
  renderControls();
  await loadMeta();
  await load();
  if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
})();
