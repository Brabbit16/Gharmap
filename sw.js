const V = 'gm-v1';
const STATIC = [
  '/',
  '/index.html',
  'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/leaflet.markercluster/1.5.3/MarkerCluster.css',
  'https://cdnjs.cloudflare.com/ajax/libs/leaflet.markercluster/1.5.3/MarkerCluster.Default.css',
  'https://cdnjs.cloudflare.com/ajax/libs/leaflet.markercluster/1.5.3/leaflet.markercluster.min.js',
];

// Install — cache static assets
self.addEventListener('install', e => {
  e.waitUntil(caches.open(V).then(c => c.addAll(STATIC)).then(() => self.skipWaiting()));
});

// Activate — clean old caches
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== V).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

// Fetch — cache first for static, network first for API
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Map tiles — cache aggressively (they don't change)
  if (url.hostname.includes('cartocdn.com') || url.hostname.includes('basemaps')) {
    e.respondWith(caches.open(V).then(c => c.match(e.request).then(r => r || fetch(e.request).then(res => { c.put(e.request, res.clone()); return res; }))));
    return;
  }

  // CDN assets — cache first
  if (url.hostname.includes('cdnjs') || url.hostname.includes('googleapis') || url.hostname.includes('gstatic')) {
    e.respondWith(caches.open(V).then(c => c.match(e.request).then(r => r || fetch(e.request).then(res => { c.put(e.request, res.clone()); return res; }))));
    return;
  }

  // Google Sheets API — network first, fall back to cache
  if (url.hostname.includes('script.google.com')) {
    e.respondWith(fetch(e.request).then(res => { caches.open(V).then(c => c.put(e.request, res.clone())); return res; }).catch(() => caches.match(e.request)));
    return;
  }

  // HTML page — network first with cache fallback
  if (e.request.mode === 'navigate') {
    e.respondWith(fetch(e.request).catch(() => caches.match('/')));
    return;
  }
});
