// Geography helpers shared by the website and scripts/collect.mjs (no DOM use).

/** Distance in metres between two {lat,lng} points. */
export function distanceM(a, b) {
  const R = 6371e3, rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad, dLng = (b.lng - a.lng) * rad;
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

/** Ray-casting point-in-polygon; polygon = [[lat,lng], ...]. */
export function insidePolygon(lat, lng, polygon) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [yi, xi] = polygon[i], [yj, xj] = polygon[j];
    if ((yi > lat) !== (yj > lat) && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/**
 * Neighbourhood of a point: the closest area centre (a Voronoi split of the
 * sector). Areas come from assets/sector3.json.
 */
export function areaOf(lat, lng, areas) {
  if (!isFinite(lat) || !isFinite(lng) || !areas?.length) return null;
  // equirectangular approximation is plenty for ranking a few km
  const k = Math.cos((lat * Math.PI) / 180);
  let best = null, bestD = Infinity;
  for (const a of areas) {
    const d = (a.lat - lat) ** 2 + ((a.lng - lng) * k) ** 2;
    if (d < bestD) { bestD = d; best = a.name; }
  }
  return best;
}

export function slugify(s) {
  return String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

/**
 * Converts a Bucharest wall-clock time "YYYY-MM-DDTHH:MM:SS" (how the API
 * reports createdon) into a real Date, handling summer time.
 */
const bucharestFmt = new Intl.DateTimeFormat('en-US', {
  timeZone: 'Europe/Bucharest', hourCycle: 'h23',
  year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit',
});
function bucharestOffsetMs(utcMs) {
  const p = Object.fromEntries(bucharestFmt.formatToParts(new Date(utcMs)).map((x) => [x.type, x.value]));
  return Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second) - utcMs;
}
export function fromBucharest(local) {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})/.exec(local || '');
  if (!m) return new Date(NaN);
  const wall = Date.UTC(+m[1], m[2] - 1, +m[3], +m[4], +m[5], +m[6]);
  let utc = wall - bucharestOffsetMs(wall);
  utc = wall - bucharestOffsetMs(utc); // second pass settles DST edges
  return new Date(utc);
}
