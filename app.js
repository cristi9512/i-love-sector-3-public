/* Sesizări Sector 3 — client for the public CityCare API of Primăria Sector 3.
 *
 * The API (ASP.NET, CORS: *) is called directly from the browser with
 * form-encoded POSTs, so no backend is needed.
 *
 * Known quirks handled here:
 *  - IncidentRP.aspx returns at most the 1500 newest incidents per query,
 *    so long ranges are fetched in small date windows (split further if a
 *    window still hits the cap) and merged.
 *  - Errors come back as a bare number in the body (e.g. "9", "10").
 *  - Incidents at (almost) the same spot come back grouped in nested arrays.
 */
'use strict';

const API = 'https://iloves3.primarie3.ro/CityCareServicii';
const OFFICIAL = 'https://iloves3.primarie3.ro/citycareweb/';
const SERVER_CAP = 1500;
const WINDOW_DAYS = 2;     // days per request (≈300–500 incidents)
const CONCURRENCY = 4;
const PAGE = 50;
const PARKING_CATS = new Set(['2', '27', '200']);
const CENTER = [44.4229, 26.1686];

const STATUS = {
  open:    { color: 'var(--s-open)',    hex: '#f59e0b' },
  good:    { color: 'var(--s-good)',    hex: '#16a34a' },
  partial: { color: 'var(--s-partial)', hex: '#2563eb' },
  bad:     { color: 'var(--s-bad)',     hex: '#dc2626' },
  other:   { color: 'var(--s-other)',   hex: '#7c3aed' },
};
const STATUS_FILTER = {
  all: () => true,
  open: (k) => k === 'open',
  good: (k) => k === 'good' || k === 'partial',
  bad: (k) => k === 'bad',
  other: (k) => k === 'other',
};

const $ = (s) => document.querySelector(s);
const state = {
  days: 7, from: null, to: null,
  status: 'all', cats: null /* null = all */, q: '', hideParking: false, sort: 'new',
  all: [], byId: new Map(), categories: [],
  view: [], shown: PAGE, selected: null, loading: false, gen: 0,
};
const windowCache = new Map();

