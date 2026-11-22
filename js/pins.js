// Category icons for map pins and list rows, in three candidate styles.
// Design review: ?pins=a|b|c picks the style (default a) and shows a switcher bar.
//   a · Bulină    a disc in the status colour with a white category icon
//   b · Pin       a classic map pin in the status colour, icon in its head
//   c · Etichetă  a neutral tile with a dark icon and a small status dot

// One icon per group of categories (stroke icons on a 24×24 grid).
const ICONS = {
  parking: '<rect x="4" y="4" width="16" height="16" rx="3"/><path d="M10 16.5V7.5h3.2a2.6 2.6 0 0 1 0 5.2H10"/>',
  car: '<path d="M5 17v-4.5L7 7h10l2 5.5V17M3.5 12.5h17M5 17h14M6.5 17v2M17.5 17v2"/><path d="M8 14.6h.01M16 14.6h.01"/>',
  tow: '<path d="M3 16V9h8v7M11 11.5h4.5l3.5 3V16M3 16h16"/><circle cx="6.5" cy="17.5" r="1.6"/><circle cx="15.5" cy="17.5" r="1.6"/><path d="M11 9 15 4"/>',
  road: '<path d="M8 3 4.5 21M16 3l3.5 18M12 4v3M12 10.5v3M12 17v3"/>',
  works: '<path d="M9.5 4h5l4 15h-13zM7.6 11h8.8M6.6 15h10.8M3.5 19.5h17"/>',
  access: '<circle cx="12" cy="4.5" r="1.7"/><path d="M12 7.5v5.5h4.5l2 4.5M12 10.5h4M9 10.6a5 5 0 1 0 6.3 7.2"/>',
  trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
  tree: '<path d="M12 21v-6.5M12 14.5a5 5 0 0 0 4.6-7A4.6 4.6 0 0 0 12 3a4.6 4.6 0 0 0-4.6 4.5A5 5 0 0 0 12 14.5zM9 21h6"/>',
  park: '<path d="M3.5 10h17M3.5 14h17M6 14v5.5M18 14v5.5M6 10V6.5M18 10V6.5"/>',
  noise: '<path d="M4 9.5v5h3.5L13 19V5L7.5 9.5zM16.5 9a4 4 0 0 1 0 6M19 6.5a7.5 7.5 0 0 1 0 11"/>',
  stall: '<path d="M4 9 5.5 4h13L20 9zM4 9v.8a2.7 2.7 0 0 0 5.3 0 2.7 2.7 0 0 0 5.4 0 2.7 2.7 0 0 0 5.3 0V9M5.5 12.5V20h13v-7.5"/>',
  building: '<path d="M5 21V4h10v17M15 9h4v12M3 21h18M8.5 7.5h3M8.5 11.5h3M8.5 15.5h3"/>',
  air: '<path d="M3 8h10a3 3 0 1 0-3-3M3 12h15a3 3 0 1 1-3 3M3 16h7"/>',
  paw: '<circle cx="6.5" cy="10.5" r="1.7"/><circle cx="10" cy="6.5" r="1.7"/><circle cx="14" cy="6.5" r="1.7"/><circle cx="17.5" cy="10.5" r="1.7"/><path d="M12 12.5c-2.8 0-5 3.4-5 5.2 0 1.5 2 2.3 5 1.5 3 .8 5 0 5-1.5 0-1.8-2.2-5.2-5-5.2z"/>',
  money: '<circle cx="12" cy="12" r="8.5"/><path d="M14.6 9.6A2.8 2.8 0 0 0 12 8c-1.5 0-2.6.8-2.6 2s1.1 1.6 2.6 2 2.6.8 2.6 2-1.1 2-2.6 2a2.8 2.8 0 0 1-2.6-1.6M12 6.3V8M12 16v1.7"/>',
  school: '<path d="M2.5 9 12 4.5 21.5 9 12 13.5zM6 11v5c3.5 2.5 8.5 2.5 12 0v-5M21.5 9v5"/>',
  doc: '<path d="M7 3h7l4 4v14H7zM14 3v4h4M10 12h5M10 16h5"/>',
  other: '<circle cx="12" cy="12" r="8.5"/><path d="M8.5 12h.01M12 12h.01M15.5 12h.01"/>',
};

// city category id → icon group (ids from IncidentCategoryRP.aspx)
const CAT_ICON = {
  1: 'parking', 2: 'parking', 200: 'parking', 12: 'parking',
  27: 'car', 16: 'car', 26: 'tow',
  10: 'road', 4: 'works', 32: 'access',
  6: 'trash', 20: 'trash',
  14: 'tree', 3: 'tree', 11: 'park',
  19: 'noise', 17: 'stall',
  7: 'building', 21: 'building', 22: 'building',
  18: 'air', 15: 'paw',
  5: 'money', 13: 'school', 24: 'doc',
  9: 'other',
};
export const iconName = (catId) => CAT_ICON[catId] || 'other';
const svg = (name, size, extra = '') =>
  `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" ${extra}>${ICONS[name] || ICONS.other}</svg>`;
export const catIconSVG = (catId, size = 16) => svg(iconName(catId), size);

