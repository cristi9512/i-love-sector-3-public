// "Cum funcționează" page: language switch, theme button, live archive facts.
import { t, setLang, getLang, locale } from './i18n.js';
import { ic } from './icons.js';

const $ = (s) => document.querySelector(s);
const TITLE = { ro: 'Cum funcționează · Sesizări Sector 3', en: 'How it works · Sector 3 Reports' };

function pickLang() {
  const p = new URLSearchParams(location.hash.slice(1) || location.search.slice(1)).get('lang');
  let lang = p;
  if (!lang) { try { lang = localStorage.getItem('lang'); } catch { /* private mode */ } }
  if (!lang) lang = (navigator.language || 'ro').toLowerCase().startsWith('ro') ? 'ro' : 'en';
  return lang === 'en' ? 'en' : 'ro';
}

let meta = null;
function renderLive() {
  if (!meta) return;
  const fmtN = (n) => new Intl.NumberFormat(locale()).format(n);
  const when = new Intl.DateTimeFormat(locale(), { dateStyle: 'long', timeStyle: 'short', timeZone: 'Europe/Bucharest' });
  const day = new Intl.DateTimeFormat(locale(), { dateStyle: 'long', timeZone: 'UTC' });
  const vals = {
    lastRun: meta.lastRun ? when.format(new Date(meta.lastRun)) : '—',
    total: meta.totals?.incidents != null ? fmtN(meta.totals.incidents) : '—',
    from: meta.coverageFrom ? day.format(new Date(meta.coverageFrom + 'T12:00:00Z')) : '—',
  };
  for (const el of document.querySelectorAll('[data-live]')) el.textContent = vals[el.dataset.live];
}

const THEME_NEXT = { auto: 'light', light: 'dark', dark: 'auto' };
const THEME_ICON = { auto: 'themeAuto', light: 'sun', dark: 'moon' };
function renderThemeBtn() {
  const btn = $('#themeBtn'), pref = window.theme?.pref || 'auto';
  btn.innerHTML = ic(THEME_ICON[pref]);
  btn.title = t('theme_' + pref) + ' · ' + t('themeNext', { next: t('theme_' + THEME_NEXT[pref]).toLowerCase() });
  btn.setAttribute('aria-label', t('theme_' + pref));
}

function apply() {
  const lang = getLang();
  document.documentElement.lang = lang;
  document.title = TITLE[lang];
  for (const a of document.querySelectorAll('article[data-lang]')) a.hidden = a.dataset.lang !== lang;
  for (const el of document.querySelectorAll('[data-l]')) el.textContent = t(el.dataset.l);
  $('#langBtn').textContent = t('langSwitch');
  // keep the chosen language when going back to the map
  for (const a of document.querySelectorAll('.tabs a, .brand')) {
    const base = a.getAttribute('href').split('#')[0];
    const hash = a.getAttribute('href').includes('tab=insights') ? 'tab=insights&' : '';
    if (base !== 'despre') a.setAttribute('href', `${base}#${hash}lang=${lang}`);
  }
  renderThemeBtn();
  renderLive();
}

setLang(pickLang());
apply();
$('#langBtn').addEventListener('click', () => {
  setLang(getLang() === 'ro' ? 'en' : 'ro');
  try { localStorage.setItem('lang', getLang()); } catch { /* private mode */ }
  apply();
});
$('#themeBtn').addEventListener('click', () => window.theme?.set(THEME_NEXT[window.theme.pref]));
document.addEventListener('themechange', renderThemeBtn);
fetch('data/meta.json', { cache: 'no-cache' }).then((r) => (r.ok ? r.json() : null)).then((m) => { meta = m; renderLive(); }).catch(() => {});