/* ---------------- helpers ---------------- */
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fold = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const pad = (n) => String(n).padStart(2, '0');
const apiDate = (d) => `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
const isoDate = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const dayDiff = (a, b) => Math.round((startOfDay(b) - startOfDay(a)) / 864e5);
const rtf = new Intl.RelativeTimeFormat('ro', { numeric: 'auto' });
const dtf = new Intl.DateTimeFormat('ro', { dateStyle: 'long', timeStyle: 'short' });

function relTime(d) {
  const s = (d - Date.now()) / 1000;
  const abs = Math.abs(s);
  if (abs < 60) return 'chiar acum';
  if (abs < 3600) return rtf.format(Math.round(s / 60), 'minute');
  if (abs < 86400) return rtf.format(Math.round(s / 3600), 'hour');
  if (abs < 86400 * 30) return rtf.format(Math.round(s / 86400), 'day');
  return rtf.format(Math.round(s / (86400 * 30)), 'month');
}

function parseDate(s) { // "15.11.2026 16:34:32"
  const m = /^(\d{2})\.(\d{2})\.(\d{4})\s+(\d{2}):(\d{2}):?(\d{2})?/.exec(s || '');
  return m ? new Date(+m[3], m[2] - 1, +m[1], +m[4], +m[5], +(m[6] || 0)) : new Date(NaN);
}

function statusOf(raw) {
  const [code, label = ''] = String(raw || '').split('|');
  const l = fold(label);
  let key;
  if (code === 'O') key = 'open';
  else if (l.includes('nefavorabil')) key = 'bad';
  else if (l.includes('partial')) key = 'partial';
  else if (l.includes('favorabil')) key = 'good';
  else key = 'other';
  let nice = label.replace(/^(închisă|deschisă)\.\s*/i, '').trim() || label;
  if (/^noua$/i.test(nice)) nice = 'Nouă';
  nice = nice.charAt(0).toUpperCase() + nice.slice(1).toLowerCase();
  return { key, label: nice, full: label };
}

/** "Nespecificat Registratura text…" → { from: null, text } */
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

function normalize(r) {
  const created = parseDate(r.createdon);
  const st = statusOf(r.status);
  const reply = parseReply(r.resolvereason);
  const desc = String(r.description || '').trim();
  return {
    id: r.incidentid,
    ticket: r.ticketnumber || '',
    reg: r.infocetnumber || '',
    category: r.titlu || r.category || 'Altele',
    catId: String(r.categoryid ?? ''),
    desc,
    edited: r.isedited === '1',
    lat: parseFloat(r.latitude),
    lng: parseFloat(r.longitude),
    created,
    status: st,
    reply,
    search: fold([r.ticketnumber, r.infocetnumber, r.titlu, desc, reply?.text, reply?.from].join(' \u0001 ')),
  };
}

function highlight(text, tokens) {
  const src = String(text ?? '');
  if (!tokens.length) return esc(src);
  // diacritic-insensitive matching while keeping original characters
  let folded = '';
  const map = [];
  for (let i = 0; i < src.length; i++) {
    const f = fold(src[i]);
    for (let j = 0; j < f.length; j++) { folded += f[j]; map.push(i); }
  }
  const ranges = [];
  for (const t of tokens) {
    let idx = 0;
    while ((idx = folded.indexOf(t, idx)) !== -1) {
      ranges.push([map[idx], map[idx + t.length - 1] + 1]);
      idx += t.length;
    }
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

function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.hidden = false;
  clearTimeout(toast._t);
  toast._t = setTimeout(() => (t.hidden = true), 2600);
}

/* ---------------- API ---------------- */
class ApiError extends Error {}

async function post(path, params, signal) {
  const res = await fetch(API + path, { method: 'POST', body: new URLSearchParams(params), signal });
  if (!res.ok) throw new ApiError(`HTTP ${res.status}`);
  const text = (await res.text()).trim();
  if (/^\d+$/.test(text)) throw new ApiError(`Cod eroare server ${text}`);
  return JSON.parse(text);
}

const flatten = (data) => (Array.isArray(data) ? data.flatMap((x) => (Array.isArray(x) ? x : [x])) : []);

async function fetchWindow(from, to, signal) {
  const key = apiDate(from) + '-' + apiDate(to);
  const cacheable = startOfDay(to) < startOfDay(new Date());
  if (cacheable && windowCache.has(key)) return windowCache.get(key);

  const data = flatten(await post('/IncidentRP.aspx', {
    lang: 'ro', categorycodelist: '', state: 'A',
    incidentfromdate: apiDate(from), incidenttodate: apiDate(to),
    incidentno: '', calltype: 'P',
  }, signal));

  let result = data;
  if (data.length >= SERVER_CAP && dayDiff(from, to) > 0) {
    // hit the server cap → split in halves
    const mid = addDays(from, Math.floor(dayDiff(from, to) / 2));
    const [a, b] = await Promise.all([fetchWindow(from, mid, signal), fetchWindow(addDays(mid, 1), to, signal)]);
    result = a.concat(b);
  } else if (data.length >= SERVER_CAP) {
    result.truncated = true;
  }
  if (cacheable) windowCache.set(key, result);
  return result;
}

async function fetchByTicket(ticket) {
  const data = flatten(await post('/IncidentRP.aspx', {
    lang: 'ro', categorycodelist: '', state: 'A', incidentfromdate: '', incidenttodate: '',
    incidentno: ticket, calltype: 'P',
  }));
  return data.map(normalize);
}

async function loadCategories() {
  try {
    const list = await post('/IncidentCategoryRP.aspx', { lang: 'ro' });
    state.categories = list.map((c) => ({ id: String(c.cod), name: c.name }));
  } catch (e) {
    console.warn('Categorii indisponibile', e);
  }
}

async function loadRange() {
  const gen = ++state.gen;
  const ctrl = new AbortController();
  loadRange.ctrl?.abort();
  loadRange.ctrl = ctrl;

  const today = startOfDay(new Date());
  let from, to;
  if (state.days === 'custom') {
    from = state.from; to = state.to;
  } else {
    to = today;
    from = addDays(today, -(state.days - 1));
    if (state.days === 1) from = addDays(today, -1);
  }
  if (!from || !to || from > to) return;

  const windows = [];
  for (let d = startOfDay(to); d >= from; d = addDays(d, -WINDOW_DAYS)) {
    const wFrom = addDays(d, -(WINDOW_DAYS - 1));
    windows.push([wFrom < from ? from : wFrom, d]); // newest first
  }

  state.loading = true;
  state.all = [];
  state.byId = new Map();
  state.shown = PAGE;
  let truncated = false, done = 0, failed = 0;
  setProgress(0.03);
  renderList(true);

  let i = 0;
  const worker = async () => {
    while (i < windows.length) {
      const [a, b] = windows[i++];
      try {
        const rows = await fetchWindow(a, b, ctrl.signal);
        if (gen !== state.gen) return;
        if (rows.truncated) truncated = true;
        for (const r of rows) {
          if (!state.byId.has(r.incidentid)) {
            const n = normalize(r);
            state.byId.set(n.id, n);
          }
        }
      } catch (e) {
        if (e.name === 'AbortError') return;
        failed++;
        console.error('Fereastra', apiDate(a), apiDate(b), e);
      }
      done++;
      if (gen !== state.gen) return;
      setProgress(done / windows.length);
      scheduleRefresh();
    }
  };
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, windows.length) }, worker));
  if (gen !== state.gen) return;

  state.loading = false;
  setProgress(null);
  refresh();
  if (failed) toast(`${failed} din ${windows.length} cereri au eșuat — unele sesizări pot lipsi.`);
  else if (truncated) toast('Unele zile au peste 1500 de sesizări; serverul a limitat rezultatele.');
  openFromHash();
}

function setProgress(p) {
  const el = $('#progress');
  if (p == null) { el.hidden = true; return; }
  el.hidden = false;
  el.firstElementChild.style.width = Math.max(3, p * 100) + '%';
}

let refreshQueued = false;
function scheduleRefresh() {
  if (refreshQueued) return;
  refreshQueued = true;
  setTimeout(() => { refreshQueued = false; refresh(); }, 250);
}

/* ---------------- filtering ---------------- */
function tokens() { return fold(state.q).split(/\s+/).filter(Boolean); }

function baseFilter(it, toks) {
  if (state.hideParking && PARKING_CATS.has(it.catId)) return false;
  if (state.cats && !state.cats.has(it.catId)) return false;
  for (const t of toks) if (!it.search.includes(t)) return false;
  return true;
}

function refresh() {
  state.all = [...state.byId.values()];
  const toks = tokens();
  const base = state.all.filter((it) => baseFilter(it, toks));
  const sf = STATUS_FILTER[state.status];
  const view = base.filter((it) => sf(it.status.key));
  if (state.sort === 'new') view.sort((a, b) => b.created - a.created);
  else if (state.sort === 'old') view.sort((a, b) => a.created - b.created);
  else view.sort((a, b) => b.desc.length - a.desc.length);
  state.view = view;
  renderStats(base);
  renderCategoryList();
  renderList();
  renderMap();
  writeHash();
}

/* ---------------- rendering: stats ---------------- */
function renderStats(base) {
  const c = { open: 0, good: 0, partial: 0, bad: 0, other: 0 };
  let replied = 0;
  const catCount = new Map();
  for (const it of base) {
    c[it.status.key]++;
    if (it.reply) replied++;
    catCount.set(it.category, (catCount.get(it.category) || 0) + 1);
  }
  const top = [...catCount].sort((a, b) => b[1] - a[1])[0];
  const pct = (n) => (base.length ? Math.round((n / base.length) * 100) : 0);
  const fmt = (n) => n.toLocaleString('ro');
  $('#stats').innerHTML = `
    <div class="stat clickable" data-status="all"><b>${fmt(base.length)}</b><span>sesizări${state.loading ? ' (se încarcă…)' : ''}</span></div>
    <div class="stat clickable" data-status="open"><b>${fmt(c.open)}</b><span><i class="dot s-open"></i>în lucru · ${pct(c.open)}%</span></div>
    <div class="stat clickable" data-status="good"><b>${fmt(c.good + c.partial)}</b><span><i class="dot s-good"></i>rezolvate · ${pct(c.good + c.partial)}%</span></div>
    <div class="stat clickable" data-status="bad"><b>${fmt(c.bad)}</b><span><i class="dot s-bad"></i>nefavorabil · ${pct(c.bad)}%</span></div>
    <div class="stat"><b>${pct(replied)}%</b><span>au răspuns public</span></div>
    <div class="stat"><b title="${esc(top?.[0] || '')}" style="font-size:15px;line-height:1.45;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(top?.[0] || '—')}</b><span>cea mai frecventă · ${fmt(top?.[1] || 0)}</span></div>`;
}

