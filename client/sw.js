/**
 * skyLens Service Worker — v4 (network-first for all app files)
 * 
 * KEY CHANGE: JS, HTML are NEVER served from cache.
 * Only images and fonts get cached. This prevents the "CSS-only" bug
 * caused by stale cached JavaScript being served after file updates.
 */

const CACHE_NAME = 'skylens-v4';

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // NEVER cache these — always fetch fresh from server
  const neverCache = ['/js/', '/css/', '.html', '/', '/api/'];
  if (neverCache.some(p => url.pathname.startsWith(p) || url.pathname.endsWith(p) || url.pathname === '/')) {
    event.respondWith(
      fetch(event.request).catch(() =>
        new Response('Offline - please reconnect', { status: 503 })
      )
    );
    return;
  }

  // Cache fonts and images from CDN
  if (url.hostname.includes('fonts.') || url.hostname.includes('cdnjs.') || url.hostname.includes('jsdelivr.')) {
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) return cached;
        return fetch(event.request).then(res => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
          }
          return res;
        });
      })
    );
    return;
  }

  // Everything else: network first
  event.respondWith(fetch(event.request));
});
