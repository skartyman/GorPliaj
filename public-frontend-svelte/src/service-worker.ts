/// <reference lib="webworker" />

const VERSION = 'v1-shell';

self.addEventListener('install', () => {
  // PWA foundation: version marker only.
  // Offline strategies will be introduced on the next migration steps.
  console.log(`[sw] install ${VERSION}`);
});

self.addEventListener('activate', () => {
  console.log(`[sw] activate ${VERSION}`);
});
