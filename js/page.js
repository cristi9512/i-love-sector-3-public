// Static pages (/raport/…, /cartier/…): theme button and "copy link".
import { ic } from './icons.js';

const NEXT = { auto: 'light', light: 'dark', dark: 'auto' };
const ICON = { auto: 'themeAuto', light: 'sun', dark: 'moon' };
const LABEL = { auto: 'Temă automată (ca sistemul)', light: 'Temă luminoasă', dark: 'Temă întunecată' };
const btn = document.getElementById('themeBtn');
function renderTheme() {
  const pref = window.theme?.pref || 'auto';
  btn.innerHTML = ic(ICON[pref]);
  btn.title = LABEL[pref];
  btn.setAttribute('aria-label', LABEL[pref]);
}
btn?.addEventListener('click', () => window.theme?.set(NEXT[window.theme.pref]));
document.addEventListener('themechange', renderTheme);
if (btn) renderTheme();

document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-copy]');
  if (!b) return;
  navigator.clipboard?.writeText(b.dataset.copy).then(() => {
    const old = b.textContent;
    b.textContent = 'Link copiat';
    setTimeout(() => { b.textContent = old; }, 1500);
  }, () => {});
});
