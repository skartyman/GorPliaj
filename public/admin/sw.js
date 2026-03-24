const CACHE_VERSION = 'admin-v1';
const STATIC_CACHE = `gorpliaj-admin-static-${CACHE_VERSION}`;
const PAGES_CACHE = `gorpliaj-admin-pages-${CACHE_VERSION}`;
const PRECACHE_URLS = [
  '/admin/dashboard',
  '/admin/manifest.webmanifest'
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

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const requestUrl = new URL(event.request.url);
  if (!isSameOrigin(requestUrl) || !isAdminPath(requestUrl.pathname) || requestUrl.pathname.startsWith('/api/')) {
    return;
  }

  if (isNavigationRequest(event.request)) {
    event.respondWith(
      fetch(event.request, { cache: 'no-store' })
        .then((response) => {
          const copy = response.clone();
          caches.open(PAGES_CACHE).then((cache) => cache.put(event.request, copy));
          return response;
        })
        .catch(async () => {
          const cache = await caches.open(PAGES_CACHE);
          return cache.match(event.request) || cache.match('/admin/dashboard');
        })
    );

    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const network = fetch(event.request)
        .then((response) => {
          if (response.ok) {
            caches.open(STATIC_CACHE).then((cache) => cache.put(event.request, response.clone()));
          }

          return response;
        })
        .catch(() => null);

      return cached || network;
    })
  );
});
