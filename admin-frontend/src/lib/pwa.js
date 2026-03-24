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
    return await navigator.serviceWorker.register('/admin/sw.js', {
      scope: '/admin/'
    });
  } catch (error) {
    console.error('Admin service worker registration failed', error);
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
