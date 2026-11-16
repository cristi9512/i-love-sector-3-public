// Insights tab: KPIs, charts, hotspots, template replies, recent changes, RSS.
import { t, getLang, locale, statusText, duration } from './i18n.js';
import { esc, fold, fmtN, relTime, catLabel, statusKey } from './app.js';
import { slugify } from './geo.js';
import { ic } from './icons.js';
import { addDays, daysBetween } from './data.js';

const ORDER = ['good', 'partial', 'bad', 'other', 'open']; // validated adjacency order
const LEGEND = { good: 'legendGood', partial: 'legendPartial', bad: 'legendBad', other: 'legendOther', open: 'legendOpen' };
const pct = (n, d) => (d ? Math.round((n / d) * 100) : 0);
function quantile(sorted, q) {
  if (!sorted.length) return null;
  const pos = (sorted.length - 1) * q, lo = Math.floor(pos), hi = Math.ceil(pos);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}
const tipAttr = (html) => `data-tip="${esc(html)}"`;
const legendHTML = (list) => `<div class="viz-legend">${ORDER.filter((k) => !list || list.some((it) => it.status === k)).map((k) => `<span><i class="dot" style="background:var(--c-${k})"></i>${t(LEGEND[k])}</span>`).join('')}</div>`;
const tableHTML = (head, rows) => `<details class="viz-table"><summary>${t('asTable')}</summary><div class="table-wrap"><table>
  <thead><tr>${head.map((h) => `<th>${esc(h)}</th>`).join('')}</tr></thead>
  <tbody>${rows.map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div></details>`;
const card = (title, body, extra = '') => `<section class="viz-card ${extra}"><h2>${esc(title)}</h2>${body}</section>`;
const breakdownTip = (title, c, total) => `<b>${esc(title)}</b><br>${fmtN(total)} ${t('reportsN')}<br>` +
  ORDER.filter((k) => c[k]).map((k) => `<i class="dot" style="background:var(--c-${k})"></i> ${t(LEGEND[k])}: ${fmtN(c[k])}`).join('<br>');
const blank = () => ({ good: 0, partial: 0, bad: 0, other: 0, open: 0 });
const groupCount = (list, key) => { const m = new Map(); for (const it of list) { const k = key(it); m.set(k, (m.get(k) || 0) + 1); } return m; };

/* ---------- KPIs ---------- */
// f.status is the status filter ('all' or one outcome); f.all / f.prevAll are
// the same reports before that filter, so shares can be "of all reports".
function kpis(base, prev, f) {
  const s = (list) => {
    const c = blank(); let replied = 0;
    for (const it of list) { c[it.status]++; if (it.reply) replied++; }
    const ttc = list.filter((it) => it.closedAt).map((it) => it.closedAt - it.created).sort((a, b) => a - b);
    return { n: list.length, c, resolved: pct(c.good + c.partial, list.length), rejected: pct(c.bad, list.length),
      open: c.open, replied: pct(replied, list.length), ttc: quantile(ttc, 0.5), ttcN: ttc.length };
  };
  const a = s(base), b = prev ? s(prev) : null;
  const delta = (cur, old, kind) => {
    if (!b || old == null) return '';
    if (kind === 'count') {
      if (!old) return '';
      const d = Math.round(((cur - old) / old) * 100);
      return `<span class="delta">${d > 0 ? '▲' : d < 0 ? '▼' : '='} ${Math.abs(d)}%</span>`;
    }
    const d = cur - old;
    return `<span class="delta">${d > 0 ? '▲' : d < 0 ? '▼' : '='} ${Math.abs(d)} pp</span>`;
  };
  const tile = (value, label, d = '', sub = '') => `<div class="kpi"><b>${value}</b><span>${esc(label)}</span>${d}${sub ? `<small>${esc(sub)}</small>` : ''}</div>`;
  const ttcTile = () => tile(a.ttc != null ? esc(duration(a.ttc)) : '—', t('kTtc'), '', a.ttc != null ? t('kN', { n: fmtN(a.ttcN) }) : t('kTtcNone'));
  const note = `<p class="fine">${esc(b ? t('iVsPrev') : t('iNoPrev'))}</p>`;

  if (f.status === 'all') {
    return `<div class="kpis">
    ${tile(fmtN(a.n), t('kTotal'), delta(a.n, b?.n, 'count'))}
    ${tile(a.resolved + '%', t('kResolved'), delta(a.resolved, b?.resolved))}
    ${tile(a.rejected + '%', t('kRejected'), delta(a.rejected, b?.rejected))}
    ${tile(fmtN(a.open), t('kOpen'), delta(a.open, b?.open, 'count'))}
    ${tile(a.replied + '%', t('kReplied'), delta(a.replied, b?.replied))}
    ${ttcTile()}
  </div>${note}`;
  }
  // one status selected: count, its share of everything, and what is still informative for it
  const share = pct(a.n, f.all.length), prevShare = b && f.prevAll ? pct(b.n, f.prevAll.length) : null;
  const tiles = [
    tile(fmtN(a.n), t('kTotalOf', { s: t(f.label) }), delta(a.n, b?.n, 'count')),
    tile(share + '%', t('kShareAll', { n: fmtN(f.all.length) }), delta(share, prevShare)),
  ];
  if (f.status === 'good') tiles.push(tile(fmtN(a.c.partial), t('kPartial'), delta(a.c.partial, b?.c.partial, 'count')));
  // reports in progress never have a public reply yet, so that tile would always read 0%
  if (f.status !== 'open') tiles.push(tile(a.replied + '%', t('kReplied'), delta(a.replied, b?.replied)));
  if (f.status === 'open') {
    const now = Date.now();
    const ages = base.map((it) => now - it.created).sort((x, y) => x - y);
    const old7 = base.filter((it) => now - it.created > 7 * 864e5).length;
    tiles.push(tile(ages.length ? esc(duration(quantile(ages, 0.5))) : '—', t('kAge')));
    tiles.push(tile(fmtN(old7), t('kOld7')));
  } else tiles.push(ttcTile());
  return `<div class="kpis">${tiles.join('')}</div>${note}`;
}

