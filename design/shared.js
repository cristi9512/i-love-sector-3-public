// Shared data + helpers for the three design prototypes (real data from ../data).
import { areaOf, distanceM, fromBucharest } from '../js/geo.js';

export { distanceM };

/* ---------- friendly category groups (plain language, one icon each) ---------- */
export const GROUPS = [
  { key: 'parking', name: 'Parcare', ids: ['1', '2', '12', '16', '26', '27', '200'], icon: 'car' },
  { key: 'streets', name: 'Străzi și trotuare', ids: ['4', '10', '32'], icon: 'cone' },
  { key: 'clean', name: 'Curățenie', ids: ['6', '20'], icon: 'trash' },
  { key: 'green', name: 'Parcuri și copaci', ids: ['3', '11', '14'], icon: 'tree' },
  { key: 'order', name: 'Ordine și liniște', ids: ['17', '19'], icon: 'megaphone' },
  { key: 'build', name: 'Clădiri și șantiere', ids: ['7', '8', '21', '22', '23'], icon: 'building' },
  { key: 'nature', name: 'Mediu și animale', ids: ['15', '18'], icon: 'leaf' },
  { key: 'admin', name: 'Acte și taxe', ids: ['5', '13', '24', '25'], icon: 'doc' },
  { key: 'other', name: 'Altele', ids: ['9'], icon: 'dots' },
];
const GROUP_OF = new Map(GROUPS.flatMap((g) => g.ids.map((id) => [id, g])));
export const groupOf = (catId) => GROUP_OF.get(String(catId)) || GROUPS[GROUPS.length - 1];

/* ---------- icons: 24×24, 1.8 stroke, round caps ---------- */
const P = {
  car: '<path d="M5 16.5h14v-4.2l-1.8-4.6a1.5 1.5 0 0 0-1.4-.9H8.2a1.5 1.5 0 0 0-1.4.9L5 12.3z"/><path d="M5 12.3h14"/><circle cx="8.2" cy="16.8" r="1.7"/><circle cx="15.8" cy="16.8" r="1.7"/>',
  cone: '<path d="M12 3.5 7.2 19h9.6z"/><path d="M8.7 14h6.6M10.2 9h3.6"/><path d="M4 20.5h16"/>',
  trash: '<path d="M4 7h16M9.5 7V4.5h5V7M6 7l1.1 13h9.8L18 7"/><path d="M10 11v5.5M14 11v5.5"/>',
  tree: '<path d="M12 21v-5.5"/><path d="M12 3a5 5 0 0 0-4.9 6A4 4 0 0 0 8 16.5h8A4 4 0 0 0 16.9 9 5 5 0 0 0 12 3z"/>',
  megaphone: '<path d="M4 10.2v3.6c0 .5.4.9.9.9H7l6 4.3V5L7 9.3H4.9c-.5 0-.9.4-.9.9z"/><path d="M16.5 9a4.2 4.2 0 0 1 0 6M19 6.5a7.6 7.6 0 0 1 0 11"/>',
  building: '<path d="M4 20.5V5.2L12 3v17.5M12 9h7.5v11.5"/><path d="M7 7.5h2M7 11h2M7 14.5h2M15 12.5h2M15 16h2"/><path d="M2.5 20.5h19"/>',
  leaf: '<path d="M5 19c0-8.5 5.5-13.6 15-14.5C19.6 13.7 14 19 5 19z"/><path d="M5 19 13 11"/>',
  doc: '<path d="M6.5 3h7.5l4 4v14h-11.5z"/><path d="M14 3v4h4M9.5 12h5M9.5 15.5h5"/>',
  dots: '<circle cx="6" cy="12" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="18" cy="12" r="1.4"/>',
  search: '<circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.4-4.4"/>',
  locate: '<circle cx="12" cy="12" r="3.5"/><path d="M12 2.5V5M12 19v2.5M2.5 12H5M19 12h2.5"/><circle cx="12" cy="12" r="7"/>',
  pin: '<path d="M12 21s-6.5-6-6.5-11a6.5 6.5 0 0 1 13 0c0 5-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.3"/>',
  close: '<path d="M6 6l12 12M18 6 6 18"/>',
  chevron: '<path d="m9 6 6 6-6 6"/>',
  down: '<path d="m6 9 6 6 6-6"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  back: '<path d="M19 12H5M11 6l-6 6 6 6"/>',
  map: '<path d="M9 4 3.5 6v14L9 18l6 2 5.5-2V4L15 6z"/><path d="M9 4v14M15 6v14"/>',
  list: '<path d="M8 6.5h12M8 12h12M8 17.5h12"/><circle cx="4" cy="6.5" r="1"/><circle cx="4" cy="12" r="1"/><circle cx="4" cy="17.5" r="1"/>',
  share: '<circle cx="6" cy="12" r="2.5"/><circle cx="17.5" cy="5.5" r="2.5"/><circle cx="17.5" cy="18.5" r="2.5"/><path d="m8.2 10.8 7-4M8.2 13.2l7 4"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  home: '<path d="M4 11 12 4l8 7"/><path d="M6 9.5V20h12V9.5"/><path d="M10 20v-5h4v5"/>',
  hall: '<path d="M3 20.5h18M5 20.5V10M19 20.5V10M9.7 20.5V10M14.3 20.5V10M2.5 10 12 4l9.5 6z"/>',
  chat: '<path d="M4.5 5.5h15v10h-8l-4.5 4v-4h-2.5z"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4"/>',
  repeat: '<path d="M17 3.5 20 6.5l-3 3"/><path d="M4 11.5v-1a4 4 0 0 1 4-4h12M7 20.5l-3-3 3-3"/><path d="M20 12.5v1a4 4 0 0 1-4 4H4"/>',
};
export function icon(name, size = 20, extra = '') {
  return `<svg class="ic" ${extra} width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[name] || P.dots}</svg>`;
}