/* ---------------- rendering: categories ---------------- */
function renderCategoryList() {
  const counts = new Map();
  for (const it of state.all) counts.set(it.catId, (counts.get(it.catId) || 0) + 1);
  const known = new Map(state.categories.map((c) => [c.id, c.name]));
  for (const it of state.all) if (!known.has(it.catId)) known.set(it.catId, it.category);
  const cats = [...known].map(([id, name]) => ({ id, name, n: counts.get(id) || 0 }))
    .sort((a, b) => b.n - a.n || a.name.localeCompare(b.name, 'ro'));
  $('#catList').innerHTML = cats.map((c) => `
    <label><input type="checkbox" value="${esc(c.id)}" ${!state.cats || state.cats.has(c.id) ? 'checked' : ''}>
      <span>${esc(c.name)}</span><span class="count">${c.n || ''}</span></label>`).join('');
  const label = !state.cats ? 'Toate categoriile'
    : state.cats.size === 1 ? (known.get([...state.cats][0]) || '1 categorie')
    : `${state.cats.size} categorii`;
  $('#catLabel').textContent = label;
}

/* ---------------- rendering: list ---------------- */
function cardHTML(it, toks) {
  const sc = STATUS[it.status.key].color;
  const desc = it.desc ? highlight(it.desc, toks) : 'Fără descriere';
  return `<article class="card${state.selected === it.id ? ' active' : ''}" data-id="${esc(it.id)}" style="--status-color:${sc}" tabindex="0">
    <div class="card-top"><span class="card-cat">${highlight(it.category, toks)}</span>
      <time class="card-time" datetime="${it.created.toISOString?.() || ''}" title="${esc(dtf.format(it.created))}">${relTime(it.created)}</time></div>
    <p class="card-desc${it.desc ? '' : ' empty'}">${desc}</p>
    ${it.reply ? `<div class="card-reply"><b>Răspuns:</b> ${highlight(it.reply.text, toks)}</div>` : ''}
    <div class="card-meta"><span class="badge"><i class="dot"></i>${esc(it.status.label)}</span>
      <span class="chip">${highlight(it.ticket, toks)}</span>${it.edited ? '<span title="Descrierea a fost editată">✎ editată</span>' : ''}</div>
  </article>`;
}

