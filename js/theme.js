// Theme: 'auto' follows the system, 'light' / 'dark' are a saved choice.
// Loaded synchronously in <head> so the page never flashes the wrong theme.
// Sets html.dark and fires a 'themechange' event on document when it changes.
(function () {
  var KEY = 'theme';
  var mq = window.matchMedia('(prefers-color-scheme: dark)');
  function saved() {
    try { var v = localStorage.getItem(KEY); return v === 'light' || v === 'dark' ? v : 'auto'; } catch (e) { return 'auto'; }
  }
  var pref = saved();
  function isDark() { return pref === 'dark' || (pref === 'auto' && mq.matches); }
  function apply() {
    var dark = isDark();
    var root = document.documentElement;
    if (root.classList.contains('dark') === dark && root.dataset.theme === pref) return;
    root.classList.toggle('dark', dark);
    root.dataset.theme = pref;
    document.dispatchEvent(new CustomEvent('themechange', { detail: { pref: pref, dark: dark } }));
  }
  window.theme = {
    get pref() { return pref; },
    get dark() { return isDark(); },
    set: function (v) {
      pref = v;
      try { if (v === 'auto') localStorage.removeItem(KEY); else localStorage.setItem(KEY, v); } catch (e) { /* private mode */ }
      apply();
    },
  };
  mq.addEventListener('change', function () { if (pref === 'auto') apply(); });
  apply();
})();
