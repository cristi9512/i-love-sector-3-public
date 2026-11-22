// Vercel build: copies the static site to dist/ and generates, from the archive,
//  - a page per month (/raport/YYYY-MM) and per neighbourhood (/cartier/<slug>),
//    plus index pages, readable by search engines and with their own link previews;
//  - a 1200×630 preview image for every page (og/*.png);
//  - data/summary.json, the headline numbers the app shows at the top;
//  - sitemap.xml and robots.txt.
// Runs about once an hour (on each deploy), so nothing generated here is committed.
import { cp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { Resvg } from '@resvg/resvg-js';
import { areaOf, slugify, fromBucharest } from '../js/geo.js';
import { isParking, outcomeKind, OUTCOME_COLOR, OVERDUE_DAYS } from '../js/outcomes.js';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const OUT = path.join(ROOT, 'dist');
const SITE = process.env.SITE_URL || 'https://sesizari-sector3.vercel.app';
const DAY = 864e5;
const NOW = Date.now();
const COPY = ['index.html', 'despre.html', 'styles.css', 'sw.js', 'manifest.webmanifest', 'js', 'assets', 'data'];

/* ---------- helpers ---------- */
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const nf = new Intl.NumberFormat('ro-RO');
const n = (x) => nf.format(x);
const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);
const monthName = (m) => new Intl.DateTimeFormat('ro-RO', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(m + '-15T12:00:00Z'));
const dateLong = (ms) => new Intl.DateTimeFormat('ro-RO', { dateStyle: 'long', timeZone: 'Europe/Bucharest' }).format(new Date(ms));
const dateTime = (ms) => new Intl.DateTimeFormat('ro-RO', { dateStyle: 'long', timeStyle: 'short', timeZone: 'Europe/Bucharest' }).format(new Date(ms));
const change = (cur, prev) => { if (!prev) return ''; const d = Math.round(((cur - prev) / prev) * 100); return `${d > 0 ? '▲' : d < 0 ? '▼' : '='} ${Math.abs(d)}%`; };
const median = (v) => { if (!v.length) return null; const s = v.slice().sort((a, b) => a - b), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const dur = (ms) => { const h = ms / 36e5; return h < 1 ? `${Math.max(1, Math.round(ms / 6e4))} min` : h < 48 ? `${h.toFixed(h < 10 ? 1 : 0).replace('.', ',')} h` : `${Math.round(h / 24)} zile`; };

function closedAt(r) {
  for (const [at, kind, val] of r.history || []) if (kind === 's' && String(val).startsWith('C')) return Date.parse(at);
  return null;
}
function stats(list) {
  const s = { n: list.length, good: 0, bad: 0, open: 0, overdue: 0, ttc: [] };
  for (const r of list) {
    if (r.key === 'good' || r.key === 'partial') s.good++;
    else if (r.key === 'bad') s.bad++;
    else if (r.key === 'open') { s.open++; if (NOW - r.t > OVERDUE_DAYS * DAY) s.overdue++; }
    if (r.closed && r.firstStatus === 'O') s.ttc.push(r.closed - r.t);
  }
  s.gp = pct(s.good, s.n); s.bp = pct(s.bad, s.n); s.med = median(s.ttc);
  return s;
}
const groupBy = (list, key) => { const m = new Map(); for (const r of list) { const k = key(r); if (k == null) continue; if (!m.has(k)) m.set(k, []); m.get(k).push(r); } return m; };

/* ---------- preview images ---------- */
const FONT_DIRS = ['@expo-google-fonts/ibm-plex-sans', '@expo-google-fonts/ibm-plex-mono'];
const fontFiles = FONT_DIRS.flatMap((pkg) => {
  const dir = path.dirname(require.resolve(`${pkg}/package.json`));
  return ['400Regular', '500Medium', '600SemiBold'].map((w) => {
    const sub = path.join(dir, w);
    return existsSync(sub) ? path.join(sub, require('node:fs').readdirSync(sub).find((f) => f.endsWith('.ttf'))) : null;
  }).filter(Boolean);
});
function svgCard({ kicker, title, items, foot }) {
  const x = (s) => esc(s);
  const cols = items.slice(0, 3);
  const w = 1080 / cols.length;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="#f4f5f6"/>
  <rect width="1200" height="96" fill="#1d2125"/>
  <rect x="60" y="28" width="62" height="40" rx="5" fill="none" stroke="#f4f5f6" stroke-width="3"/>
  <text x="91" y="56" text-anchor="middle" font-family="IBM Plex Mono" font-weight="600" font-size="22" fill="#f4f5f6">S3</text>
  <text x="142" y="58" font-family="IBM Plex Sans" font-weight="600" font-size="28" fill="#f4f5f6">Sesizări Sector 3</text>
  <text x="60" y="170" font-family="IBM Plex Sans" font-weight="500" font-size="28" fill="#5e6670">${x(kicker)}</text>
  <text x="60" y="236" font-family="IBM Plex Sans" font-weight="600" font-size="56" fill="#1d2125">${x(title)}</text>
  ${cols.map((it, i) => `
  <rect x="${60 + i * w}" y="300" width="${w - 20}" height="200" rx="6" fill="#ffffff" stroke="#d7dadf" stroke-width="2"/>
  <rect x="${60 + i * w}" y="300" width="8" height="200" rx="3" fill="${it.color || '#1d2125'}"/>
  <text x="${92 + i * w}" y="392" font-family="IBM Plex Mono" font-weight="500" font-size="64" fill="#1d2125">${x(it.value)}</text>
  <text x="${92 + i * w}" y="444" font-family="IBM Plex Sans" font-weight="400" font-size="26" fill="#5e6670">${x(it.label)}</text>`).join('')}
  <text x="60" y="580" font-family="IBM Plex Sans" font-weight="400" font-size="24" fill="#5e6670">${x(foot || 'sesizari-sector3.vercel.app · date publice de la Primăria Sectorului 3 · proiect neoficial')}</text>
</svg>`;
}
async function writeImage(name, card) {
  const png = new Resvg(svgCard(card), { font: { fontFiles, loadSystemFonts: false, defaultFontFamily: 'IBM Plex Sans' } }).render().asPng();
  await writeFile(path.join(OUT, 'og', name + '.png'), png);
  return `${SITE}/og/${name}.png`;
}

/* ---------- page template ---------- */
function page({ title, description, url, image, h1, body, crumbs = '' }) {
  return `<!doctype html>
<html lang="ro">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(description)}">
  <link rel="canonical" href="${esc(url)}">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="Sesizări Sector 3">
  <meta property="og:locale" content="ro_RO">
  <meta property="og:title" content="${esc(title)}">
  <meta property="og:description" content="${esc(description)}">
  <meta property="og:url" content="${esc(url)}">
  <meta property="og:image" content="${esc(image)}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="theme-color" content="#1d2125">
  <link rel="icon" href="/assets/icon.svg" type="image/svg+xml">
  <link rel="apple-touch-icon" href="/assets/icon-192.png">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/styles.css">
  <script src="/js/theme.js"></script>
</head>
<body>
  <header class="topbar">
    <a class="brand" href="/"><span class="brand-mark" aria-hidden="true"></span><div><h1>Sesizări Sector 3</h1><p class="brand-sub">Ce raportează vecinii tăi și ce răspunde primăria</p></div></a>
    <nav class="tabs" aria-label="Pagini">
      <a href="/">Hartă și listă</a><a href="/#tab=insights">Statistici</a><a href="/#tab=recurring">Se repetă</a><a href="/raport">Raport lunar</a><a class="tab-link" href="/despre">Cum funcționează</a>
    </nav>
    <div class="top-actions"><button class="btn btn-outline icon-btn" id="themeBtn" type="button" aria-label="Temă"></button></div>
  </header>
  <main class="about static-page">
    ${crumbs ? `<nav class="crumbs">${crumbs}</nav>` : ''}
    <h1>${esc(h1)}</h1>
    ${body}
    <div class="share-row">
      <button class="btn btn-outline small" data-copy="${esc(url)}">Copiază linkul</button>
      <a class="btn btn-outline small" href="https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}" target="_blank" rel="noopener">Distribuie pe Facebook</a>
      <a class="btn btn-outline small" href="${esc(image)}" download>Descarcă imaginea</a>
    </div>
  </main>
  <footer class="foot">Date publice de la Primăria Sectorului 3, arhivate la fiecare 15 minute · proiect neoficial · <a href="/despre">Cum funcționează</a></footer>
  <script type="module" src="/js/page.js"></script>
</body>
</html>
`;
}
const kpis = (items) => `<div class="kpis">${items.map(([v, l, d]) => `<div class="kpi"><b>${esc(v)}</b><span>${esc(l)}</span>${d ? `<span class="delta">${esc(d)}</span>` : ''}</div>`).join('')}</div>`;
const table = (head, rows) => `<div class="table-wrap report-table"><table><thead><tr>${head.map((h, i) => `<th${i ? ' class="num"' : ''}>${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((c, i) => `<td${i ? ' class="num"' : ''}>${c}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;

/* ---------- main ---------- */
async function main() {
  await rm(OUT, { recursive: true, force: true });
  await mkdir(OUT, { recursive: true });
  for (const f of COPY) await cp(path.join(ROOT, f), path.join(OUT, f), { recursive: true, filter: (src) => !src.includes(`${path.sep}data${path.sep}changes`) });
  for (const d of ['og', 'raport', 'cartier']) await mkdir(path.join(OUT, d), { recursive: true });

  const meta = JSON.parse(await readFile(path.join(ROOT, 'data', 'meta.json'), 'utf8'));
  const assets = JSON.parse(await readFile(path.join(ROOT, 'assets', 'sector3.json'), 'utf8'));
  const supFile = path.join(ROOT, 'data', 'suppressed.json');
  const suppressed = new Set(existsSync(supFile) ? JSON.parse(await readFile(supFile, 'utf8')).tickets || [] : []);
  const recFile = path.join(ROOT, 'data', 'recurrence.json');
  const rec = existsSync(recFile) ? JSON.parse(await readFile(recFile, 'utf8')) : null;

  const recs = [];
  for (const f of (await readdir(path.join(ROOT, 'data', 'incidents'))).filter((x) => x.endsWith('.json')).sort()) {
    for (const r of JSON.parse(await readFile(path.join(ROOT, 'data', 'incidents', f), 'utf8'))) {
      if (r.removedAt || suppressed.has(r.ticket) || !r.createdAt) continue;
      recs.push({
        ...r, t: fromBucharest(r.createdAt).getTime(), month: r.createdAt.slice(0, 7),
        key: OUTCOME_COLOR[outcomeKind(r.status, r.statusLabel)], parking: isParking(r.categoryId),
        area: areaOf(r.lat, r.lng, assets.areas), closed: closedAt(r),
      });
    }
  }
  const months = [...new Set(recs.map((r) => r.month))].sort();
  const current = new Date().toISOString().slice(0, 7);
  const coverFrom = meta.coverageFrom;
  const urls = [`${SITE}/`, `${SITE}/despre`, `${SITE}/raport`, `${SITE}/cartier`];
  const backIn = (m) => (rec?.places || []).reduce((s, p) => s + p.reports.filter(([, at, , b]) => b && at.slice(0, 7) === m).length, 0);

  /* ----- monthly pages ----- */
  const byMonth = groupBy(recs, (r) => r.month);
  const monthCards = [];
  for (const m of months) {
    const list = byMonth.get(m) || [], prev = byMonth.get(prevMonth(m)) || null;
    const a = stats(list), b = prev ? stats(prev) : null, c = stats(list.filter((r) => !r.parking));
    const partial = m === current, first = coverFrom && coverFrom.slice(0, 7) === m && coverFrom.slice(8) !== '01';
    const name = monthName(m);
    const lead = `În ${name} au fost trimise ${n(a.n)} sesizări${b ? ` (${change(a.n, b.n)} față de ${monthName(prevMonth(m))})` : ''}. ${a.gp}% au fost rezolvate și ${a.bp}% respinse; ${n(a.open)} sunt încă în lucru. Fără parcare și staționare: ${n(c.n)} sesizări, ${c.gp}% rezolvate.`;
    const cats = [...groupBy(list, (r) => r.categoryId).entries()].map(([id, l]) => ({ name: l[0].category, s: stats(l), p: prev ? prev.filter((r) => r.categoryId === id).length : null })).sort((x, y) => y.s.n - x.s.n);
    const areas = [...groupBy(list, (r) => r.area).entries()].map(([ar, l]) => ({ name: ar, s: stats(l), c: stats(l.filter((r) => !r.parking)) })).sort((x, y) => y.s.n - x.s.n);
    const back = backIn(m);
    const image = await writeImage(`raport-${m}`, {
      kicker: 'Raport lunar', title: name.charAt(0).toUpperCase() + name.slice(1),
      items: [{ value: n(a.n), label: 'sesizări' }, { value: `${a.gp}%`, label: 'rezolvate', color: '#16a34a' }, { value: `${a.bp}%`, label: 'respinse', color: '#dc2626' }],
    });
    const notes = [partial ? 'Luna e în curs: cifrele sunt până azi.' : '', first ? `Arhiva începe pe ${dateLong(Date.parse(coverFrom + 'T12:00:00Z'))}, așa că luna e incompletă.` : '', 'Tot Sectorul 3, fără filtre.'].filter(Boolean).join(' ');
    const body = `<p class="lead">${esc(lead)}</p>
      ${kpis([[n(a.n), 'Sesizări', b ? change(a.n, b.n) : ''], [n(c.n), 'Probleme în oraș (fără parcare)'], [`${a.gp}%`, 'Rezolvate'], [`${a.bp}%`, 'Respinse'], [n(a.open), 'Încă în lucru'], [n(back), 'Venite după o închidere ca rezolvată, în același loc']])}
      <p class="fine">${esc(notes)}</p>
      <p><a class="btn btn-primary" href="/#tab=report&month=${m}">Deschide raportul interactiv</a></p>
      <h2>Pe categorii</h2>${table(['Categorie', 'Sesizări', 'Față de luna trecută', 'Rezolvate', 'Respinse', 'În lucru'], cats.map((x) => [esc(x.name), n(x.s.n), x.p ? esc(change(x.s.n, x.p)) : '—', `${x.s.gp}%`, `${x.s.bp}%`, n(x.s.open)]))}
      <h2>Pe cartiere</h2>${table(['Cartier', 'Sesizări', 'Fără parcare', 'Rezolvate', 'Respinse'], areas.map((x) => [`<a href="/cartier/${slugify(x.name)}">${esc(x.name)}</a>`, n(x.s.n), n(x.c.n), `${x.s.gp}%`, `${x.s.bp}%`]))}
      <p class="fine">Cartierele sunt aproximative: fiecare sesizare primește cartierul al cărui centru e cel mai aproape.</p>`;
    const url = `${SITE}/raport/${m}`;
    await writeFile(path.join(OUT, 'raport', `${m}.html`), page({
      title: `Raport ${name} · Sesizări Sector 3`, description: lead, url, image, h1: `Raport lunar · ${name}`, body,
      crumbs: '<a href="/raport">Rapoarte lunare</a>',
    }));
    urls.push(url);
    monthCards.push({ m, name, a, partial, first });
  }
  const latestFull = monthCards.filter((x) => !x.partial).pop() || monthCards[monthCards.length - 1];
  await writeFile(path.join(OUT, 'raport', 'index.html'), page({
    title: 'Rapoarte lunare · Sesizări Sector 3', description: 'Câte sesizări au trimis locuitorii Sectorului 3 în fiecare lună și cum le-a închis primăria.',
    url: `${SITE}/raport`, image: `${SITE}/og/raport-${latestFull.m}.png`, h1: 'Rapoarte lunare',
    body: `<p class="lead">Fiecare lună din arhivă: câte sesizări au fost trimise, câte au fost rezolvate sau respinse și unde.</p>
      ${table(['Luna', 'Sesizări', 'Rezolvate', 'Respinse', 'În lucru'], monthCards.slice().reverse().map((x) => [`<a href="/raport/${x.m}">${esc(x.name)}</a>${x.partial ? ' <small class="muted">în curs</small>' : x.first ? ' <small class="muted">incompletă</small>' : ''}`, n(x.a.n), `${x.a.gp}%`, `${x.a.bp}%`, n(x.a.open)]))}`,
  }));

  /* ----- neighbourhood pages ----- */
  const since30 = NOW - 30 * DAY;
  const sector30 = stats(recs.filter((r) => r.t >= since30));
  const sectorAll = stats(recs);
  const areaRows = [];
  for (const ar of assets.areas.map((x) => x.name).sort((x, y) => x.localeCompare(y, 'ro'))) {
    const all = recs.filter((r) => r.area === ar), last = all.filter((r) => r.t >= since30);
    const s30 = stats(last), s = stats(all), civ = all.filter((r) => !r.parking);
    const overdue = all.filter((r) => r.key === 'open' && NOW - r.t > OVERDUE_DAYS * DAY).length;
    const cats = [...groupBy(civ, (r) => r.categoryId).entries()].map(([, l]) => ({ name: l[0].category, s: stats(l) })).sort((x, y) => y.s.n - x.s.n).slice(0, 8);
    const rr = rec?.byArea?.[ar];
    const places = (rec?.places || []).filter((p) => p.area === ar).slice(0, 6);
    const slug = slugify(ar), url = `${SITE}/cartier/${slug}`;
    const lead = `În ultimele 30 de zile, în zona ${ar} au fost trimise ${n(s30.n)} sesizări: ${s30.gp}% rezolvate, ${s30.bp}% respinse, ${n(s30.open)} încă în lucru. În tot sectorul, în aceeași perioadă: ${sector30.gp}% rezolvate și ${sector30.bp}% respinse.`;
    const image = await writeImage(`cartier-${slug}`, {
      kicker: 'Ultimele 30 de zile', title: ar,
      items: [{ value: n(s30.n), label: 'sesizări' }, { value: `${s30.gp}%`, label: 'rezolvate', color: '#16a34a' }, { value: n(overdue), label: 'deschise > 30 de zile', color: '#f59e0b' }],
    });
    const body = `<p class="lead">${esc(lead)}</p>
      ${kpis([[n(s30.n), 'Sesizări în ultimele 30 de zile'], [`${s30.gp}%`, 'Rezolvate (30 de zile)'], [`${s.gp}%`, `Rezolvate din ${n(s.n)} (toată arhiva)`], [n(overdue), 'Deschise de peste 30 de zile'], [rr ? `${pct(rr.recurred, rr.resolved)}%` : '—', 'Rezolvate urmate de o nouă sesizare în același loc']])}
      <p><a class="btn btn-primary" href="/#area=${encodeURIComponent(ar)}&days=30">Vezi sesizările pe hartă</a> <a class="btn btn-outline" href="/#tab=recurring&rarea=${encodeURIComponent(ar)}">Probleme care se repetă aici</a></p>
      <h2>Ce se raportează cel mai des (fără parcare)</h2>${table(['Categorie', 'Sesizări', 'Rezolvate', 'Respinse', 'În lucru'], cats.map((x) => [esc(x.name), n(x.s.n), `${x.s.gp}%`, `${x.s.bp}%`, n(x.s.open)]))}
      ${places.length ? `<h2>Locuri unde problemele revin</h2><ul class="plain">${places.map((p) => `<li><b>${esc(p.name)}</b>: ${n(p.n)} sesizări, ${n(p.again)} după o închidere ca rezolvată (${esc(p.first)} – ${esc(p.last)})</li>`).join('')}</ul>` : ''}
      <p class="fine">Toată arhiva: ${n(s.n)} sesizări din ${esc(dateLong(Date.parse(coverFrom + 'T12:00:00Z')))}. Cartierele sunt aproximative: fiecare sesizare primește cartierul al cărui centru e cel mai aproape. Media sectorului, toată arhiva: ${sectorAll.gp}% rezolvate.</p>`;
    await writeFile(path.join(OUT, 'cartier', `${slug}.html`), page({
      title: `${ar} · Sesizări Sector 3`, description: lead, url, image, h1: ar, body, crumbs: '<a href="/cartier">Cartiere</a>',
    }));
    urls.push(url);
    areaRows.push({ ar, slug, s30, overdue });
  }
  await writeFile(path.join(OUT, 'cartier', 'index.html'), page({
    title: 'Cartiere · Sesizări Sector 3', description: 'Sesizările din fiecare cartier al Sectorului 3: câte sunt, cum le închide primăria și unde se repetă problemele.',
    url: `${SITE}/cartier`, image: `${SITE}/og/home.png`, h1: 'Cartierele Sectorului 3',
    body: `<p class="lead">Ultimele 30 de zile în fiecare cartier. Alege unul pentru detalii.</p>
      ${table(['Cartier', 'Sesizări (30 de zile)', 'Rezolvate', 'Respinse', 'Deschise > 30 de zile'], areaRows.map((x) => [`<a href="/cartier/${x.slug}">${esc(x.ar)}</a>`, n(x.s30.n), `${x.s30.gp}%`, `${x.s30.bp}%`, n(x.overdue)]))}`,
  }));

  /* ----- home preview image + headline numbers for the app ----- */
  await writeImage('home', {
    kicker: 'Toate sesizările publice, cu text și răspunsul primăriei', title: 'Cum răspunde primăria',
    items: [{ value: n(sector30.n), label: 'sesizări în 30 de zile' }, { value: `${sector30.gp}%`, label: 'rezolvate', color: '#16a34a' }, { value: n(rec?.totals?.places || 0), label: 'locuri unde revin', color: '#1d2125' }],
  });
  const summary = {
    builtAt: new Date(NOW).toISOString(),
    month: latestFull ? { m: latestFull.m, n: latestFull.a.n, good: latestFull.a.gp, bad: latestFull.a.bp } : null,
    overdue: meta.overdue?.total ?? null,
    recurring: rec?.totals?.places ?? null,
  };
  await writeFile(path.join(OUT, 'data', 'summary.json'), JSON.stringify(summary) + '\n');

  /* ----- sitemap + robots ----- */
  const today = new Date(NOW).toISOString().slice(0, 10);
  await writeFile(path.join(OUT, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) => `  <url><loc>${esc(u)}</loc><lastmod>${today}</lastmod></url>`).join('\n')}\n</urlset>\n`);
  await writeFile(path.join(OUT, 'robots.txt'), `User-agent: *\nAllow: /\nDisallow: /data/\nSitemap: ${SITE}/sitemap.xml\n`);

  console.log(`Built ${monthCards.length} monthly pages, ${areaRows.length} neighbourhood pages, ${monthCards.length + areaRows.length + 1} images (${dateTime(NOW)})`);
}
function prevMonth(m) { const [y, mo] = m.split('-').map(Number); return new Date(Date.UTC(y, mo - 2, 1)).toISOString().slice(0, 7); }

main().catch((e) => { console.error(e); process.exit(1); });
