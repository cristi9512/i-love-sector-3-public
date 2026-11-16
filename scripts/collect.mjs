#!/usr/bin/env node
/**
 * Collects incidents from the public CityCare API of Primăria Sector 3 and
 * stores them as JSON files in data/, recording every change it notices.
 *
 * Usage:
 *   node scripts/collect.mjs                       # regular run (recent days + one rotating older slice)
 *   node scripts/collect.mjs --from 2026-08-01 --to 2026-11-15   # backfill a range
 *
 * Output:
 *   data/incidents/YYYY-MM.json  every incident created in that month, current state
 *   data/changes/YYYY-MM.jsonl   one line per detected change (month of detection)
 *   data/meta.json               last run info and totals
 *
 * No dependencies; needs Node 18+.
 */
import { mkdir, readFile, readdir, writeFile, appendFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { areaOf, slugify, fromBucharest } from '../js/geo.js';

const API = 'https://iloves3.primarie3.ro/CityCareServicii/IncidentRP.aspx';
const SERVER_CAP = 1500;
const WINDOW_DAYS = 2;
const RECENT_DAYS = 4;       // always refreshed
const DEEP_DAYS = 180;       // older days refreshed in rotation (status updates)
const DEEP_SLICES = 24;      // ≈ one full pass per day if run hourly
const CONCURRENCY = 3;
const TRACKED = ['status', 'statusLabel', 'reply', 'description', 'edited', 'category', 'categoryId', 'lat', 'lng'];

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const DATA = path.join(ROOT, 'data');
const SITE_URL = process.env.SITE_URL || 'https://sesizari-sector3.vercel.app';
const FEED_SIZE = 60;

/* ---------- dates (Europe/Bucharest calendar days) ---------- */
const pad = (n) => String(n).padStart(2, '0');
const dayKey = (d) => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
const fromKey = (k) => new Date(k + 'T00:00:00Z');
const addDays = (d, n) => new Date(d.getTime() + n * 864e5);
const apiDate = (d) => `${pad(d.getUTCDate())}/${pad(d.getUTCMonth() + 1)}/${d.getUTCFullYear()}`;
function todayBucharest() {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Bucharest', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  return fromKey(parts);
}

/* ---------- API ---------- */
async function post(params, attempt = 1) {
  try {
    const res = await fetch(API, {
      method: 'POST',
      headers: { 'User-Agent': 'sesizari-sector3-archive (+https://sesizari-sector3.vercel.app)' },
      body: new URLSearchParams(params),
      signal: AbortSignal.timeout(60_000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = (await res.text()).trim();
    if (/^\d+$/.test(text)) throw new Error(`server error code ${text}`);
    return JSON.parse(text);
  } catch (e) {
    if (attempt >= 3) throw e;
    await new Promise((r) => setTimeout(r, 2000 * attempt));
    return post(params, attempt + 1);
  }
}

const flatten = (d) => (Array.isArray(d) ? d.flatMap((x) => (Array.isArray(x) ? x : [x])) : []);

/** Returns { rows, complete } — complete=false when the server cap truncated a single day. */
async function fetchWindow(from, to) {
  const rows = flatten(await post({
    lang: 'ro', categorycodelist: '', state: 'A',
    incidentfromdate: apiDate(from), incidenttodate: apiDate(to), incidentno: '', calltype: 'P',
  }));
  const days = Math.round((to - from) / 864e5);
  if (rows.length < SERVER_CAP) return { rows, complete: true };
  if (days === 0) return { rows, complete: false };
  const mid = addDays(from, Math.floor(days / 2));
  const [a, b] = await Promise.all([fetchWindow(from, mid), fetchWindow(addDays(mid, 1), to)]);
  return { rows: a.rows.concat(b.rows), complete: a.complete && b.complete };
}

/* ---------- normalisation ---------- */
function parseCreated(s) { // "15.11.2026 16:34:32" (local time) → "2026-11-15T16:34:32"
  const m = /^(\d{2})\.(\d{2})\.(\d{4})\s+(\d{2}):(\d{2}):?(\d{2})?/.exec(s || '');
  return m ? `${m[3]}-${m[2]}-${m[1]}T${m[4]}:${m[5]}:${m[6] || '00'}` : null;
}
function normalize(r) {
  const [status, statusLabel = ''] = String(r.status || '').split('|');
  return {
    id: r.incidentid,
    ticket: r.ticketnumber || '',
    reg: r.infocetnumber || '',
    createdAt: parseCreated(r.createdon),
    category: r.titlu || r.category || '',
    categoryId: String(r.categoryid ?? ''),
    status,
    statusLabel,
    description: String(r.description ?? ''),
    reply: String(r.resolvereason ?? ''),
    edited: r.isedited === '1',
    lat: Number(r.latitude),
    lng: Number(r.longitude),
  };
}

/**
 * Compact per-report history kept inside each record (the website reads it):
 *   [at, 's', 'C|Închisă. Rezolvată Favorabil']  status changed to
 *   [at, 'r']  reply added/changed     [at, 'd']  description edited
 *   [at, 'c', 'Străzi']  category changed  [at, 'x'] removed  [at, 'u'] restored
 * The full before/after values live in data/changes/*.jsonl.
 */
function historyFor(prev, r, diff, at) {
  const h = [...(prev.history || [])];
  if (diff.includes('status') || diff.includes('statusLabel')) h.push([at, 's', `${r.status}|${r.statusLabel}`]);
  if (diff.includes('reply')) h.push([at, 'r']);
  if (diff.includes('description') || diff.includes('edited')) h.push([at, 'd']);
  if (diff.includes('category') || diff.includes('categoryId')) h.push([at, 'c', r.category]);
  if (diff.includes('restored')) h.push([at, 'u']);
  return h;
}

/* ---------- storage ---------- */
const monthOf = (createdAt) => createdAt.slice(0, 7);
const monthFile = (m) => path.join(DATA, 'incidents', `${m}.json`);
const store = new Map();       // month -> Map(id -> record)
const dirty = new Set();

async function loadMonth(m) {
  if (store.has(m)) return store.get(m);
  const map = new Map();
  if (existsSync(monthFile(m))) {
    for (const r of JSON.parse(await readFile(monthFile(m), 'utf8'))) map.set(r.id, r);
  }
  store.set(m, map);
  return map;
}

function serialize(records) {
  // one record per line → small, readable git diffs
  return '[\n' + records.map((r) => JSON.stringify(r)).join(',\n') + '\n]\n';
}

async function saveDirty() {
  await mkdir(path.join(DATA, 'incidents'), { recursive: true });
  for (const m of dirty) {
    const recs = [...store.get(m).values()].sort((a, b) =>
      a.createdAt.localeCompare(b.createdAt) || a.ticket.localeCompare(b.ticket));
    await writeFile(monthFile(m), serialize(recs));
  }
}

/* ---------- main ---------- */
function parseArgs() {
  const a = process.argv.slice(2);
  const get = (k) => { const i = a.indexOf(k); return i >= 0 ? a[i + 1] : null; };
  return { from: get('--from'), to: get('--to') };
}

function planWindows() {
  const { from, to } = parseArgs();
  const today = todayBucharest();
  const ranges = [];
  if (from || to) {
    ranges.push([fromKey(from || dayKey(today)), fromKey(to || dayKey(today))]);
  } else {
    ranges.push([addDays(today, -(RECENT_DAYS - 1)), today]);
    // rotating slice of older days, chosen by the hour so each run covers a different part
    const span = DEEP_DAYS - RECENT_DAYS;
    const size = Math.ceil(span / DEEP_SLICES);
    const slice = new Date().getUTCHours() % DEEP_SLICES;
    const end = addDays(today, -(RECENT_DAYS + slice * size));
    const start = addDays(end, -(size - 1));
    ranges.push([start, end]);
  }
  const windows = [];
  for (const [a, b] of ranges) {
    for (let d = b; d >= a; d = addDays(d, -WINDOW_DAYS)) {
      const s = addDays(d, -(WINDOW_DAYS - 1));
      windows.push([s < a ? a : s, d]);
    }
  }
  return windows;
}

async function main() {
  const runAt = new Date().toISOString();
  const windows = planWindows();
  console.log(`Run ${runAt}: ${windows.length} windows`, windows.map(([a, b]) => `${dayKey(a)}..${dayKey(b)}`).join(', '));

  const changes = [];
  let added = 0, updated = 0, removed = 0, failed = 0, fetched = 0;
  // reports removed on request: never stored, and purged if already stored
  const suppressedFile = path.join(DATA, 'suppressed.json');
  const suppressed = new Set(existsSync(suppressedFile) ? JSON.parse(await readFile(suppressedFile, 'utf8')).tickets || [] : []);

  let i = 0;
  const results = [];
  await Promise.all(Array.from({ length: CONCURRENCY }, async () => {
    while (i < windows.length) {
      const w = windows[i++];
      try { results.push({ w, ...(await fetchWindow(...w)) }); }
      catch (e) { failed++; console.error(`Window ${dayKey(w[0])}..${dayKey(w[1])} failed:`, e.message); }
    }
  }));

  for (const { w: [from, to], rows, complete } of results) {
    fetched += rows.length;
    const seen = new Set();
    for (const raw of rows) {
      const r = normalize(raw);
      if (!r.id || !r.createdAt) continue;
      seen.add(r.id);
      if (suppressed.has(r.ticket)) continue;
      const month = await loadMonth(monthOf(r.createdAt));
      const prev = month.get(r.id);
      if (!prev) {
        month.set(r.id, { ...r, firstSeen: runAt, firstStatus: r.status, lastChanged: runAt, history: [] });
        dirty.add(monthOf(r.createdAt));
        added++;
        continue;
      }
      const diff = TRACKED.filter((k) => prev[k] !== r[k]);
      if (prev.removedAt) diff.push('restored');
      if (!diff.length) continue;
      for (const k of diff) {
        if (k === 'restored') changes.push({ at: runAt, ticket: r.ticket, field: 'removed', from: true, to: false });
        else changes.push({ at: runAt, ticket: r.ticket, field: k, from: prev[k], to: r[k] });
      }
      const next = { ...prev, ...r, lastChanged: runAt };
      delete next.removedAt;
      next.history = historyFor(prev, r, diff, runAt);
      month.set(r.id, next);
      dirty.add(monthOf(r.createdAt));
      updated++;
    }

    // incidents we stored for these days that the API no longer returns
    if (!complete) continue;
    const fromK = dayKey(from), toK = dayKey(to);
    const months = new Set();
    for (let d = from; d <= to; d = addDays(d, 1)) months.add(dayKey(d).slice(0, 7));
    for (const m of months) {
      if (!existsSync(monthFile(m)) && !store.has(m)) continue;
      const month = await loadMonth(m);
      for (const rec of month.values()) {
        const day = rec.createdAt.slice(0, 10);
        if (day < fromK || day > toK || seen.has(rec.id) || rec.removedAt) continue;
        rec.removedAt = runAt;
        rec.lastChanged = runAt;
        rec.history = [...(rec.history || []), [runAt, 'x']];
        changes.push({ at: runAt, ticket: rec.ticket, field: 'removed', from: false, to: true });
        dirty.add(m);
        removed++;
      }
    }
  }

  let purged = 0;
  if (suppressed.size) {
    const files = existsSync(path.join(DATA, 'incidents')) ? (await readdir(path.join(DATA, 'incidents'))).filter((f) => f.endsWith('.json')) : [];
    for (const f of files) {
      const m = f.slice(0, 7), month = await loadMonth(m);
      for (const [id, rec] of month) if (suppressed.has(rec.ticket)) { month.delete(id); dirty.add(m); purged++; }
    }
    // the change log is public in the repo too
    const dir = path.join(DATA, 'changes');
    for (const f of existsSync(dir) ? (await readdir(dir)).filter((x) => x.endsWith('.jsonl')) : []) {
      const lines = (await readFile(path.join(dir, f), 'utf8')).split('\n').filter(Boolean);
      const keep = lines.filter((l) => { try { return !suppressed.has(JSON.parse(l).ticket); } catch { return true; } });
      if (keep.length !== lines.length) { await writeFile(path.join(dir, f), keep.join('\n') + (keep.length ? '\n' : '')); purged++; }
    }
    if (purged) console.log(`Purged ${purged} suppressed record(s)/log file(s)`);
  }

  await saveDirty();

  if (changes.length) {
    await mkdir(path.join(DATA, 'changes'), { recursive: true });
    const file = path.join(DATA, 'changes', `${runAt.slice(0, 7)}.jsonl`);
    await appendFile(file, changes.map((c) => JSON.stringify(c)).join('\n') + '\n');
  }

  // meta: totals over all stored months
  let total = 0, open = 0, coverageFrom = null;
  const all = [];
  const months = existsSync(path.join(DATA, 'incidents')) ? (await readdir(path.join(DATA, 'incidents'))).filter((f) => f.endsWith('.json')).sort() : [];
  for (const f of months) {
    const m = await loadMonth(f.slice(0, 7));
    for (const r of m.values()) {
      if (!coverageFrom || r.createdAt < coverageFrom) coverageFrom = r.createdAt;
      if (r.removedAt) continue;
      total++; if (r.status === 'O') open++;
      all.push(r);
    }
  }
  const changeMonths = existsSync(path.join(DATA, 'changes'))
    ? (await readdir(path.join(DATA, 'changes'))).filter((f) => f.endsWith('.jsonl')).map((f) => f.slice(0, 7)).sort() : [];
  const metaFile = path.join(DATA, 'meta.json');
  const prevMeta = existsSync(metaFile) ? JSON.parse(await readFile(metaFile, 'utf8')) : {};
  const meta = {
    lastRun: runAt,
    lastChange: added || updated || removed ? runAt : prevMeta.lastChange ?? null,
    lastRunStats: { windows: windows.length, failedWindows: failed, fetched, added, updated, removed, changes: changes.length },
    totals: { incidents: total, open, months: months.map((f) => f.slice(0, 7)) },
    coverageFrom: coverageFrom ? coverageFrom.slice(0, 10) : null,
    changeMonths,
  };
  const changed = added || updated || removed || purged || !existsSync(metaFile) || process.argv.includes('--force');
  // only rewrite meta/feeds when data changed, so no-op runs produce no commit
  if (changed) {
    await writeFile(metaFile, JSON.stringify(meta, null, 2) + '\n');
    await writeFeeds(all);
  }

  console.log(JSON.stringify(meta.lastRunStats));
  if (failed === windows.length) {
    console.error('All requests failed.');
    process.exit(1);
  }
}

/* ---------- RSS feeds ---------- */
const xml = (s) => String(s ?? '').replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c]))
  // drop characters XML does not allow
  .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');

function rss(title, description, link, items) {
  const body = items.map((r) => {
    const reply = r.reply ? `\n\nRăspuns: ${r.reply.replace(/^Nespecificat\s+Registratura\s*/i, '')}` : '';
    return `  <item>
    <title>${xml(`${r.category} · ${r.statusLabel.replace(/^(Închisă|Deschisă)\.\s*/, '')}${r.area ? ` · ${r.area}` : ''}`)}</title>
    <link>${xml(`${SITE_URL}/#id=${encodeURIComponent(r.ticket)}`)}</link>
    <guid isPermaLink="false">${xml(r.ticket)}</guid>
    <pubDate>${fromBucharest(r.createdAt).toUTCString()}</pubDate>
    <category>${xml(r.category)}</category>
    <description>${xml(r.description + reply)}</description>
  </item>`;
  }).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
<channel>
  <title>${xml(title)}</title>
  <link>${xml(link)}</link>
  <description>${xml(description)}</description>
  <language>ro</language>
${body}
</channel>
</rss>
`;
}

async function writeFeeds(all) {
  const assets = JSON.parse(await readFile(path.join(ROOT, 'assets', 'sector3.json'), 'utf8'));
  const dir = path.join(DATA, 'feeds');
  await mkdir(dir, { recursive: true });
  const newest = all.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const byArea = new Map(assets.areas.map((a) => [a.name, []]));
  for (const r of newest) {
    r.area = areaOf(r.lat, r.lng, assets.areas);
    const list = byArea.get(r.area);
    if (list && list.length < FEED_SIZE) list.push(r);
  }
  await writeFile(path.join(dir, 'all.xml'), rss('Sesizări Sector 3', 'Cele mai noi sesizări din Sectorul 3', SITE_URL, newest.slice(0, FEED_SIZE)));
  const index = [{ name: 'Tot Sectorul 3', file: 'all.xml' }];
  for (const [name, items] of byArea) {
    const file = `${slugify(name)}.xml`;
    await writeFile(path.join(dir, file), rss(`Sesizări Sector 3 · ${name}`, `Cele mai noi sesizări din zona ${name}`, `${SITE_URL}/#area=${encodeURIComponent(name)}`, items));
    index.push({ name, file });
  }
  await writeFile(path.join(dir, 'index.json'), JSON.stringify(index, null, 1) + '\n');
  for (const r of all) delete r.area; // keep stored records unchanged
}

main().catch((e) => { console.error(e); process.exit(1); });
