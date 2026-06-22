import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';
import { LocaleProvider } from './state/locale';
import { CartProvider } from './state/cart';
import { SettingsProvider } from './state/settings';
import './styles.css';
import './guest-modal-fix.css';

// Sync theme before React mounts
const savedTheme = localStorage.getItem('theme');
if (savedTheme === 'light') {
  document.documentElement.dataset.theme = 'light';
}

async function cleanupLegacyServiceWorkers() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return;
  }

  try {
    const registrations = await navigator.serviceWorker.getRegistrations();

    await Promise.all(
      registrations.map(async (registration) => {
        const scope = String(registration.scope || '');
        const activeScriptUrl =
          registration.active?.scriptURL ||
          registration.waiting?.scriptURL ||
          registration.installing?.scriptURL ||
          '';

        if (scope.includes('/admin/')) {
          return;
        }

        if (activeScriptUrl.includes('/admin/sw.js')) {
          return;
        }

        await registration.unregister();
      })
    );

    if ('caches' in window) {
      const cacheKeys = await caches.keys();

      await Promise.all(
        cacheKeys
          .filter((cacheKey) => cacheKey.startsWith('gorpliaj-'))
          .map((cacheKey) => caches.delete(cacheKey))
      );
    }
  } catch (error) {
    console.error('Failed to cleanup legacy public service worker', error);
  }
}

cleanupLegacyServiceWorkers();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(reg => console.log('SW registered'))
      .catch(err => console.log('SW error', err));
  });
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <SettingsProvider>
          <LocaleProvider>
            <CartProvider>
              <App />
            </CartProvider>
          </LocaleProvider>
        </SettingsProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>
);
