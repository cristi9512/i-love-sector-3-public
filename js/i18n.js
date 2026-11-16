// UI strings (Romanian + English). Data from the city (descriptions, replies)
// stays in Romanian; category names are translated where known.

const STR = {
  ro: {
    title: 'Sesizări Sector 3',
    subtitle: 'Ce raportează vecinii tăi și ce răspunde primăria',
    tabList: 'Hartă și listă', tabInsights: 'Statistici', tabAbout: 'Cum funcționează',
    report: 'Trimite o sesizare', install: 'Instalează', langSwitch: 'EN',
    theme_auto: 'Temă automată (ca sistemul)', theme_light: 'Temă luminoasă', theme_dark: 'Temă întunecată', themeNext: 'următoarea: {next}',
    searchPh: 'Caută în descrieri, răspunsuri, nr. sesizare (ex. CAS-0274369)…',
    r24h: '24h', r7: '7 zile', r30: '30 zile', r90: '3 luni', r180: '6 luni', rCustom: 'Interval…', apply: 'Aplică',
    sAll: 'Toate', sOpen: 'În lucru', sGood: 'Rezolvate', sBad: 'Nefavorabil', sOther: 'Altele',
    allCats: 'Toate categoriile', nCats: '{n} categorii', catAll: 'Toate', catNone: 'Niciuna',
    allAreas: 'Toate cartierele', moreFilters: 'Mai multe filtre', hideParking: 'Ascunde parcările',
    fReply: 'Răspunsul primăriei', fReplyAny: 'Oricare', fReplyYes: 'Cu răspuns', fReplyNo: 'Fără răspuns',
    fStuck: 'Blocate', fStuckAny: 'Oricând', fStuck7: 'În lucru de peste 7 zile', fStuck30: 'În lucru de peste 30 de zile',
    fEdited: 'Doar descrieri editate de primărie',
    fRemoved: 'Șterse de primărie', fRemovedHide: 'Ascunde', fRemovedInclude: 'Include', fRemovedOnly: 'Doar acestea',
    fZone: 'Zonă', nearMe: 'Lângă mine', pickOnMap: 'Alege pe hartă', clearZone: 'Șterge zona', radius: 'Rază',
    fInView: 'Listează doar ce se vede pe hartă', clearAll: 'Șterge toate filtrele',
    pickHint: 'Atinge harta pentru a alege centrul zonei',
    geoDenied: 'Nu am putut afla locația ta.',
    chipZone: 'Zonă {r} m', chipArea: 'Cartier: {a}', chipReplyYes: 'Cu răspuns', chipReplyNo: 'Fără răspuns',
    chipStuck: 'În lucru > {n} zile', chipEdited: 'Editate', chipRemovedInclude: 'Include șterse', chipRemovedOnly: 'Doar șterse',
    chipInView: 'Zona vizibilă', chipSearch: '„{q}”', chipParking: 'Fără parcări',
    loading: 'Se încarcă…', reports1: 'sesizare', reportsN: 'sesizări',
    sortNew: 'Cele mai noi', sortOld: 'Cele mai vechi', sortLong: 'Descrieri lungi', sortUpdated: 'Actualizate recent',
    noResults: 'Nicio sesizare găsită', noResultsHint: 'Încearcă alt interval, altă categorie sau alt termen de căutare.',
    showMore: 'Afișează mai multe ({n} rămase)', noDesc: 'Fără descriere', reply: 'Răspuns',
    edited: 'editată', removedBadge: 'ștearsă de primărie',
    statTotal: 'sesizări', statOpen: 'în lucru', statGood: 'rezolvate', statBad: 'nefavorabil', statReplied: 'au răspuns public',
    statTop: 'cea mai frecventă',
    legendOpen: 'În lucru', legendGood: 'Rezolvată', legendPartial: 'Parțial', legendBad: 'Nefavorabil', legendOther: 'Altele',
    pins: 'Puncte', heat: 'Densitate',
    dataFresh: 'Arhivă actualizată {t}', dataLive: 'plus date live de la primărie', dataLiveOnly: 'Date live de la primărie (arhiva nu e disponibilă)',
    partialFail: '{n} din {m} cereri au eșuat. Unele sesizări pot lipsi.', capHit: 'Unele zile au peste 1500 de sesizări; serverul a limitat rezultatele.',
    notFound: 'Sesizarea {t} nu a fost găsită.', linkCopied: 'Link copiat', copyPrompt: 'Copiază linkul:',
    validRange: 'Alege un interval valid.', maxRange: 'Intervalul maxim este de un an.',
    export: 'Export', exportCsv: 'Descarcă CSV', exportJson: 'Descarcă JSON',
    // detail
    dDesc: 'Descrierea sesizării', dReply: 'Răspunsul primăriei', dNoReplyOpen: 'Sesizarea este încă în lucru. Nu există un răspuns public.',
    dNoReply: 'Nu există un răspuns public.', dEditedNote: '* Descrierea a fost editată de primărie (ex. date personale anonimizate).',
    dLocation: 'Locație', dAddress: 'Adresă aprox.', dSearching: 'se caută…', dUnavailable: 'indisponibilă', dCoords: 'Coordonate',
    dTicket: 'Nr. sesizare', dReg: 'Nr. înregistrare', dArea: 'Cartier', dNearby: 'Alte sesizări în apropiere (< 75 m)',
    dHistory: 'Istoric', dCreated: 'Trimisă', dFirstSeen: 'Intrată în arhivă · {s}', hStatus: 'Stare: {s}', hReply: 'Răspuns publicat sau actualizat',
    hDesc: 'Descriere editată de primărie', hCat: 'Categorie schimbată în {c}', hRemoved: 'Ștearsă de primărie', hRestored: 'Republicată',
    hNote: 'Orele schimbărilor sunt momentul în care arhiva le-a observat (verificare orară; pentru sesizările mai vechi de 4 zile, cam o dată pe zi).',
    dClosedAfter: 'Închisă după {d}', dOpenFor: 'Deschisă de {d}',
    copyLink: 'Copiază link', gmaps: 'Google Maps', official: 'Harta oficială', reportHere: 'Raportează o problemă aici',
    close: 'Închide',
    // insights
    iTitle: 'Statistici pentru filtrele alese', iVsPrev: 'Săgețile compară cu perioada anterioară de aceeași lungime. Sesizările recente au avut mai puțin timp să fie rezolvate, așa că ponderile de rezolvare par mai mici pentru perioadele recente.', iNoPrev: 'fără comparație (perioada anterioară nu e în arhivă)',
    kTotalOf: 'Sesizări · {s}', kShareAll: 'din toate cele {n} sesizări', kPartial: 'Din care rezolvate parțial', kAge: 'Vechime mediană', kOld7: 'Deschise de peste 7 zile',
    shareCat: '{p}% din categorie', shareArea: '{p}% din cartier',
    kTotal: 'Sesizări', kResolved: 'Rezolvate', kRejected: 'Nefavorabil', kOpen: 'Încă în lucru', kReplied: 'Cu răspuns public', kTtc: 'Timp median până la închidere',
    kTtcNone: 'încă se colectează', kN: 'din {n} sesizări',
    cDaily: 'Sesizări pe zi, după rezultat', cHourly: 'Sesizări pe oră, după rezultat', cByCat: 'Rezultat pe categorii',
    cHeat: 'Când se trimit sesizările', cAreas: 'Cartiere', cTtc: 'Cât durează până la închidere', cHot: 'Locuri cu probleme repetate',
    cReplies: 'Răspunsuri tip ale primăriei', cRecent: 'Ultimele schimbări observate', cFeeds: 'Abonează-te la noutăți (RSS)',
    asTable: 'Vezi ca tabel', day: 'Zi', hour: 'Ora', category: 'Categorie', count: 'Nr.', share: 'Pondere',
    weekdays: ['Lun', 'Mar', 'Mie', 'Joi', 'Vin', 'Sâm', 'Dum'],
    resolvedPct: '{p}% rezolvate', openN: '{n} în lucru', lastReport: 'ultima {t}',
    ttcNote: 'Calculat doar pentru sesizările pe care arhiva le-a văzut deschise și apoi închise (de la {d}). Precizie: aprox. o oră pentru cele recente, o zi pentru cele mai vechi.',
    ttcMedian: 'median {d}', ttcP75: '75% în sub {d}', firstReply: 'Prim răspuns',
    hotNote: 'Același tip de problemă, raportat de cel puțin 3 ori într-o rază de ~60 m.', hotNone: 'Niciun loc cu sesizări repetate în perioada aleasă.',
    repliesNote: 'Răspunsuri grupate după primele cuvinte; numerele și plăcuțele sunt ignorate.', repliesOf: '{p}% din răspunsuri',
    recentNone: 'Nicio schimbare observată încă în perioada aleasă.',
    areaHint: 'Apasă pe un cartier pentru a filtra.', feedsHint: 'Linkuri pentru cititoare RSS (Feedly, Inoreader, Outlook…):',
    rssAll: 'Tot Sectorul 3', perCapita: '',
    dur: { m: '{n} min', h: '{n} h', d: '{n} zile', d1: '1 zi' },
    sCount: { good: 'rezolvate', partial: 'parțial', bad: 'nefavorabil', other: 'altele', open: 'în lucru' },
    footer: 'Date preluate din serviciul public CityCare al Primăriei Sectorului 3 și arhivate orar. Proiect neoficial.',
    sourceCode: 'Cod sursă și date',
  },
  en: {
    title: 'Sector 3 Reports',
    subtitle: 'What your neighbours report and how the city hall answers',
    tabList: 'Map & list', tabInsights: 'Insights', tabAbout: 'How it works',
    report: 'Report a problem', install: 'Install', langSwitch: 'RO',
    theme_auto: 'Automatic theme (follows system)', theme_light: 'Light theme', theme_dark: 'Dark theme', themeNext: 'next: {next}',
    searchPh: 'Search descriptions, replies, ticket no. (e.g. CAS-0274369)…',
    r24h: '24h', r7: '7 days', r30: '30 days', r90: '3 months', r180: '6 months', rCustom: 'Range…', apply: 'Apply',
    sAll: 'All', sOpen: 'In progress', sGood: 'Resolved', sBad: 'Rejected', sOther: 'Other',
    allCats: 'All categories', nCats: '{n} categories', catAll: 'All', catNone: 'None',
    allAreas: 'All neighbourhoods', moreFilters: 'More filters', hideParking: 'Hide parking',
    fReply: "City hall's reply", fReplyAny: 'Any', fReplyYes: 'With reply', fReplyNo: 'No reply',
    fStuck: 'Stuck', fStuckAny: 'Any time', fStuck7: 'In progress for over 7 days', fStuck30: 'In progress for over 30 days',
    fEdited: 'Only descriptions edited by the city hall',
    fRemoved: 'Deleted by the city hall', fRemovedHide: 'Hide', fRemovedInclude: 'Include', fRemovedOnly: 'Only these',
    fZone: 'Area', nearMe: 'Near me', pickOnMap: 'Pick on map', clearZone: 'Clear area', radius: 'Radius',
    fInView: 'List only what is visible on the map', clearAll: 'Clear all filters',
    pickHint: 'Tap the map to choose the centre of the area',
    geoDenied: 'Could not get your location.',
    chipZone: 'Area {r} m', chipArea: 'Neighbourhood: {a}', chipReplyYes: 'With reply', chipReplyNo: 'No reply',
    chipStuck: 'Open > {n} days', chipEdited: 'Edited', chipRemovedInclude: 'Incl. deleted', chipRemovedOnly: 'Only deleted',
    chipInView: 'Visible area', chipSearch: '“{q}”', chipParking: 'No parking',
    loading: 'Loading…', reports1: 'report', reportsN: 'reports',
    sortNew: 'Newest', sortOld: 'Oldest', sortLong: 'Longest descriptions', sortUpdated: 'Recently updated',
    noResults: 'No reports found', noResultsHint: 'Try another period, category or search term.',
    showMore: 'Show more ({n} left)', noDesc: 'No description', reply: 'Reply',
    edited: 'edited', removedBadge: 'deleted by city hall',
    statTotal: 'reports', statOpen: 'in progress', statGood: 'resolved', statBad: 'rejected', statReplied: 'have a public reply',
    statTop: 'most common',
    legendOpen: 'In progress', legendGood: 'Resolved', legendPartial: 'Partly', legendBad: 'Rejected', legendOther: 'Other',
    pins: 'Pins', heat: 'Density',
    dataFresh: 'Archive updated {t}', dataLive: 'plus live data from the city hall', dataLiveOnly: 'Live data from the city hall (archive unavailable)',
    partialFail: '{n} of {m} requests failed. Some reports may be missing.', capHit: 'Some days have over 1500 reports; the server limited the results.',
    notFound: 'Report {t} was not found.', linkCopied: 'Link copied', copyPrompt: 'Copy the link:',
    validRange: 'Choose a valid range.', maxRange: 'The maximum range is one year.',
    export: 'Export', exportCsv: 'Download CSV', exportJson: 'Download JSON',
    dDesc: 'Description', dReply: "City hall's reply", dNoReplyOpen: 'Still in progress. No public reply yet.',
    dNoReply: 'No public reply.', dEditedNote: '* The description was edited by the city hall (e.g. personal data removed).',
    dLocation: 'Location', dAddress: 'Approx. address', dSearching: 'looking up…', dUnavailable: 'unavailable', dCoords: 'Coordinates',
    dTicket: 'Ticket no.', dReg: 'Registration no.', dArea: 'Neighbourhood', dNearby: 'Other reports nearby (< 75 m)',
    dHistory: 'History', dCreated: 'Submitted', dFirstSeen: 'Entered the archive · {s}', hStatus: 'Status: {s}', hReply: 'Reply published or updated',
    hDesc: 'Description edited by the city hall', hCat: 'Category changed to {c}', hRemoved: 'Deleted by the city hall', hRestored: 'Published again',
    hNote: 'Change times are when the archive noticed them (checked hourly; reports older than 4 days about once a day).',
    dClosedAfter: 'Closed after {d}', dOpenFor: 'Open for {d}',
    copyLink: 'Copy link', gmaps: 'Google Maps', official: 'Official map', reportHere: 'Report a problem here',
    close: 'Close',
    iTitle: 'Insights for the selected filters', iVsPrev: 'Arrows compare with the previous period of the same length. Recent reports have had less time to be resolved, so resolution shares look lower for recent periods.', iNoPrev: 'no comparison (previous period not in the archive)',
    kTotalOf: 'Reports · {s}', kShareAll: 'of all {n} reports', kPartial: 'Of which partly resolved', kAge: 'Median age', kOld7: 'Open for over 7 days',
    shareCat: '{p}% of the category', shareArea: '{p}% of the area',
    kTotal: 'Reports', kResolved: 'Resolved', kRejected: 'Rejected', kOpen: 'Still open', kReplied: 'With a public reply', kTtc: 'Median time to close',
    kTtcNone: 'still collecting', kN: 'from {n} reports',
    cDaily: 'Reports per day, by outcome', cHourly: 'Reports per hour, by outcome', cByCat: 'Outcome by category',
    cHeat: 'When reports are sent', cAreas: 'Neighbourhoods', cTtc: 'How long until closed', cHot: 'Places with repeated problems',
    cReplies: "City hall's template replies", cRecent: 'Latest changes noticed', cFeeds: 'Subscribe to updates (RSS)',
    asTable: 'View as table', day: 'Day', hour: 'Hour', category: 'Category', count: 'No.', share: 'Share',
    weekdays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    resolvedPct: '{p}% resolved', openN: '{n} open', lastReport: 'last {t}',
    ttcNote: 'Only for reports the archive saw open and then closed (since {d}). Accuracy: about an hour for recent ones, a day for older ones.',
    ttcMedian: 'median {d}', ttcP75: '75% within {d}', firstReply: 'First reply',
    hotNote: 'The same kind of problem reported at least 3 times within ~60 m.', hotNone: 'No places with repeated reports in this period.',
    repliesNote: 'Replies grouped by their first words; numbers and plates are ignored.', repliesOf: '{p}% of replies',
    recentNone: 'No changes noticed yet in this period.',
    areaHint: 'Click a neighbourhood to filter.', feedsHint: 'Links for RSS readers (Feedly, Inoreader, Outlook…):',
    rssAll: 'All of Sector 3', perCapita: '',
    dur: { m: '{n} min', h: '{n} h', d: '{n} days', d1: '1 day' },
    sCount: { good: 'resolved', partial: 'partly', bad: 'rejected', other: 'other', open: 'open' },
    footer: 'Data from the public CityCare service of Sector 3 City Hall, archived hourly. Unofficial project.',
    sourceCode: 'Source code and data',
  },
};