function renderList(skeleton = false) {
  const list = $('#list');
  const footer = $('#listFooter');
  if (skeleton || (state.loading && !state.view.length)) {
    list.innerHTML = '<div class="skeleton"></div>'.repeat(5);
    footer.innerHTML = '';
    $('#resultCount').textContent = 'Se încarcă…';
    return;
  }
  const n = state.view.length;
  $('#resultCount').textContent = `${n.toLocaleString('ro')} ${n === 1 ? 'sesizare' : 'sesizări'}${state.loading ? ' · se încarcă…' : ''}`;
  if (!n) {
    list.innerHTML = `<div class="empty-state"><b>Nicio sesizare găsită</b>Încearcă alt interval, altă categorie sau alt termen de căutare.</div>`;
    footer.innerHTML = '';
    return;
  }
  const toks = tokens();
  list.innerHTML = state.view.slice(0, state.shown).map((it) => cardHTML(it, toks)).join('');
  footer.innerHTML = n > state.shown
    ? `<button class="btn btn-ghost" id="more">Afișează mai multe (${(n - state.shown).toLocaleString('ro')} rămase)</button>` : '';
}

/* ---------------- map ---------------- */
let map, cluster, miniMap;
const markers = new Map();

function tileLayer() {
  // Dark mode is done with a CSS filter on the tile pane (see styles.css).
  return L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  });
}

