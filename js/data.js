// Data loading: the archive (fast, has history), kept in its own repository
// and served by GitHub, plus live requests to the city's API for days the
// archive doesn't cover yet.
export const DATA_URL = 'https://raw.githubusercontent.com/cristi9512/i-love-sector-3-data/main/data/';

const API = 'https://iloves3.primarie3.ro/CityCareServicii/IncidentRP.aspx';
const SERVER_CAP = 1500;
const WINDOW_DAYS = 2;
const CONCURRENCY = 4;

/* ---------- day keys (Bucharest calendar, "YYYY-MM-DD") ---------- */
const dayFmt = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Bucharest', year: 'numeric', month: '2-digit', day: '2-digit' });
export const todayKey = () => dayFmt.format(new Date());
export const toDayKey = (date) => dayFmt.format(date);
export function addDays(key, n) {
  const d = new Date(key + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
export const daysBetween = (a, b) => Math.round((Date.parse(b + 'T00:00:00Z') - Date.parse(a + 'T00:00:00Z')) / 864e5);
const apiDate = (k) => `${k.slice(8, 10)}/${k.slice(5, 7)}/${k.slice(0, 4)}`;
function monthsBetween(a, b) {
  const out = [];
  let y = +a.slice(0, 4), m = +a.slice(5, 7);
  const end = b.slice(0, 7);
  for (;;) {
    const k = `${y}-${String(m).padStart(2, '0')}`;
    out.push(k);
    if (k >= end) return out;
    if (++m > 12) { m = 1; y++; }
  }
}

/* ---------- archive ---------- */
let meta = null;
// tickets removed on request (data/suppressed.json): hidden even in live data
let suppressed = new Set();
export const isSuppressed = (ticket) => suppressed.has(ticket);
export async function loadMeta() {
  const [m, sup] = await Promise.all([
    fetch(DATA_URL + 'meta.json', { cache: 'no-cache' }).then((r) => (r.ok ? r.json() : null)).catch(() => null),
    fetch(DATA_URL + 'suppressed.json', { cache: 'no-cache' }).then((r) => (r.ok ? r.json() : null)).catch(() => null),
  ]);
  meta = m;
  suppressed = new Set(sup?.tickets || []);
  return meta;
}
export const getMeta = () => meta;

const monthCache = new Map();
function loadMonth(m) {
  if (!monthCache.has(m)) {
    monthCache.set(m, fetch(`${DATA_URL}incidents/${m}.json`, { cache: 'no-cache' })
      .then((r) => (r.ok ? r.json() : []))
      .catch(() => { monthCache.delete(m); throw new Error('archive ' + m); }));
  }
  return monthCache.get(m);
}

/* ---------- live API ---------- */
class ApiError extends Error {}
async function post(params, signal) {
  const res = await fetch(API, { method: 'POST', body: new URLSearchParams(params), signal });
  if (!res.ok) throw new ApiError(`HTTP ${res.status}`);
  const text = (await res.text()).trim();
  if (/^\d+$/.test(text)) throw new ApiError(`server error code ${text}`);
  return JSON.parse(text);
}
const flatten = (d) => (Array.isArray(d) ? d.flatMap((x) => (Array.isArray(x) ? x : [x])) : []);
function parseCreated(s) {
  const m = /^(\d{2})\.(\d{2})\.(\d{4})\s+(\d{2}):(\d{2}):?(\d{2})?/.exec(s || '');
  return m ? `${m[3]}-${m[2]}-${m[1]}T${m[4]}:${m[5]}:${m[6] || '00'}` : null;
}
/** Live API row → same shape as an archive record. */
export function fromLive(r) {
  const [status, statusLabel = ''] = String(r.status || '').split('|');
  return {
    id: r.incidentid, ticket: r.ticketnumber || '', reg: r.infocetnumber || '',
    createdAt: parseCreated(r.createdon), category: r.titlu || r.category || '', categoryId: String(r.categoryid ?? ''),
    status, statusLabel, description: String(r.description ?? ''), reply: String(r.resolvereason ?? ''),
    edited: r.isedited === '1', lat: Number(r.latitude), lng: Number(r.longitude),
  };
}

const liveCache = new Map();
async function liveWindow(a, b, signal) {
  const key = a + '_' + b;
  const cacheable = b < addDays(todayKey(), -1);
  if (cacheable && liveCache.has(key)) return liveCache.get(key);
  const rows = flatten(await post({
    lang: 'ro', categorycodelist: '', state: 'A', incidentfromdate: apiDate(a), incidenttodate: apiDate(b),
    incidentno: '', calltype: 'P',
  }, signal));
  let result = { rows: rows.map(fromLive), truncated: false };
  const span = daysBetween(a, b);
  if (rows.length >= SERVER_CAP && span > 0) {
    const mid = addDays(a, Math.floor(span / 2));
    const [x, y] = await Promise.all([liveWindow(a, mid, signal), liveWindow(addDays(mid, 1), b, signal)]);
    result = { rows: x.rows.concat(y.rows), truncated: x.truncated || y.truncated };
  } else if (rows.length >= SERVER_CAP) result.truncated = true;
  if (cacheable) liveCache.set(key, result);
  return result;
}

export async function fetchTicket(ticket) {
  const rows = flatten(await post({
    lang: 'ro', categorycodelist: '', state: 'A', incidentfromdate: '', incidenttodate: '', incidentno: ticket, calltype: 'P',
  }));
  return rows.map(fromLive);
}

/**
 * Loads every record created between two day keys (inclusive).
 * onChunk(records, source) is called as data arrives; source is 'archive' or 'live'.
 */
export async function loadRange(from, to, { onChunk, onProgress, signal } = {}) {
  const tasks = [];
  const m = meta;
  const archiveTo = m?.lastRun ? toDayKey(new Date(m.lastRun)) : null;
  const archiveFrom = m?.coverageFrom || null;

  const liveSpans = [];
  if (archiveFrom && archiveTo) {
    const a = from > archiveFrom ? from : archiveFrom;
    const b = to < archiveTo ? to : archiveTo;
    if (a <= b) for (const month of monthsBetween(a, b)) tasks.push({ kind: 'archive', month });
    if (from < archiveFrom) liveSpans.push([from, to < archiveFrom ? to : addDays(archiveFrom, -1)]);
    // top-up: the archive's last day may be incomplete, and anything after it is missing
    const topFrom = addDays(archiveTo, -1);
    if (to >= topFrom) liveSpans.push([from > topFrom ? from : topFrom, to]);
  } else {
    liveSpans.push([from, to]);
  }
  for (const [a, b] of liveSpans) {
    for (let d = b; d >= a; d = addDays(d, -WINDOW_DAYS)) {
      const s = addDays(d, -(WINDOW_DAYS - 1));
      tasks.push({ kind: 'live', a: s < a ? a : s, b: d });
    }
  }

  let done = 0, failed = 0, truncated = false, liveUsed = false;
  let i = 0;
  const worker = async () => {
    while (i < tasks.length) {
      const task = tasks[i++];
      try {
        if (task.kind === 'archive') {
          const recs = await loadMonth(task.month);
          if (signal?.aborted) return;
          onChunk?.(recs.filter((r) => r.createdAt.slice(0, 10) >= from && r.createdAt.slice(0, 10) <= to), 'archive');
        } else {
          const res = await liveWindow(task.a, task.b, signal);
          if (signal?.aborted) return;
          liveUsed = true;
          if (res.truncated) truncated = true;
          onChunk?.(res.rows, 'live');
        }
      } catch (e) {
        if (e.name === 'AbortError' || signal?.aborted) return;
        failed++;
        console.error('load failed', task, e);
      }
      done++;
      onProgress?.(done / tasks.length);
    }
  };
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, tasks.length) || 1 }, worker));
  return { failed, total: tasks.length, truncated, liveUsed, archiveUsed: !!(archiveFrom && archiveTo) };
}