const CATEGORIES_EN = {
  '1': 'Parking', '2': 'Occupied parking spaces', '3': 'Green spaces', '4': 'Pavement and alley works',
  '5': 'Taxes', '6': 'Waste, recycling and cleaning', '7': 'Building checks / unauthorised works', '8': 'Construction sites',
  '9': 'Other', '10': 'Streets', '11': 'Parks', '12': 'Parking markings', '13': 'Schools (administrative issues)',
  '14': 'Tree trimming / felling', '15': 'Pets', '16': 'Abandoned cars', '17': 'Unauthorised street trading',
  '18': 'Environment / air quality', '19': 'Public order and noise', '20': 'Unsanitary land', '21': 'Building renovation',
  '22': 'Commercial premises', '23': 'Owners’ associations', '24': 'Land registry', '25': 'Event permits',
  '26': 'Towed cars', '27': 'Illegal stopping', '32': 'Disability access ramps', '200': 'Illegal parking',
};

let lang = 'ro';
export const getLang = () => lang;
export const locale = () => (lang === 'ro' ? 'ro-RO' : 'en-GB');
export function setLang(l) {
  lang = STR[l] ? l : 'ro';
  document.documentElement.lang = lang;
}

export function t(key, vars) {
  let s = STR[lang][key] ?? STR.ro[key] ?? key;
  if (vars && typeof s === 'string') s = s.replace(/\{(\w+)\}/g, (_, k) => (vars[k] ?? ''));
  return s;
}

