// Offline support: the app shell is cached; everything is fetched network-first
// so the archive is always fresh when online. Archive month files are not cached
// (they are large); the last viewed data is lost offline, the shell still opens.
const CACHE = 'sesizari-v4';
const SHELL = ['./', 'index.html', 'styles.css', 'js/app.js', 'js/data.js', 'js/geo.js', 'js/i18n.js', 'js/insights.js', 'js/icons.js', 'js/theme.js', 'js/about.js', 'despre.html',
  'assets/sector3.json', 'assets/icon.svg', 'manifest.webmanifest'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin || url.pathname.includes('/data/')) return;
  e.respondWith(fetch(e.request).then((res) => {
    if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)); }
    return res;
  }).catch(() => caches.match(e.request).then((r) => r || caches.match('index.html'))));
});