function initMap() {
  map = L.map('map', { zoomControl: true, preferCanvas: false }).setView(CENTER, 13);
  tileLayer().addTo(map);
  cluster = L.markerClusterGroup({
    chunkedLoading: true, showCoverageOnHover: false, maxClusterRadius: 45, spiderfyOnMaxZoom: true,
    iconCreateFunction: (c) => {
      const n = c.getChildCount();
      const size = n < 10 ? 34 : n < 100 ? 40 : 48;
      return L.divIcon({ html: `<div class="marker-cluster-custom" style="width:${size}px;height:${size}px">${n}</div>`, className: '', iconSize: [size, size] });
    },
  });
  map.addLayer(cluster);
}

function pinIcon(it, active) {
  return L.divIcon({
    className: '', iconSize: [16, 16], iconAnchor: [8, 8], popupAnchor: [0, -8],
    html: `<div class="pin${active ? ' active' : ''}" style="--status-color:${STATUS[it.status.key].hex}"></div>`,
  });
}

function popupHTML(it) {
  return `<div class="popup-cat">${esc(it.category)}</div>
    <span class="badge" style="--status-color:${STATUS[it.status.key].hex}"><i class="dot"></i>${esc(it.status.label)}</span>
    <div class="popup-desc">${esc(it.desc || 'Fără descriere')}</div>
    <div style="color:var(--muted);font-size:12px;margin-bottom:6px">${esc(it.ticket)} · ${relTime(it.created)}</div>
    <a href="#" class="popup-more" data-open="${esc(it.id)}">Vezi detalii →</a>`;
}

function renderMap() {
  if (!map) return;
  const wanted = new Set();
  const toAdd = [];
  for (const it of state.view) {
    if (!isFinite(it.lat) || !isFinite(it.lng)) continue;
    wanted.add(it.id);
    if (!markers.has(it.id)) {
      const m = L.marker([it.lat, it.lng], { icon: pinIcon(it, false), title: it.category });
      m.bindPopup(() => popupHTML(it), { maxWidth: 280 });
      m.on('click', () => selectCard(it.id, false));
      markers.set(it.id, m);
    }
    if (!cluster.hasLayer(markers.get(it.id))) toAdd.push(markers.get(it.id));
  }
  const toRemove = [];
  for (const [id, m] of markers) if (!wanted.has(id) && cluster.hasLayer(m)) toRemove.push(m);
  if (toRemove.length) cluster.removeLayers(toRemove);
  if (toAdd.length) cluster.addLayers(toAdd);
}

function setActiveMarker(id) {
  const prev = state.selected && markers.get(state.selected);
  const prevIt = state.selected && state.byId.get(state.selected);
  if (prev && prevIt) prev.setIcon(pinIcon(prevIt, false));
  state.selected = id;
  const m = id && markers.get(id);
  const it = id && state.byId.get(id);
  if (m && it) m.setIcon(pinIcon(it, true));
}

function focusOnMap(id) {
  const m = markers.get(id);
  if (!m || !cluster.hasLayer(m)) return;
  cluster.zoomToShowLayer(m, () => {
    if (map.getZoom() < 16) map.setView(m.getLatLng(), 16);
    m.openPopup();
  });
}

function selectCard(id, scroll = true) {
  setActiveMarker(id);
  document.querySelectorAll('.card.active').forEach((c) => c.classList.remove('active'));
  const card = document.querySelector(`.card[data-id="${CSS.escape(id)}"]`);
  if (card) {
    card.classList.add('active');
    if (scroll) card.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }
}