export const catNameEn = (id) => CATEGORIES_EN[id] || '';

export function catName(id, fallback) {
  return lang === 'en' ? CATEGORIES_EN[id] || fallback : fallback;
}

/** Human status label for a status key + raw city label. */
export function statusText(key, raw = '') {
  if (lang === 'ro') {
    let nice = raw.replace(/^(închisă|deschisă)\.\s*/i, '').trim() || raw;
    if (/^noua$/i.test(nice)) nice = 'Nouă';
    return nice.charAt(0).toUpperCase() + nice.slice(1).toLowerCase();
  }
  const f = raw.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  if (f.includes('noua')) return 'New';
  if (key === 'open') return 'In progress';
  if (key === 'bad') return 'Rejected';
  if (key === 'partial') return 'Partly resolved';
  if (key === 'good') return 'Resolved';
  if (f.includes('declinat')) return 'Passed to another authority';
  if (f.includes('intern')) return 'Resolved internally';
  return raw;
}

/** Applies translations to static markup: data-i18n, data-i18n-ph, data-i18n-title. */
export function applyStatic(root = document) {
  root.querySelectorAll('[data-i18n]').forEach((el) => { el.textContent = t(el.dataset.i18n); });
  root.querySelectorAll('[data-i18n-ph]').forEach((el) => { el.placeholder = t(el.dataset.i18nPh); });
  root.querySelectorAll('[data-i18n-title]').forEach((el) => { el.title = t(el.dataset.i18nTitle); el.setAttribute('aria-label', t(el.dataset.i18nTitle)); });
  document.title = t('title');
}

export function duration(ms) {
  const m = Math.round(ms / 60000);
  const d = STR[lang].dur;
  if (m < 60) return d.m.replace('{n}', Math.max(1, m));
  const h = m / 60;
  if (h < 48) return d.h.replace('{n}', h < 10 ? h.toFixed(1).replace('.0', '') : Math.round(h));
  const days = Math.round(h / 24);
  return days === 1 ? d.d1 : d.d.replace('{n}', days);
}
