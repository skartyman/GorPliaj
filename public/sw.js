self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith('gorpliaj-'))
            .map((key) => caches.delete(key))
        )
      )
      .then(async () => {
        const clients = await self.clients.matchAll({ includeUncontrolled: true });

        await Promise.all(
          clients.map((client) => client.navigate(client.url).catch(() => null))
        );

        await self.registration.unregister();
      })
  );
});

self.addEventListener('fetch', () => {
});