/* ---------------- detail dialog ---------------- */
const geoCache = new Map();
async function reverseGeocode(lat, lng) {
  const k = lat.toFixed(5) + ',' + lng.toFixed(5);
  if (geoCache.has(k)) return geoCache.get(k);
  const p = fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=18&accept-language=ro&lat=${lat}&lon=${lng}`)
    .then((r) => r.json())
    .then((j) => {
      const a = j.address || {};
      const street = [a.road || a.pedestrian || a.footway, a.house_number].filter(Boolean).join(' ');
      return [street, a.suburb || a.neighbourhood || a.quarter].filter(Boolean).join(', ') || j.display_name || null;
    })
    .catch(() => null);
  geoCache.set(k, p);
  return p;
}

function distanceM(a, b) {
  const R = 6371e3, rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad, dLng = (b.lng - a.lng) * rad;
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

function openDetail(id) {
  const it = state.byId.get(id);
  if (!it) return;
  selectCard(id);
  if (window.matchMedia('(min-width: 861px)').matches) focusOnMap(id);

  const sc = STATUS[it.status.key].hex;
  const nearby = state.all
    .filter((o) => o.id !== it.id && isFinite(o.lat) && distanceM(it, o) < 75)
    .sort((a, b) => b.created - a.created).slice(0, 6);
  const officialUrl = `${OFFICIAL}?c=${encodeURIComponent(it.ticket)}&lat=${it.lat}&lng=${it.lng}&zoom=18`;
  const gmaps = `https://www.google.com/maps/search/?api=1&query=${it.lat},${it.lng}`;

  $('#detailBody').innerHTML = `<div class="detail-body" style="--status-color:${sc}">
    <span class="badge"><i class="dot"></i>${esc(it.status.full || it.status.label)}</span>
    <h2>${esc(it.category)}</h2>
    <div class="sub">${esc(it.ticket)} · ${esc(dtf.format(it.created))} (${relTime(it.created)})</div>

    <h3>Descrierea sesizării</h3>
    <div class="text">${it.desc ? esc(it.desc) : '<span style="color:var(--muted)">Fără descriere</span>'}</div>
    ${it.edited ? '<div class="edited-note">* Descrierea a fost editată de primărie (ex. date personale anonimizate).</div>' : ''}

    <h3>Răspunsul primăriei${it.reply?.from ? ` · ${esc(it.reply.from)}` : ''}</h3>
    ${it.reply ? `<div class="reply">${esc(it.reply.text)}</div>`
      : `<div style="color:var(--muted)">${it.status.key === 'open' ? 'Sesizarea este încă în lucru. Nu există un răspuns public.' : 'Nu există un răspuns public.'}</div>`}

    <h3>Locație</h3>
    <div class="minimap" id="miniMap"></div>
    <dl class="kv" style="margin-top:12px">
      <dt>Adresă aprox.</dt><dd id="addr">se caută…</dd>
      <dt>Coordonate</dt><dd>${it.lat.toFixed(6)}, ${it.lng.toFixed(6)}</dd>
      <dt>Nr. sesizare</dt><dd>${esc(it.ticket)}</dd>
      ${it.reg ? `<dt>Nr. înregistrare</dt><dd>${esc(it.reg)}</dd>` : ''}
    </dl>

    ${nearby.length ? `<h3>Alte sesizări în apropiere (&lt; 75 m)</h3>
      <div style="display:flex;flex-direction:column;gap:6px">${nearby.map((o) => `
        <a href="#" data-open="${esc(o.id)}" style="color:inherit;text-decoration:none;display:flex;gap:8px;align-items:center;font-size:14px">
          <i class="dot" style="background:${STATUS[o.status.key].hex}"></i>
          <span style="flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis"><b style="font-weight:600">${esc(o.category)}</b> — ${esc(o.desc)}</span>
          <span style="color:var(--muted);font-size:12px;white-space:nowrap">${relTime(o.created)}</span></a>`).join('')}</div>` : ''}

    <div class="actions">
      <button class="btn btn-primary" data-copy="${esc(location.origin + location.pathname + '#id=' + encodeURIComponent(it.ticket))}">🔗 Copiază link</button>
      <a class="btn btn-outline" href="${esc(gmaps)}" target="_blank" rel="noopener">Google Maps</a>
      <a class="btn btn-outline" href="${esc(officialUrl)}" target="_blank" rel="noopener">Harta oficială</a>
    </div>
  </div>`;

  const dlg = $('#detail');
  if (!dlg.open) dlg.showModal();
  dlg.scrollTop = 0;
  history.replaceState(null, '', '#' + hashParams({ id: it.ticket }));

  if (miniMap) { miniMap.remove(); miniMap = null; }
  requestAnimationFrame(() => {
    miniMap = L.map('miniMap', { zoomControl: false, attributionControl: false, dragging: true, scrollWheelZoom: false })
      .setView([it.lat, it.lng], 17);
    tileLayer().addTo(miniMap);
    L.marker([it.lat, it.lng], { icon: pinIcon(it, true), interactive: false }).addTo(miniMap);
  });

  reverseGeocode(it.lat, it.lng).then((a) => {
    const el = $('#addr');
    if (el && $('#detail').open) el.textContent = a || 'indisponibilă';
  });
}

