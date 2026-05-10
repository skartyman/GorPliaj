const CACHE_VERSION = 'admin-v3';
const STATIC_CACHE = `gorpliaj-admin-static-${CACHE_VERSION}`;
const PAGES_CACHE = `gorpliaj-admin-pages-${CACHE_VERSION}`;
const PRECACHE_URLS = [
  '/admin/dashboard',
  '/admin/manifest.webmanifest?v=2'
];

function isNavigationRequest(request) {
  return request.mode === 'navigate' || request.destination === 'document';
}

function isSameOrigin(url) {
  return url.origin === self.location.origin;
}

function isAdminPath(pathname) {
  return pathname.startsWith('/admin');
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS.map((url) => new Request(url, { cache: 'reload' }))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith('gorpliaj-admin-') && ![STATIC_CACHE, PAGES_CACHE].includes(key))
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

// Admin assets are intentionally left uncached at runtime so stale responses do
// not interfere with uploads, editor saves, or asset hot updates.
self.addEventListener('fetch', () => {});