/* ---------- time series (stacked bars) ---------- */
function nice(max) {
  if (max <= 5) return 5;
  const p = 10 ** Math.floor(Math.log10(max)), f = max / p;
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * p;
}
function topRounded(x, y, w, h, r) {
  r = Math.min(r, w / 2, h);
  return `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z`;
}
function series(base, range) {
  const hourly = range.hours || range.len <= 2;
  const buckets = [];
  if (hourly) {
    const now = Date.now();
    const start = range.hours ? now - 24 * 3600e3 : Date.parse(range.from + 'T00:00:00+02:00');
    const end = range.hours ? now : Date.parse(addDays(range.to, 1) + 'T00:00:00+02:00');
    const first = Math.floor(start / 3600e3) * 3600e3;
    for (let h = first; h < end; h += 3600e3) buckets.push({ key: h, c: blank(), n: 0 });
    const idx = new Map(buckets.map((b, i) => [b.key, i]));
    for (const it of base) {
      const i = idx.get(Math.floor(it.created / 3600e3) * 3600e3);
      if (i != null) { buckets[i].c[it.status]++; buckets[i].n++; }
    }
  } else {
    for (let d = range.from; d <= range.to; d = addDays(d, 1)) buckets.push({ key: d, c: blank(), n: 0 });
    const idx = new Map(buckets.map((b, i) => [b.key, i]));
    for (const it of base) {
      const i = idx.get(it.day);
      if (i != null) { buckets[i].c[it.status]++; buckets[i].n++; }
    }
  }
  const fmtKey = hourly
    ? (k) => new Intl.DateTimeFormat(locale(), { weekday: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Bucharest' }).format(new Date(k))
    : (k) => new Intl.DateTimeFormat(locale(), { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(new Date(k + 'T12:00:00Z'));

  const W = 820, H = 240, L = 40, R = 8, T = 10, B = 26, pw = W - L - R, ph = H - T - B;
  const max = nice(Math.max(1, ...buckets.map((b) => b.n)));
  const n = buckets.length, slot = pw / n, gap = slot > 6 ? 2 : slot > 3 ? 1 : 0, bw = Math.max(1, slot - gap);
  let svg = '';
  for (let g = 0; g <= 4; g++) {
    const v = (max / 4) * g, y = T + ph - (v / max) * ph;
    svg += `<line x1="${L}" x2="${W - R}" y1="${y}" y2="${y}" class="grid"/><text x="${L - 6}" y="${y + 4}" class="axis" text-anchor="end">${fmtN(v)}</text>`;
  }
  const every = Math.ceil(n / 7);
  buckets.forEach((b, i) => {
    const x = L + i * slot + gap / 2;
    let y = T + ph;
    const present = ORDER.filter((k) => b.c[k]);
    present.forEach((k, j) => {
      const h = (b.c[k] / max) * ph;
      const segGap = j < present.length - 1 && h > 3 ? 1 : 0; // 2px surface gap shared between neighbours
      y -= h;
      const isTop = j === present.length - 1;
      svg += isTop && bw >= 6 ? `<path d="${topRounded(x, y, bw, h, 3)}" fill="var(--c-${k})"/>`
        : `<rect x="${x}" y="${y + segGap}" width="${bw}" height="${Math.max(0, h - segGap)}" fill="var(--c-${k})"/>`;
    });
    svg += `<rect x="${L + i * slot}" y="${T}" width="${slot}" height="${ph}" class="hit" ${tipAttr(breakdownTip(fmtKey(b.key), b.c, b.n))}/>`;
    if (i % every === 0) svg += `<text x="${x + bw / 2}" y="${H - 8}" class="axis" text-anchor="middle">${esc(fmtKey(b.key))}</text>`;
  });
  const chart = `${legendHTML(base)}<svg class="viz-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(t(hourly ? 'cHourly' : 'cDaily'))}">${svg}</svg>`;
  const table = tableHTML([t(hourly ? 'hour' : 'day'), t('count'), ...ORDER.map((k) => t(LEGEND[k]))],
    buckets.map((b) => [fmtKey(b.key), fmtN(b.n), ...ORDER.map((k) => fmtN(b.c[k]))]));
  return card(t(hourly ? 'cHourly' : 'cDaily'), chart + table, 'wide');
}

/* ---------- outcome by category ---------- */
function byCategory(base, f) {
  const totals = groupCount(f.all, (it) => it.catId);
  const map = new Map();
  for (const it of base) {
    if (!map.has(it.catId)) map.set(it.catId, { id: it.catId, name: catLabel(it), c: blank(), n: 0 });
    const g = map.get(it.catId); g.c[it.status]++; g.n++;
  }
  const rows = [...map.values()].sort((a, b) => b.n - a.n);
  const top = rows.slice(0, 12);
  const body = top.map((g) => `<div class="hbar-row">
      <button class="hbar-label" data-cat="${esc(g.id)}" title="${esc(g.name)}"><span>${esc(g.name)}</span><small>${fmtN(g.n)} · ${f.status === 'all' ? t('resolvedPct', { p: pct(g.c.good + g.c.partial, g.n) }) : t('shareCat', { p: pct(g.n, totals.get(g.id)) })}</small></button>
      <div class="hbar-track stacked">${ORDER.filter((k) => g.c[k]).map((k) => `<span style="flex:${g.c[k]};background:var(--c-${k})" ${tipAttr(breakdownTip(g.name, g.c, g.n))}></span>`).join('')}</div>
    </div>`).join('');
  const table = tableHTML([t('category'), t('count'), ...ORDER.map((k) => t(LEGEND[k]))],
    rows.map((g) => [g.name, fmtN(g.n), ...ORDER.map((k) => `${fmtN(g.c[k])} (${pct(g.c[k], g.n)}%)`)]));
  return card(t('cByCat'), legendHTML(base) + `<div class="hbars">${body || `<p class="muted">—</p>`}</div>` + table);
}

/* ---------- hour × weekday ---------- */
function heat(base) {
  const grid = Array.from({ length: 7 }, () => new Array(24).fill(0));
  for (const it of base) {
    const wd = (new Date(it.day + 'T12:00:00Z').getUTCDay() + 6) % 7; // Monday first
    grid[wd][+it.createdAt.slice(11, 13)]++;
  }
  const max = Math.max(1, ...grid.flat());
  const step = (v) => (v === 0 ? 0 : Math.min(5, Math.ceil((v / max) * 5)));
  const days = t('weekdays');
  let cells = '<div></div>' + Array.from({ length: 24 }, (_, h) => `<div class="hm-h">${h % 3 === 0 ? h : ''}</div>`).join('');
  grid.forEach((row, d) => {
    cells += `<div class="hm-d">${days[d]}</div>` + row.map((v, h) =>
      `<div class="hm-cell s${step(v)}" ${tipAttr(`<b>${days[d]} ${String(h).padStart(2, '0')}:00–${String(h + 1).padStart(2, '0')}:00</b><br>${fmtN(v)} ${t('reportsN')}`)}></div>`).join('');
  });
  const legend = `<div class="hm-legend"><span>0</span>${[1, 2, 3, 4, 5].map((s) => `<i class="hm-cell s${s}"></i>`).join('')}<span>${fmtN(max)}</span></div>`;
  const table = tableHTML([t('hour'), ...days], Array.from({ length: 24 }, (_, h) => [`${h}:00`, ...grid.map((r) => fmtN(r[h]))]));
  return card(t('cHeat'), `<div class="hm">${cells}</div>${legend}${table}`);
}

/* ---------- neighbourhoods ---------- */
function areas(base, f) {
  const totals = groupCount(f.all, (it) => it.area);
  const map = new Map();
  for (const it of base) {
    if (!it.area) continue;
    if (!map.has(it.area)) map.set(it.area, { name: it.area, n: 0, good: 0, open: 0 });
    const g = map.get(it.area); g.n++;
    if (it.status === 'good' || it.status === 'partial') g.good++;
    if (it.status === 'open') g.open++;
  }
  const rows = [...map.values()].sort((a, b) => b.n - a.n);
  const max = Math.max(1, ...rows.map((r) => r.n));
  const sub = (g) => (f.status === 'all'
    ? [t('resolvedPct', { p: pct(g.good, g.n) }), t('openN', { n: fmtN(g.open) })]
    : [t('shareArea', { p: pct(g.n, totals.get(g.name)) })]);
  const body = rows.map((g) => `<div class="hbar-row">
      <button class="hbar-label" data-area="${esc(g.name)}"><span>${esc(g.name)}</span><small>${sub(g).join(' · ')}</small></button>
      <div class="hbar-track"><span class="hbar-fill" style="width:${(g.n / max) * 100}%" ${tipAttr(`<b>${esc(g.name)}</b><br>${fmtN(g.n)} ${t('reportsN')}<br>${sub(g).join('<br>')}`)}></span><em>${fmtN(g.n)}</em></div>
    </div>`).join('');
  const table = tableHTML([t('dArea'), t('count'), t('legendGood'), t('legendOpen')], rows.map((g) => [g.name, fmtN(g.n), `${pct(g.good, g.n)}%`, fmtN(g.open)]));
  return card(t('cAreas'), `<p class="fine">${esc(t('areaHint'))}</p><div class="hbars">${body}</div>${table}`);
}

/* ---------- time to close ---------- */
function timeToClose(base, items) {
  let start = null;
  for (const it of items.values()) if (it.firstSeen && (!start || it.firstSeen < start)) start = it.firstSeen;
  const since = start ? new Intl.DateTimeFormat(locale(), { dateStyle: 'long' }).format(start) : '—';
  const note = `<p class="fine">${esc(t('ttcNote', { d: since }))}</p>`;
  const map = new Map();
  const replies = [];
  for (const it of base) {
    if (it.replyAt) replies.push(it.replyAt - it.created);
    if (!it.closedAt) continue;
    if (!map.has(it.catId)) map.set(it.catId, { name: catLabel(it), v: [] });
    map.get(it.catId).v.push(it.closedAt - it.created);
  }
  const rows = [...map.values()].filter((g) => g.v.length >= 3)
    .map((g) => { g.v.sort((a, b) => a - b); return { name: g.name, n: g.v.length, med: quantile(g.v, 0.5), p75: quantile(g.v, 0.75) }; })
    .sort((a, b) => b.n - a.n).slice(0, 12);
  if (!rows.length) return card(t('cTtc'), `<p class="muted">${esc(t('kTtcNone'))}.</p>${note}`);
  const max = Math.max(...rows.map((r) => r.p75));
  replies.sort((a, b) => a - b);
  const body = rows.map((g) => `<div class="hbar-row">
      <div class="hbar-label static"><span>${esc(g.name)}</span><small>${t('kN', { n: fmtN(g.n) })}</small></div>
      <div class="hbar-track"><span class="hbar-fill ttc" style="width:${(g.med / max) * 100}%" ${tipAttr(`<b>${esc(g.name)}</b><br>${t('ttcMedian', { d: duration(g.med) })}<br>${t('ttcP75', { d: duration(g.p75) })}<br>${t('kN', { n: fmtN(g.n) })}`)}></span>
        <span class="ttc-p75" style="left:${(g.p75 / max) * 100}%"></span><em>${esc(duration(g.med))}</em></div>
    </div>`).join('');
  const extra = replies.length >= 3 ? `<p class="fine">${t('firstReply')}: ${t('ttcMedian', { d: duration(quantile(replies, 0.5)) })} (${t('kN', { n: fmtN(replies.length) })})</p>` : '';
  const table = tableHTML([t('category'), t('count'), 'median', 'p75'], rows.map((g) => [g.name, fmtN(g.n), duration(g.med), duration(g.p75)]));
  return card(t('cTtc'), `<div class="hbars">${body}</div>${extra}${note}${table}`);
}

/* ---------- hotspots ---------- */
function hotspots(base, f) {
  const cells = new Map();
  for (const it of base) {
    if (!isFinite(it.lat)) continue;
    const key = `${Math.round(it.lat / 0.00055)}:${Math.round(it.lng / 0.00077)}:${it.catId}`;
    if (!cells.has(key)) cells.set(key, []);
    cells.get(key).push(it);
  }
  const spots = [...cells.values()].filter((l) => l.length >= 3).map((l) => {
    const lat = l.reduce((s, x) => s + x.lat, 0) / l.length, lng = l.reduce((s, x) => s + x.lng, 0) / l.length;
    const good = l.filter((x) => x.status === 'good' || x.status === 'partial').length;
    const open = l.filter((x) => x.status === 'open').length;
    const last = l.reduce((m, x) => (x.created > m ? x.created : m), l[0].created);
    return { l, lat, lng, n: l.length, good, open, last, name: catLabel(l[0]), area: l[0].area };
  }).sort((a, b) => b.n - a.n).slice(0, 12);
  if (!spots.length) return card(t('cHot'), `<p class="muted">${esc(t('hotNone'))}</p>`);
  const body = `<ol class="spots">${spots.map((s) => `<li><button data-zone="${s.lat.toFixed(6)},${s.lng.toFixed(6)}" data-zone-cat="${esc(s.l[0].catId)}">
      <span class="spot-n">${fmtN(s.n)}×</span>
      <span class="spot-main"><b>${esc(s.name)}</b><small>${[s.area || '', ...(f.status === 'all' ? [t('resolvedPct', { p: pct(s.good, s.n) }), t('openN', { n: fmtN(s.open) })] : []), t('lastReport', { t: relTime(s.last) })].filter(Boolean).map(esc).join(' · ')}</small></span>
      <span aria-hidden="true">→</span></button></li>`).join('')}</ol>`;
  return card(t('cHot'), `<p class="fine">${esc(t('hotNote'))}</p>${body}`);
}

/* ---------- template replies ---------- */
function templates(base) {
  const groups = new Map();
  let total = 0;
  for (const it of base) {
    if (!it.reply?.text) continue;
    total++;
    const words = fold(it.reply.text)
      .replace(/\b[a-z]{1,2}\s*\d{2,3}\s*[a-z]{3}\b/g, ' ') // plates like "B 123 ABC"
      .replace(/[^a-z\s]/g, ' ').replace(/\b(buna ziua|buna seara|stimate|stimata|domnule|doamna)\b/g, ' ')
      .split(/\s+/).filter(Boolean).slice(0, 8).join(' ');
    if (!words) continue;
    if (!groups.has(words)) groups.set(words, { sample: it.reply.text, n: 0, c: blank() });
    const g = groups.get(words); g.n++; g.c[it.status]++;
  }
  const rows = [...groups.values()].filter((g) => g.n >= 3).sort((a, b) => b.n - a.n).slice(0, 10);
  if (!rows.length) return card(t('cReplies'), '<p class="muted">—</p>');
  const body = `<ol class="replies">${rows.map((g) => {
    const dom = ORDER.slice().sort((a, b) => g.c[b] - g.c[a])[0];
    return `<li><span class="spot-n">${fmtN(g.n)}×</span><div><q>${esc(g.sample.length > 170 ? g.sample.slice(0, 170) + '…' : g.sample)}</q>
      <small>${t('repliesOf', { p: pct(g.n, total) })} · <i class="dot" style="background:var(--c-${dom})"></i> ${t(LEGEND[dom])}</small></div></li>`;
  }).join('')}</ol>`;
  return card(t('cReplies'), `<p class="fine">${esc(t('repliesNote'))}</p>${body}`);
}

/* ---------- recent changes ---------- */
function recent(base) {
  const ev = [];
  for (const it of base) for (const [at, kind, val] of it.history) ev.push({ at: new Date(at), kind, val, it });
  ev.sort((a, b) => b.at - a.at);
  const top = ev.slice(0, 15);
  if (!top.length) return card(t('cRecent'), `<p class="muted">${esc(t('recentNone'))}</p>`);
  const label = (e) => {
    if (e.kind === 's') { const [code, lb] = String(e.val).split('|'); return t('hStatus', { s: statusText(statusKey(code, lb), lb) }); }
    return { r: t('hReply'), d: t('hDesc'), c: t('hCat', { c: e.val }), x: t('hRemoved'), u: t('hRestored') }[e.kind] || '';
  };
  const color = (e) => (e.kind === 's' ? statusKey(...String(e.val).split('|')) : e.kind === 'x' ? 'bad' : null);
  const body = `<ul class="events">${top.map((e) => `<li><a href="#" data-open="${esc(e.it.id)}">
      <i class="dot" style="background:${color(e) ? `var(--c-${color(e)})` : 'var(--muted)'}"></i>
      <span><b>${esc(catLabel(e.it))}</b> · ${esc(e.it.ticket)}<br><small>${esc(label(e))}</small></span>
      <time>${relTime(e.at)}</time></a></li>`).join('')}</ul>`;
  return card(t('cRecent'), body);
}

/* ---------- RSS ---------- */
function feeds(assets) {
  const base = location.origin + location.pathname.replace(/[^/]*$/, '') + 'data/feeds/';
  const list = [{ name: t('rssAll'), file: 'all.xml' }, ...(assets?.areas || []).map((a) => ({ name: a.name, file: slugify(a.name) + '.xml' }))
    .sort((a, b) => a.name.localeCompare(b.name, 'ro'))];
  return card(t('cFeeds'), `<p class="fine">${esc(t('feedsHint'))}</p><div class="feeds">${list.map((f) =>
    `<a href="${esc(base + f.file)}" target="_blank" rel="noopener">${ic('rss', 14)} ${esc(f.name)}</a>`).join('')}</div>`);
}

/* ---------- tooltip ---------- */
function bindTooltip(root) {
  if (root.dataset.bound) return;
  root.dataset.bound = '1';
  const tip = document.createElement('div');
  tip.className = 'viz-tip';
  tip.hidden = true;
  document.body.appendChild(tip);
  const move = (e) => {
    const el = e.target.closest?.('[data-tip]');
    if (!el || !root.contains(el)) { tip.hidden = true; return; }
    tip.innerHTML = el.dataset.tip;
    tip.hidden = false;
    const r = tip.getBoundingClientRect();
    let x = e.clientX + 14, y = e.clientY + 14;
    if (x + r.width > innerWidth - 8) x = e.clientX - r.width - 14;
    if (y + r.height > innerHeight - 8) y = e.clientY - r.height - 14;
    tip.style.left = Math.max(8, x) + 'px';
    tip.style.top = Math.max(8, y) + 'px';
  };
  root.addEventListener('pointermove', move);
  root.addEventListener('pointerdown', move);
  root.addEventListener('pointerleave', () => (tip.hidden = true));
  window.addEventListener('scroll', () => (tip.hidden = true), { passive: true });
}

export function render(root, ctx) {
  const { range, loading, items, assets } = ctx;
  // the status filter applies here too; the unfiltered lists stay for "share of all" figures
  const status = ctx.status || 'all', keep = ctx.statusFilter || (() => true);
  const f = { status, label: ctx.statusLabel, all: ctx.base, prevAll: ctx.prevBase };
  const base = status === 'all' ? ctx.base : ctx.base.filter((it) => keep(it.status));
  const prevBase = ctx.prevBase && status !== 'all' ? ctx.prevBase.filter((it) => keep(it.status)) : ctx.prevBase;
  if (loading && !base.length) { root.innerHTML = '<div class="viz-grid"><div class="skeleton tall"></div><div class="skeleton tall"></div></div>'; return; }
  root.innerHTML = `<div class="viz-head"><h1>${esc(t('iTitle'))}</h1></div>
    ${kpis(base, prevBase, f)}
    <div class="viz-grid">
      ${series(base, range)}
      ${byCategory(base, f)}
      ${areas(base, f)}
      ${heat(base)}
      ${timeToClose(base, items)}
      ${hotspots(base, f)}
      ${templates(base)}
      ${recent(base)}
      ${feeds(assets)}
    </div>`;
  bindTooltip(root);
  root.onclick = (e) => {
    const a = e.target.closest('[data-area]'); if (a) return ctx.onArea(a.dataset.area);
    const c = e.target.closest('[data-cat]'); if (c) return ctx.onCategory(c.dataset.cat);
    const z = e.target.closest('[data-zone]');
    if (z) { const [lat, lng] = z.dataset.zone.split(',').map(Number); return ctx.onZone(lat, lng, 80, z.dataset.zoneCat); }
  };
}