/* ---------------- URL state ---------------- */
function hashParams(extra = {}) {
  const p = new URLSearchParams();
  if (state.days === 'custom') { p.set('from', isoDate(state.from)); p.set('to', isoDate(state.to)); }
  else if (state.days !== 7) p.set('days', state.days);
  if (state.status !== 'all') p.set('status', state.status);
  if (state.cats) p.set('cats', [...state.cats].join(','));
  if (state.q) p.set('q', state.q);
  if (state.hideParking) p.set('noparking', '1');
  if (state.sort !== 'new') p.set('sort', state.sort);
  for (const [k, v] of Object.entries(extra)) p.set(k, v);
  return p.toString();
}
function writeHash() {
  if ($('#detail').open) return;
  history.replaceState(null, '', '#' + hashParams());
}
function readHash() {
  const p = new URLSearchParams(location.hash.slice(1));
  if (p.get('from') && p.get('to')) {
    state.days = 'custom';
    state.from = new Date(p.get('from') + 'T00:00');
    state.to = new Date(p.get('to') + 'T00:00');
  } else if (p.get('days')) state.days = Math.max(1, Math.min(366, parseInt(p.get('days'), 10) || 7));
  if (STATUS_FILTER[p.get('status')]) state.status = p.get('status');
  if (p.get('cats')) state.cats = new Set(p.get('cats').split(','));
  state.q = p.get('q') || '';
  state.hideParking = p.get('noparking') === '1';
  if (['new', 'old', 'long'].includes(p.get('sort'))) state.sort = p.get('sort');
}
async function openFromHash() {
  const ticket = new URLSearchParams(location.hash.slice(1)).get('id');
  if (!ticket) return;
  let it = state.all.find((x) => x.ticket === ticket);
  if (!it) {
    try {
      const [found] = await fetchByTicket(ticket);
      if (found) { state.byId.set(found.id, found); it = found; }
    } catch (e) { console.warn(e); }
  }
  if (it) openDetail(it.id);
  else toast(`Sesizarea ${ticket} nu a fost găsită.`);
}

/* ---------------- UI wiring ---------------- */
function syncControls() {
  document.querySelectorAll('#range button').forEach((b) =>
    b.setAttribute('aria-checked', String(b.dataset.days === String(state.days))));
  document.querySelectorAll('#status button').forEach((b) =>
    b.setAttribute('aria-checked', String(b.dataset.status === state.status)));
  $('#customRange').hidden = state.days !== 'custom';
  $('#q').value = state.q;
  $('#hideParking').checked = state.hideParking;
  $('#sort').value = state.sort;
  if (state.days === 'custom') { $('#from').value = isoDate(state.from); $('#to').value = isoDate(state.to); }
}

