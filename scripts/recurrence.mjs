// Recurring problems: places where the same kind of problem was reported again
// after a report there had been closed as resolved (fully or partly).
//
// Rule (kept neutral on purpose; see /despre):
// - same category, at most RADIUS_M metres apart;
// - the new report came after the earlier one was closed. When the archive saw
//   the closing, that time is used; otherwise (closings before 15 Nov 2026) the
//   new report must be at least GAP_DAYS after the earlier one;
// - within WINDOW_DAYS of the earlier report;
// - parking and stopping are left out (there "again" is usually another car);
// - coordinates shared by many reports are placeholders, not places, and are skipped.
import { areaOf, fromBucharest } from '../js/geo.js';
import { isParking, outcomeKind, OUTCOME_COLOR } from '../js/outcomes.js';

export const RADIUS_M = 25;
export const WINDOW_DAYS = 90;
export const GAP_DAYS = 3;
const PLACEHOLDER_MIN = 20;
const MAX_PLACES = 400;
const DAY = 864e5;

const resolved = (r) => r.status === 'C' && ['good', 'partial'].includes(outcomeKind(r.status, r.statusLabel));
const colour = (r) => OUTCOME_COLOR[outcomeKind(r.status, r.statusLabel)];
function dist(a, b) {
  const x = ((b.lng - a.lng) * Math.PI / 180) * Math.cos(((a.lat + b.lat) / 2) * Math.PI / 180);
  const y = ((b.lat - a.lat) * Math.PI / 180);
  return Math.hypot(x, y) * 6371e3;
}
/** When the archive saw the report close, from its history ([time, 's', 'C|…']). */
function closedAt(r) {
  for (const [at, kind, val] of r.history || []) if (kind === 's' && String(val).startsWith('C')) return Date.parse(at);
  return null;
}

export function computeRecurrence(records, areas, now = Date.now()) {
  const coordCount = new Map();
  for (const r of records) {
    const k = `${r.lat?.toFixed?.(6)},${r.lng?.toFixed?.(6)}`;
    coordCount.set(k, (coordCount.get(k) || 0) + 1);
  }
  const placeholder = (r) => coordCount.get(`${r.lat.toFixed(6)},${r.lng.toFixed(6)}`) >= PLACEHOLDER_MIN;
  const civic = records.filter((r) => !r.removedAt && !isParking(r.categoryId) && Number.isFinite(r.lat) && Number.isFinite(r.lng) && !placeholder(r))
    .map((r) => ({ ...r, t: fromBucharest(r.createdAt).getTime(), area: areaOf(r.lat, r.lng, areas) }));

  // spatial grid: cells a bit larger than the radius, so neighbours are in the 3×3 block
  const cell = (r) => [Math.floor(r.lat / 0.0003), Math.floor(r.lng / 0.0004)];
  const grid = new Map();
  for (const r of civic) { const k = cell(r).join(':'); if (!grid.has(k)) grid.set(k, []); grid.get(k).push(r); }

  // union-find over reports linked by a "came back" pair
  const parent = new Map();
  const find = (x) => { while (parent.get(x) !== x) { parent.set(x, parent.get(parent.get(x))); x = parent.get(x); } return x; };
  const union = (a, b) => { for (const x of [a, b]) if (!parent.has(x)) parent.set(x, x); parent.set(find(a), find(b)); };

  const again = new Map();             // earlier report id → number of later reports
  const cameBack = new Set();          // later report ids
  const byCat = {}, byArea = {};
  let resolvedN = 0, recurredN = 0;
  const complete = (a) => now - a.t >= WINDOW_DAYS * DAY; // the full 90 days have passed

  for (const a of civic) {
    if (!resolved(a)) continue;
    const closed = closedAt(a);
    const from = closed ?? a.t + GAP_DAYS * DAY, to = a.t + WINDOW_DAYS * DAY;
    const [ci, cj] = cell(a);
    let hits = 0;
    for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) {
      for (const b of grid.get(`${ci + i}:${cj + j}`) || []) {
        if (b === a || b.categoryId !== a.categoryId || b.t <= from || b.t > to || dist(a, b) > RADIUS_M) continue;
        hits++; cameBack.add(b.id); union(a.id, b.id);
      }
    }
    if (hits) again.set(a.id, hits);
    if (complete(a)) {
      resolvedN++; if (hits) recurredN++;
      const c = (byCat[a.categoryId] ??= { name: a.category, resolved: 0, recurred: 0 }); c.resolved++; if (hits) c.recurred++;
      if (a.area) { const g = (byArea[a.area] ??= { resolved: 0, recurred: 0 }); g.resolved++; if (hits) g.recurred++; }
    }
  }

  // places = connected groups of linked reports
  const groups = new Map();
  for (const r of civic) {
    if (!parent.has(r.id)) continue;
    const root = find(r.id);
    if (!groups.has(root)) groups.set(root, []);
    groups.get(root).push(r);
  }
  const places = [...groups.values()].map((list) => {
    list.sort((x, y) => x.t - y.t);
    const lat = list.reduce((s, r) => s + r.lat, 0) / list.length, lng = list.reduce((s, r) => s + r.lng, 0) / list.length;
    return {
      cat: list[0].categoryId, name: list[0].category, area: list[0].area || null,
      lat: +lat.toFixed(6), lng: +lng.toFixed(6),
      n: list.length, again: list.filter((r) => cameBack.has(r.id)).length,
      first: list[0].createdAt.slice(0, 10), last: list[list.length - 1].createdAt.slice(0, 10),
      open: list.filter((r) => r.status === 'O').length,
      // [ticket, created, colour key, came back after a closed report?]
      reports: list.map((r) => [r.ticket, r.createdAt, colour(r), cameBack.has(r.id) ? 1 : 0]),
    };
  }).sort((x, y) => y.again - x.again || y.n - x.n || (y.last > x.last ? 1 : -1));

  return {
    asOf: new Date(now).toISOString(),
    rule: { radiusM: RADIUS_M, windowDays: WINDOW_DAYS, gapDays: GAP_DAYS, placeholderMin: PLACEHOLDER_MIN },
    totals: { places: places.length, cameBack: cameBack.size, resolved: resolvedN, recurred: recurredN },
    byCategory: byCat, byArea,
    places: places.slice(0, MAX_PLACES),
  };
}
