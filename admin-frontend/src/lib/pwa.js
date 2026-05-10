let deferredInstallPrompt = null;
const installListeners = new Set();

function emitInstallPromptChange() {
  installListeners.forEach((listener) => {
    listener(deferredInstallPrompt);
  });
}

export function registerInstallPromptListener(listener) {
  installListeners.add(listener);
  listener(deferredInstallPrompt);

  return () => {
    installListeners.delete(listener);
  };
}

export async function showInstallPrompt() {
  if (!deferredInstallPrompt) {
    return { outcome: 'unavailable' };
  }

  const promptEvent = deferredInstallPrompt;
  deferredInstallPrompt = null;
  emitInstallPromptChange();

  await promptEvent.prompt();
  const choice = await promptEvent.userChoice;

  return choice;
}

export async function registerAdminServiceWorker() {
  if (!('serviceWorker' in navigator)) {
    return null;
  }

  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(
      registrations
        .filter((registration) => registration.scope.includes('/admin'))
        .map((registration) => registration.unregister())
    );

    if ('caches' in window) {
      const cacheKeys = await caches.keys();
      await Promise.all(
        cacheKeys
          .filter((key) => key.startsWith('gorpliaj-admin-'))
          .map((key) => caches.delete(key))
      );
    }

    return null;
  } catch (error) {
    console.error('Admin service worker cleanup failed', error);
    return null;
  }
}

window.addEventListener('beforeinstallprompt', (event) => {
  if (!window.location.pathname.startsWith('/admin')) {
    return;
  }

  event.preventDefault();
  deferredInstallPrompt = event;
  emitInstallPromptChange();
});

window.addEventListener('appinstalled', () => {
  deferredInstallPrompt = null;
  emitInstallPromptChange();
});
