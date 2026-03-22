const CACHE_NAME = 'gorpliaj-static-v2';
const APP_ASSETS = ['/index.html', '/styles.css', '/app.js', '/manifest.webmanifest', '/icons/icon.svg'];
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

  return pathname.slice(lastDotIndex);
}

function isCacheableStaticAsset(requestUrl) {
  return STATIC_ASSET_EXTENSIONS.has(getPathExtension(requestUrl.pathname));
}

async function networkFirst(request) {
  const cache = await caches.open(CACHE_NAME);

  try {
    const response = await fetch(request);

    if (response.ok) {
      await cache.put(request, response.clone());
    }

    return response;
  } catch (error) {
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    return cache.match('/index.html');
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  const cachedResponse = await cache.match(request);

  if (cachedResponse) {
    return cachedResponse;
  }

  const response = await fetch(request);

  if (response.ok) {
    await cache.put(request, response.clone());
  }

  return response;
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const requestUrl = new URL(event.request.url);
  if (requestUrl.pathname.startsWith('/api/')) return;

  if (isNavigationRequest(event.request)) {
    event.respondWith(networkFirst(event.request));
    return;
  }

  if (requestUrl.origin !== self.location.origin || !isCacheableStaticAsset(requestUrl)) {
    return;
  }

  event.respondWith(cacheFirst(event.request));
});
