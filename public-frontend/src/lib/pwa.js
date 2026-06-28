let deferredInstallPrompt = null;
const installListeners = new Set();

function isPublicClientPath() {
  return typeof window !== 'undefined' && !window.location.pathname.startsWith('/admin');
}

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
  return promptEvent.userChoice;
}

export function isStandaloneApp() {
  if (typeof window === 'undefined') {
    return false;
  }

  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (event) => {
    if (!isPublicClientPath()) {
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
}