// Legend groups: icon + label (RO / EN)
export const LEGEND = [
  ['parking', 'Parcări ocupate, marcaje', 'Parking spaces, markings'],
  ['car', 'Staționare, mașini abandonate', 'Illegal stopping, abandoned cars'],
  ['tow', 'Mașini ridicate', 'Towed cars'],
  ['road', 'Străzi', 'Streets'],
  ['works', 'Lucrări alei și trotuare', 'Alleys and pavements'],
  ['access', 'Rampe pentru dizabilități', 'Accessibility ramps'],
  ['trash', 'Gunoi, terenuri insalubre', 'Waste, dirty land'],
  ['tree', 'Copaci, spații verzi', 'Trees, green spaces'],
  ['park', 'Parcuri', 'Parks'],
  ['noise', 'Ordine și liniște', 'Public order, noise'],
  ['stall', 'Comerț stradal', 'Street trading'],
  ['building', 'Construcții, blocuri, spații comerciale', 'Buildings, construction, shops'],
  ['air', 'Mediu, calitatea aerului', 'Environment, air quality'],
  ['paw', 'Animale de companie', 'Pets'],
  ['money', 'Taxe și impozite', 'Taxes'],
  ['school', 'Școli', 'Schools'],
  ['doc', 'Fond funciar', 'Land registry'],
  ['other', 'Altele', 'Other'],
];
export const legendIcon = (name, size = 16) => svg(name, size);

/* ---------- the three styles ---------- */
const m = /[?&]pins=([abc])\b/.exec(location.search);
export const STYLE = m ? m[1] : 'none'; // 'none' = today's plain dots
document.documentElement.dataset.pins = STYLE;

// white icons on the status colour, except amber (in progress) which needs dark ink
const ink = (status) => (status === 'open' ? '#1d2125' : '#fff');

/** Leaflet divIcon options for a report. */
export function pinOptions(it, active) {
  if (STYLE === 'none') {
    return {
      className: '', iconSize: [16, 16], iconAnchor: [8, 8], popupAnchor: [0, -8],
      html: `<div class="pin${active ? ' active' : ''}${it.removed ? ' removed' : ''}" style="--status-color:var(--c-${it.status})"></div>`,
    };
  }
  const st = `--status-color:var(--c-${it.status});--ink:${ink(it.status)}`;
  const cls = `${active ? ' active' : ''}${it.removed ? ' removed' : ''}`;
  if (STYLE === 'b') {
    return {
      className: '', iconSize: [30, 38], iconAnchor: [15, 37], popupAnchor: [0, -34],
      html: `<div class="pin-b${cls}" style="${st}"><svg class="pin-b-shape" viewBox="0 0 30 38" aria-hidden="true"><path d="M15 36.5C15 36.5 3 23.6 3 14.5a12 12 0 0 1 24 0C27 23.6 15 36.5 15 36.5z"/></svg>${catIconSVG(it.catId, 15)}</div>`,
    };
  }
  if (STYLE === 'c') {
    return {
      className: '', iconSize: [28, 28], iconAnchor: [14, 14], popupAnchor: [0, -14],
      html: `<div class="pin-c${cls}" style="${st}">${catIconSVG(it.catId, 17)}<i></i></div>`,
    };
  }
  return {
    className: '', iconSize: [26, 26], iconAnchor: [13, 13], popupAnchor: [0, -13],
    html: `<div class="pin-a${cls}" style="${st}">${catIconSVG(it.catId, 14)}</div>`,
  };
}

/** Small icon at the start of a list row (same look as on the map). */
export function listIcon(it) {
  if (STYLE === 'none') return '';
  const st = `--status-color:var(--c-${it.status});--ink:${ink(it.status)}`;
  const k = STYLE === 'b' ? 'b' : STYLE === 'c' ? 'c' : 'a';
  return `<span class="li-${k}" style="${st}" aria-hidden="true">${catIconSVG(it.catId, k === 'c' ? 15 : 13)}${k === 'c' ? '<i></i>' : ''}</span>`;
}

/** Cluster bubble. Style c shows the mix of outcomes inside the cluster as a bar. */
export function clusterHTML(c, statusOf) {
  const n = c.getChildCount();
  const size = n < 10 ? 34 : n < 100 ? 40 : 48;
  if (STYLE !== 'c') return { html: `<div class="marker-cluster-custom" style="width:${size}px;height:${size}px">${n}</div>`, size };
  const counts = { good: 0, partial: 0, bad: 0, other: 0, open: 0 };
  for (const mk of c.getAllChildMarkers()) counts[statusOf(mk)] = (counts[statusOf(mk)] || 0) + 1;
  const bar = ['good', 'partial', 'bad', 'other', 'open'].filter((k) => counts[k])
    .map((k) => `<span style="flex:${counts[k]};background:var(--c-${k})"></span>`).join('');
  const w = size + 8;
  return { html: `<div class="cluster-c" style="width:${w}px;height:${size}px"><b>${n}</b><span class="cluster-c-bar">${bar}</span></div>`, size: w, h: size };
}

/* ---------- design-review switcher ---------- */
if (m) {
  const names = { a: 'A · Bulină', b: 'B · Pin', c: 'C · Etichetă' };
  const bar = document.createElement('nav');
  bar.className = 'skin-bar';
  bar.innerHTML = `<span>Variante de iconițe pe hartă</span><span>${Object.keys(names).map((k) =>
    `<a href="?pins=${k}${location.hash}"${k === STYLE ? ' aria-current="page"' : ''}>${names[k]}</a>`).join('')}<a href="./${location.hash}">Actual</a></span>`;
  document.body.insertBefore(bar, document.body.firstChild);
}