/* ---------- status in plain words ---------- */
const fold = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
export function statusOf(code, label) {
  const l = fold(label);
  if (code === 'O') return { key: 'open', text: l.includes('noua') ? 'Nouă' : 'În lucru', step: l.includes('noua') ? 1 : 2 };
  if (l.includes('nefavorabil')) return { key: 'bad', text: 'Închisă fără rezolvare', step: 3 };
  if (l.includes('partial')) return { key: 'partial', text: 'Rezolvată parțial', step: 3 };
  if (l.includes('favorabil')) return { key: 'good', text: 'Rezolvată', step: 3 };
  if (l.includes('declinat')) return { key: 'other', text: 'Trimisă altei instituții', step: 3 };
  if (l.includes('intern')) return { key: 'other', text: 'Rezolvată intern', step: 3 };
  return { key: 'other', text: 'Închisă', step: 3 };
}

/* ---------- text helpers ---------- */
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const GREETING = /^\s*(bun[ăa]\s+(ziua|seara|dimineața|dimineata)|stimat[ăae]?\s+[^,!.\n]{0,40}|salut(are)?|hello|v[ăa]\s+rog|doamn[ăa][^,]{0,30}|domnule[^,]{0,30})[\s,!.:;-]*/i;
function clean(s) {
  let t = String(s || '').replace(/\s+/g, ' ').trim()
    // masked licence plates ("B........") → "B•••", so they don't look like sentence ends
    .replace(/\b([A-Z]{1,2})\s?\.{3,}/g, '$1•••');
  for (let i = 0; i < 2; i++) t = t.replace(GREETING, '');
  return t.charAt(0).toUpperCase() + t.slice(1);
}
/** First sentence; ignores initials ("T. Sebe"), abbreviations ("nr. 5", "str.") and numbers. */
function firstSentence(t) {
  const re = /[.!?]+\s+(?=[A-ZĂÂÎȘŞȚŢ„"])/g;
  let m;
  while ((m = re.exec(t))) {
    const before = t.slice(Math.max(0, m.index - 4), m.index);
    if (/(^|\s)[A-ZĂÂÎȘȚ]$/.test(before) || /(^|\s)(nr|str|bl|sc|ap|et|bd|ș\.a|art|alin)$/i.test(before)) continue;
    return t.slice(0, m.index + 1);
  }
  return t;
}
export const cleanText = clean;
/** A short, readable title from a resident's description. */
export function headline(desc, max = 90) {
  const t = clean(desc);
  if (!t) return 'Fără descriere';
  const first = firstSentence(t);
  const s = first.length >= 25 ? first : t;
  return s.length > max ? s.slice(0, s.lastIndexOf(' ', max - 1) > 40 ? s.lastIndexOf(' ', max - 1) : max - 1).replace(/[,;:\s]+$/, '') + '…' : s.replace(/[.\s]+$/, '');
}
export function replyText(raw) {
  const s = String(raw || '').trim();
  if (!s) return null;
  const m = /^(.{0,60}?)\s*Registratura\s+([\s\S]*)$/.exec(s);
  return clean(m ? m[2] : s);
}

/* ---------- dates ---------- */
const rtf = new Intl.RelativeTimeFormat('ro', { numeric: 'auto' });
export function ago(d) {
  const s = (d - Date.now()) / 1000, a = Math.abs(s);
  if (a < 60) return 'chiar acum';
  if (a < 3600) return rtf.format(Math.round(s / 60), 'minute');
  if (a < 86400) return rtf.format(Math.round(s / 3600), 'hour');
  if (a < 86400 * 30) return rtf.format(Math.round(s / 86400), 'day');
  return rtf.format(Math.round(s / (86400 * 30)), 'month');
}
export const fmtDate = (d, opts = { dateStyle: 'long', timeStyle: 'short' }) =>
  new Intl.DateTimeFormat('ro-RO', { ...opts, timeZone: 'Europe/Bucharest' }).format(d);
export function took(ms) {
  const m = Math.round(ms / 60000);
  if (m < 60) return `${Math.max(1, m)} min`;
  const h = Math.round(m / 60);
  if (h < 48) return `${h} ${h === 1 ? 'oră' : 'ore'}`;
  const d = Math.round(h / 24);
  return `${d} zile`;
}
export const n = (x) => Number(x).toLocaleString('ro-RO');

/* ---------- data ---------- */
const dayFmt = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Bucharest', year: 'numeric', month: '2-digit', day: '2-digit' });
const addDays = (k, d) => { const x = new Date(k + 'T00:00:00Z'); x.setUTCDate(x.getUTCDate() + d); return x.toISOString().slice(0, 10); };

export async function loadData(days = 7) {
  const [meta, assets] = await Promise.all([
    fetch('../data/meta.json', { cache: 'no-cache' }).then((r) => r.json()).catch(() => null),
    fetch('../assets/sector3.json').then((r) => r.json()),
  ]);
  const today = dayFmt.format(new Date());
  const from = addDays(today, -(days - 1));
  const months = [...new Set([from.slice(0, 7), today.slice(0, 7)])].filter((m) => meta?.totals?.months?.includes(m));
  const recs = (await Promise.all(months.map((m) => fetch(`../data/incidents/${m}.json`, { cache: 'no-cache' }).then((r) => r.json()))))
    .flat().filter((r) => !r.removedAt && r.createdAt.slice(0, 10) >= from);
  const items = recs.map((r) => {
    const created = fromBucharest(r.createdAt);
    const status = statusOf(r.status, r.statusLabel);
    let closedAt = null;
    if (r.firstStatus === 'O') {
      let cur = 'O';
      for (const [at, kind, val] of r.history || []) {
        if (kind !== 's') continue;
        const code = String(val).split('|')[0];
        if (!closedAt && cur === 'O' && code === 'C') closedAt = new Date(at);
        cur = code;
      }
    }
    return {
      id: r.id, ticket: r.ticket, reg: r.reg, created, day: r.createdAt.slice(0, 10),
      catId: r.categoryId, category: r.category, group: groupOf(r.categoryId),
      desc: clean(r.description), title: headline(r.description), reply: replyText(r.reply), edited: r.edited,
      status, lat: r.lat, lng: r.lng, area: areaOf(r.lat, r.lng, assets.areas), closedAt,
      history: r.history || [], firstSeen: r.firstSeen ? new Date(r.firstSeen) : null,
    };
  }).sort((a, b) => b.created - a.created);
  return { items, meta, assets, from, today };
}

/** Same kind of problem reported ≥3 times within ~60 m. */
export function hotspots(items, min = 3) {
  const cells = new Map();
  for (const it of items) {
    if (!isFinite(it.lat)) continue;
    const k = `${Math.round(it.lat / 0.00055)}:${Math.round(it.lng / 0.00077)}:${it.group.key}`;
    if (!cells.has(k)) cells.set(k, []);
    cells.get(k).push(it);
  }
  return [...cells.values()].filter((l) => l.length >= min).map((l) => ({
    items: l, n: l.length, group: l[0].group, area: l[0].area,
    lat: l.reduce((s, x) => s + x.lat, 0) / l.length, lng: l.reduce((s, x) => s + x.lng, 0) / l.length,
    open: l.filter((x) => x.status.key === 'open').length,
  })).sort((a, b) => b.n - a.n);
}

export function median(values) {
  const v = values.slice().sort((a, b) => a - b);
  if (!v.length) return null;
  const m = Math.floor(v.length / 2);
  return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2;
}

export const OFFICIAL = 'https://iloves3.primarie3.ro/citycareweb/';
export const osmTiles = () => L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
});
