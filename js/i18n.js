// UI strings (Romanian + English). Data from the city (descriptions, replies)
// stays in Romanian; category names are translated where known.

const STR = {
  ro: {
    title: 'Sesizări Sector 3',
    subtitle: 'Ce raportează vecinii tăi și ce răspunde primăria',
    tabList: 'Hartă și listă', tabInsights: 'Statistici', tabReport: 'Raport lunar', tabAbout: 'Cum funcționează',
    report: 'Trimite o sesizare', install: 'Instalează', langSwitch: 'EN',
    theme_auto: 'Temă automată (ca sistemul)', theme_light: 'Temă luminoasă', theme_dark: 'Temă întunecată', themeNext: 'următoarea: {next}',
    searchPh: 'Caută în descrieri, răspunsuri, nr. sesizare (ex. CAS-0274369)…',
    r24h: '24h', r7: '7 zile', r30: '30 zile', r90: '3 luni', r180: '6 luni', rCustom: 'Interval…', apply: 'Aplică',
    sAll: 'Toate', sOpen: 'În lucru', sGood: 'Rezolvate', sBad: 'Nefavorabil', sOther: 'Altele',
    allCats: 'Toate categoriile', nCats: '{n} categorii', catAll: 'Toate', catNone: 'Niciuna',
    allAreas: 'Toate cartierele', moreFilters: 'Mai multe filtre', hideParking: 'Ascunde parcările',
    fReply: 'Răspunsul primăriei', fReplyAny: 'Oricare', fReplyYes: 'Cu răspuns', fReplyNo: 'Fără răspuns',
    fStuck: 'Blocate', fStuckAny: 'Oricând', fStuck7: 'În lucru de peste 7 zile', fStuck30: 'În lucru de peste 30 de zile (termenul legal)',
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
    hNote: 'Orele schimbărilor sunt momentul în care arhiva le-a observat (verificare la 15 minute; pentru sesizările mai vechi de 4 zile, cam la 6 ore).',
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
    // type of report: parking enforcement vs. city problems
    scAll: 'Toate tipurile', scCivic: 'Probleme în oraș', scParking: 'Parcare și staționare',
    scHint: 'Parcarea și staționarea (parcări ocupate, staționare neregulamentară, mașini ridicate) sunt peste jumătate din sesizări și au alt tipar decât restul, așa că le poți vedea separat.',
    chipScope: 'Doar: {s}',
    // outcomes explained
    ok_good: 'Rezolvată', ok_partial: 'Rezolvată parțial', ok_bad: 'Nefavorabil (respinsă)', ok_declined: 'Declinat competența',
    ok_internal: 'Rezolvată intern', ok_pending: 'În așteptare', ok_unknown: 'Fără status', ok_open: 'În lucru',
    ox_good: 'Primăria spune că problema a fost rezolvată sau că a luat măsuri, de exemplu o amendă.',
    ox_partial: 'Primăria spune că a rezolvat doar o parte din problemă.',
    ox_bad: 'Respinsă: problema nu a fost confirmată la fața locului, lipsesc dovezi (de exemplu fotografii) sau primăria spune că nu poate lua măsuri.',
    ox_declined: 'Primăria spune că problema nu ține de ea și a trimis-o instituției sau serviciului responsabil.',
    ox_internal: 'Închisă fără un rezultat public: de obicei transferată altei direcții a primăriei sau unită cu o altă sesizare despre aceeași problemă.',
    ox_pending: 'Închisă cu statusul „în așteptare”. Primăria nu explică ce înseamnă; sunt doar câteva cazuri.',
    ox_unknown: 'Primăria nu a trimis un status.',
    ox_open: 'Încă deschisă: primăria nu a dat un răspuns final.',
    cOutcomes: 'Ce înseamnă rezultatele', outcomesNote: 'Statusurile sunt ale primăriei; explicațiile sunt deduse din răspunsurile ei. „Altele” din filtre înseamnă declinat competența, rezolvată intern sau în așteptare.',
    // parking vs city problems
    cScope: 'Parcare și staționare față de probleme în oraș', scopeNote: 'Sesizările despre parcare sunt mai multe și se închid altfel, așa că trag în jos sau în sus cifrele pentru tot sectorul.',
    scopeLine: '{n} sesizări · {g}% rezolvate · {b}% respinse',
    // rejections
    cRejections: 'De ce sunt respinse sesizările', rejNote: 'Pentru categoriile cu cele mai multe sesizări respinse: răspunsurile primăriei care apar cel mai des.',
    rejHead: '{n} respinse · {p}% din categorie', rejOf: '{p}% din respingeri', rejNone: 'Nicio sesizare respinsă în selecție.',
    // legal deadline
    overdueBadge: 'Peste 30 de zile', overdueTitle: 'Deschisă de peste 30 de zile, termenul de răspuns din legea petițiilor',
    overdueNote: 'Deschisă de {d} de zile. Legea petițiilor (OG 27/2002) cere un răspuns în 30 de zile, prelungibil cu 15. Nu e clar dacă sesizările din aplicație sunt tratate ca petiții, așa că îl arătăm ca semnal, nu ca încălcare a legii.',
    cOverdue: 'Deschise de peste 30 de zile', overdueAll: '{n} sesizări din tot sectorul sunt deschise de peste 30 de zile, {p}% din cele deschise.',
    overdueAsOf: 'Toate sesizările din arhivă, indiferent de filtre · actualizat {t}', overdueShow: 'Arată-le în listă',
    overdueCat: '{n} · {p}% din cele deschise', overduePeriod: 'din care {n} peste 30 de zile',
    // monthly report
    rTitle: 'Raport lunar', rMonth: 'Luna', rPrint: 'Tipărește', rCopy: 'Copiază linkul', rLoading: 'Se încarcă luna…',
    rNote: 'Tot Sectorul 3, fără filtre. Comparațiile sunt cu luna anterioară.', rPartial: 'Luna e în curs: cifrele sunt până azi.',
    rFirst: 'Arhiva începe pe {d}, așa că luna e incompletă.', rNoPrev: 'Fără comparație: luna anterioară nu e în arhivă.',
    rLead: 'În {m} au fost trimise {n} sesizări{d}. {g}% au fost rezolvate și {b}% respinse; {o} sunt încă în lucru.',
    rLeadCivic: 'Fără parcare și staționare: {n} sesizări, {g}% rezolvate și {b}% respinse.',
    rVsPrev: ' ({d} față de {m})',
    rkTotal: 'Sesizări', rkCivic: 'Probleme în oraș', rkResolved: 'Rezolvate', rkRejected: 'Respinse', rkOpen: 'Încă în lucru', rkOverdue: 'Deschise de peste 30 de zile', rkTtc: 'Timp median până la închidere',
    rCats: 'Pe categorii', rAreas: 'Pe cartiere', rWorstRej: 'Cele mai des respinse', rSlow: 'Cele mai lente', rSpots: 'Locuri care revin',
    rColN: 'Sesizări', rColDelta: 'Față de luna trecută', rColGood: 'Rezolvate', rColBad: 'Respinse', rColOpen: 'În lucru', rColMed: 'Median', rColType: 'Tip',
    rSlowNone: 'Timpul până la închidere e disponibil doar pentru sesizările observate de arhivă din 15 noiembrie 2026.',
    rMinN: 'doar categoriile cu cel puțin {n} sesizări', rCopied: 'Link copiat',
    footer: 'Date preluate din serviciul public CityCare al Primăriei Sectorului 3 și arhivate la fiecare 15 minute. Proiect neoficial.',
    sourceCode: 'Cod sursă și date',
  },
  en: {
    title: 'Sector 3 Reports',
    subtitle: 'What your neighbours report and how the city hall answers',
    tabList: 'Map & list', tabInsights: 'Insights', tabReport: 'Monthly report', tabAbout: 'How it works',
    report: 'Report a problem', install: 'Install', langSwitch: 'RO',
    theme_auto: 'Automatic theme (follows system)', theme_light: 'Light theme', theme_dark: 'Dark theme', themeNext: 'next: {next}',
    searchPh: 'Search descriptions, replies, ticket no. (e.g. CAS-0274369)…',
    r24h: '24h', r7: '7 days', r30: '30 days', r90: '3 months', r180: '6 months', rCustom: 'Range…', apply: 'Apply',
    sAll: 'All', sOpen: 'In progress', sGood: 'Resolved', sBad: 'Rejected', sOther: 'Other',
    allCats: 'All categories', nCats: '{n} categories', catAll: 'All', catNone: 'None',
    allAreas: 'All neighbourhoods', moreFilters: 'More filters', hideParking: 'Hide parking',
    fReply: "City hall's reply", fReplyAny: 'Any', fReplyYes: 'With reply', fReplyNo: 'No reply',
    fStuck: 'Stuck', fStuckAny: 'Any time', fStuck7: 'In progress for over 7 days', fStuck30: 'In progress for over 30 days (legal deadline)',
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
    hNote: 'Change times are when the archive noticed them (checked every 15 minutes; reports older than 4 days about every 6 hours).',
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
    scAll: 'All types', scCivic: 'City problems', scParking: 'Parking',
    scHint: 'Parking and stopping (occupied spaces, illegal stopping, towed cars) are over half of all reports and behave differently from the rest, so you can view them separately.',
    chipScope: 'Only: {s}',
    ok_good: 'Resolved', ok_partial: 'Partly resolved', ok_bad: 'Rejected', ok_declined: 'Passed to another authority',
    ok_internal: 'Resolved internally', ok_pending: 'Pending', ok_unknown: 'No status', ok_open: 'In progress',
    ox_good: 'The city hall says the problem was fixed or that it took action, for example a fine.',
    ox_partial: 'The city hall says only part of the problem was fixed.',
    ox_bad: 'Rejected: the problem was not confirmed on site, evidence was missing (for example photos) or the city says it cannot act.',
    ox_declined: 'The city hall says the problem is not its responsibility and sent it to the institution or service in charge.',
    ox_internal: 'Closed without a public outcome: usually moved to another city-hall department or merged with another report about the same problem.',
    ox_pending: 'Closed with the status “pending”. The city does not explain it; there are only a few cases.',
    ox_unknown: 'The city hall sent no status.',
    ox_open: 'Still open: the city hall has not given a final answer.',
    cOutcomes: 'What the outcomes mean', outcomesNote: 'Statuses are the city hall’s; the explanations are inferred from its replies. “Other” in the filters means passed on, resolved internally or pending.',
    cScope: 'Parking compared with city problems', scopeNote: 'Parking reports are more numerous and close differently, so they pull the figures for the whole sector up or down.',
    scopeLine: '{n} reports · {g}% resolved · {b}% rejected',
    cRejections: 'Why reports are rejected', rejNote: 'For the categories with the most rejected reports: the city hall’s most frequent replies.',
    rejHead: '{n} rejected · {p}% of the category', rejOf: '{p}% of rejections', rejNone: 'No rejected reports in the selection.',
    overdueBadge: 'Over 30 days', overdueTitle: 'Open for over 30 days, the answer deadline in the petitions law',
    overdueNote: 'Open for {d} days. The petitions law (OG 27/2002) requires an answer within 30 days, extendable by 15. It is unclear whether app reports count as petitions, so we show this as a signal, not as a breach of the law.',
    cOverdue: 'Open for over 30 days', overdueAll: '{n} reports across the sector have been open for over 30 days, {p}% of all open reports.',
    overdueAsOf: 'All reports in the archive, regardless of filters · updated {t}', overdueShow: 'Show them in the list',
    overdueCat: '{n} · {p}% of open', overduePeriod: 'of which {n} over 30 days',
    rTitle: 'Monthly report', rMonth: 'Month', rPrint: 'Print', rCopy: 'Copy link', rLoading: 'Loading the month…',
    rNote: 'All of Sector 3, no filters. Comparisons are with the previous month.', rPartial: 'This month is not over: figures are up to today.',
    rFirst: 'The archive starts on {d}, so this month is incomplete.', rNoPrev: 'No comparison: the previous month is not in the archive.',
    rLead: 'In {m}, {n} reports were sent{d}. {g}% were resolved and {b}% rejected; {o} are still in progress.',
    rLeadCivic: 'Without parking: {n} reports, {g}% resolved and {b}% rejected.',
    rVsPrev: ' ({d} compared with {m})',
    rkTotal: 'Reports', rkCivic: 'City problems', rkResolved: 'Resolved', rkRejected: 'Rejected', rkOpen: 'Still open', rkOverdue: 'Open for over 30 days', rkTtc: 'Median time to close',
    rCats: 'By category', rAreas: 'By neighbourhood', rWorstRej: 'Most often rejected', rSlow: 'Slowest to close', rSpots: 'Places that keep coming back',
    rColN: 'Reports', rColDelta: 'vs. last month', rColGood: 'Resolved', rColBad: 'Rejected', rColOpen: 'Open', rColMed: 'Median', rColType: 'Type',
    rSlowNone: 'Time to close is only available for reports the archive observed from 15 November 2026.',
    rMinN: 'only categories with at least {n} reports', rCopied: 'Link copied',
    footer: 'Data from the public CityCare service of Sector 3 City Hall, archived every 15 minutes. Unofficial project.',
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
