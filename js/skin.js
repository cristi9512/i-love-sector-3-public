// Design-review only: ?skin=a|b|c loads an alternative stylesheet over the
// normal one. Loaded synchronously in <head> so there is no flash.
(function () {
  var SKINS = {
    a: { name: 'A · Serviciu public', theme: '#0b0c0c' },
    b: { name: 'B · Registru', theme: '#1d2125' },
    c: { name: 'C · Aplicație', theme: '#f2f2f7' },
  };
  var m = /[?&]skin=([abc])\b/.exec(location.search);
  var key = m && m[1];
  if (!key) return;
  document.documentElement.setAttribute('data-skin', key);
  document.write('<link rel="stylesheet" href="skins/' + key + '.css"><link rel="stylesheet" href="skins/bar.css">');
  var tc = document.querySelector('meta[name="theme-color"]');
  if (tc) tc.setAttribute('content', SKINS[key].theme);
  document.addEventListener('DOMContentLoaded', function () {
    var bar = document.createElement('nav');
    bar.className = 'skin-bar';
    bar.setAttribute('aria-label', 'Design proposals');
    var html = '<a href="design/">Propuneri de design</a><span>';
    Object.keys(SKINS).forEach(function (k) {
      html += '<a href="?skin=' + k + location.hash + '"' + (k === key ? ' aria-current="page"' : '') + '>' + SKINS[k].name + '</a>';
    });
    html += '<a href="./' + location.hash + '">Actual</a></span>';
    bar.innerHTML = html;
    document.body.insertBefore(bar, document.body.firstChild);
  });
})();
