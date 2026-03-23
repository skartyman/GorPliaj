const CACHE_VERSION = 'v3';
const STATIC_CACHE_NAME = `gorpliaj-cache-${CACHE_VERSION}`;
const NAVIGATION_CACHE_NAME = `gorpliaj-pages-${CACHE_VERSION}`;
const PRECACHE_URLS = [
  '/',
  '/menu',
  '/booking',
  '/styles.css',
  '/app.js',
  '/menu.js',
  '/css/booking.css',
  '/js/booking.js',
  '/css/pwa-update.css',
  '/js/pwa-register.js',
  '/manifest.webmanifest',
  '/icons/icon.svg',
  '/icons/Logo.png'
];
const STATIC_ASSET_EXTENSIONS = new Set([
  '.js',
  '.css',
  '.svg',
  '.png',
  '.jpg',
  '.jpeg',
  '.webp',
  '.gif',
  '.woff',
  '.woff2',
  '.ttf',
  '.ico',
  '.json',
  '.webmanifest'
]);

function isNavigationRequest(request) {
  return request.mode === 'navigate' || request.destination === 'document';
}

function getPathExtension(pathname) {
  const lastDotIndex = pathname.lastIndexOf('.');
  if (lastDotIndex === -1) return '';

  return pathname.slice(lastDotIndex).toLowerCase();
}

function isCacheableStaticAsset(requestUrl) {
  return STATIC_ASSET_EXTENSIONS.has(getPathExtension(requestUrl.pathname));
}

function shouldBypassRequest(requestUrl) {
  return requestUrl.origin !== self.location.origin || requestUrl.pathname.startsWith('/api/') || requestUrl.pathname.startsWith('/admin');
}

async function precacheAppShell() {
  const cache = await caches.open(STATIC_CACHE_NAME);
  await cache.addAll(
    PRECACHE_URLS.map(
      (url) =>
        new Request(url, {
          cache: 'reload'
        })
    )
  );
}

async function networkFirst(request) {
  const cache = await caches.open(NAVIGATION_CACHE_NAME);

  try {
    const response = await fetch(request, { cache: 'no-store' });

    if (response.ok) {
      await cache.put(request, response.clone());
    }

    return response;
  } catch (error) {
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    return cache.match('/');
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(STATIC_CACHE_NAME);
  const cachedResponse = await cache.match(request);

  const networkResponsePromise = fetch(request)
    .then((response) => {
      if (response.ok) {
        cache.put(request, response.clone());
      }

      return response;
    })
    .catch(() => null);

  if (cachedResponse) {
    return cachedResponse;
  }

  const networkResponse = await networkResponsePromise;
  if (networkResponse) {
    return networkResponse;
  }

  throw new Error('Static asset is unavailable');
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    precacheAppShell().then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith('gorpliaj-') && ![STATIC_CACHE_NAME, NAVIGATION_CACHE_NAME].includes(key))
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const requestUrl = new URL(event.request.url);
  if (shouldBypassRequest(requestUrl)) {
    return;
  }

  if (isNavigationRequest(event.request)) {
    event.respondWith(networkFirst(event.request));
    return;
  }

  if (!isCacheableStaticAsset(requestUrl)) {
    return;
  }

  event.respondWith(staleWhileRevalidate(event.request));
});