function bind() {
  $('#range').addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.days === 'custom') {
      state.days = 'custom';
      state.to = state.to || startOfDay(new Date());
      state.from = state.from || addDays(state.to, -13);
      syncControls();
      return;
    }
    state.days = +b.dataset.days;
    syncControls();
    loadRange();
  });
  $('#applyRange').addEventListener('click', () => {
    const f = $('#from').value, t = $('#to').value;
    if (!f || !t || f > t) return toast('Alege un interval valid.');
    state.from = new Date(f + 'T00:00');
    state.to = new Date(t + 'T00:00');
    if (dayDiff(state.from, state.to) > 366) return toast('Intervalul maxim este de un an.');
    loadRange();
  });
  $('#status').addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    state.status = b.dataset.status; state.shown = PAGE;
    syncControls(); refresh();
  });
  $('#stats').addEventListener('click', (e) => {
    const s = e.target.closest('[data-status]');
    if (!s) return;
    state.status = s.dataset.status; state.shown = PAGE;
    syncControls(); refresh();
  });
  let qt;
  $('#q').addEventListener('input', (e) => {
    clearTimeout(qt);
    qt = setTimeout(() => { state.q = e.target.value.trim(); state.shown = PAGE; refresh(); }, 200);
  });
  $('#q').addEventListener('keydown', async (e) => {
    // exact ticket number → look it up on the server even if outside the loaded range
    const v = e.target.value.trim().toUpperCase();
    if (e.key === 'Enter' && /^CAS-\d+$/.test(v) && !state.all.some((x) => x.ticket === v)) {
      history.replaceState(null, '', '#id=' + v);
      openFromHash();
    }
  });
  $('#hideParking').addEventListener('change', (e) => { state.hideParking = e.target.checked; state.shown = PAGE; refresh(); });
  $('#sort').addEventListener('change', (e) => { state.sort = e.target.value; state.shown = PAGE; refresh(); });

  const panel = $('#catPanel');
  $('#catBtn').addEventListener('click', (e) => {
    e.stopPropagation();
    panel.hidden = !panel.hidden;
    $('#catBtn').setAttribute('aria-expanded', String(!panel.hidden));
  });
  document.addEventListener('click', (e) => { if (!e.target.closest('#catDropdown')) panel.hidden = true; });
  $('#catList').addEventListener('change', () => {
    const boxes = [...document.querySelectorAll('#catList input')];
    const checked = boxes.filter((b) => b.checked).map((b) => b.value);
    state.cats = checked.length === boxes.length ? null : new Set(checked);
    state.shown = PAGE; refresh();
  });
  $('#catAll').addEventListener('click', () => { state.cats = null; refresh(); });
  $('#catNone').addEventListener('click', () => { state.cats = new Set(); refresh(); });

  $('#list').addEventListener('click', (e) => {
    const c = e.target.closest('.card');
    if (c) openDetail(c.dataset.id);
  });
  $('#list').addEventListener('keydown', (e) => {
    const c = e.target.closest('.card');
    if (c && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); openDetail(c.dataset.id); }
  });
  $('#list').addEventListener('mouseover', (e) => {
    const c = e.target.closest('.card');
    if (c && c.dataset.id !== state.selected) setActiveMarker(c.dataset.id);
  });
  $('#listFooter').addEventListener('click', (e) => {
    if (e.target.closest('#more')) { state.shown += PAGE * 2; renderList(); }
  });
  // infinite scroll
  const list = $('#list');
  const onScroll = () => {
    const el = matchMedia('(max-width: 860px)').matches ? document.scrollingElement : list;
    if (el.scrollTop + el.clientHeight > el.scrollHeight - 400 && state.shown < state.view.length) {
      state.shown += PAGE; renderList();
    }
  };
  list.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('scroll', onScroll, { passive: true });

  document.addEventListener('click', async (e) => {
    const o = e.target.closest('[data-open]');
    if (o) { e.preventDefault(); openDetail(o.dataset.open); return; }
    const cp = e.target.closest('[data-copy]');
    if (cp) {
      try { await navigator.clipboard.writeText(cp.dataset.copy); toast('Link copiat'); }
      catch { prompt('Copiază linkul:', cp.dataset.copy); }
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
}

(async function main() {
  readHash();
  syncControls();
  initMap();
  bind();
  await loadCategories();
  await loadRange();
})();
