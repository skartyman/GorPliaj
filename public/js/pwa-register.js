(() => {
  if (!('serviceWorker' in navigator)) {
    return;
  }

  const DEV_HOSTNAMES = new Set(['localhost', '127.0.0.1', '0.0.0.0']);
  const isDevelopment =
    DEV_HOSTNAMES.has(window.location.hostname) ||
    window.location.hostname.endsWith('.local');

  const copy = {
    uk: {
      title: 'Доступна нова версія сайту',
      action: 'Оновити',
      dismiss: 'Закрити'
    },
    en: {
      title: 'A new site version is available',
      action: 'Refresh',
      dismiss: 'Dismiss'
    }
  };

  let registrationRef = null;
  let refreshTriggered = false;
  let updateToast = null;

  function getLocale() {
    return document.documentElement.lang?.startsWith('en') ? 'en' : 'uk';
  }

  function getCopy() {
    return copy[getLocale()] || copy.uk;
  }

  function removeToast() {
    updateToast?.remove();
    updateToast = null;
  }

  function reloadPage() {
    if (refreshTriggered) {
      return;
    }

    refreshTriggered = true;
    removeToast();
    window.location.reload();
  }

  function requestWaitingWorkerActivation() {
    const waitingWorker = registrationRef?.waiting;

    if (waitingWorker) {
      refreshTriggered = true;
      waitingWorker.postMessage({ type: 'SKIP_WAITING' });
      return;
    }

    reloadPage();
  }

  function showUpdateToast() {
    const dictionary = getCopy();

    if (!updateToast) {
      const toast = document.createElement('div');
      toast.className = 'pwa-update-toast';
      toast.setAttribute('role', 'status');
      toast.setAttribute('aria-live', 'polite');
      toast.innerHTML = `
        <div class="pwa-update-toast__content">
          <strong class="pwa-update-toast__title"></strong>
          <div class="pwa-update-toast__actions">
            <button class="pwa-update-toast__button pwa-update-toast__button--primary" type="button"></button>
            <button class="pwa-update-toast__button pwa-update-toast__button--secondary" type="button"></button>
          </div>
        </div>
      `;

      const title = toast.querySelector('.pwa-update-toast__title');
      const primaryButton = toast.querySelector('.pwa-update-toast__button--primary');
      const secondaryButton = toast.querySelector('.pwa-update-toast__button--secondary');

      primaryButton.addEventListener('click', requestWaitingWorkerActivation);
      secondaryButton.addEventListener('click', removeToast);

      document.body.append(toast);
      updateToast = toast;

      updateToast._title = title;
      updateToast._primaryButton = primaryButton;
      updateToast._secondaryButton = secondaryButton;
    }

    updateToast._title.textContent = dictionary.title;
    updateToast._primaryButton.textContent = dictionary.action;
    updateToast._secondaryButton.textContent = dictionary.dismiss;
  }

  function observeInstallingWorker(worker) {
    if (!worker) {
      return;
    }

    worker.addEventListener('statechange', () => {
      if (worker.state === 'installed' && navigator.serviceWorker.controller) {
        showUpdateToast();
      }
    });
  }

  async function unregisterServiceWorkers() {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map((registration) => registration.unregister()));
  }

  function scheduleRegistrationUpdates() {
    const updateRegistration = () => registrationRef?.update().catch(() => {});

    window.addEventListener('focus', updateRegistration);
    window.addEventListener('online', updateRegistration);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        updateRegistration();
      }
    });

    window.setTimeout(updateRegistration, 1500);
  }

  window.addEventListener('load', async () => {
    try {
      if (isDevelopment) {
        await unregisterServiceWorkers();
        return;
      }

      registrationRef = await navigator.serviceWorker.register('/sw.js', {
        updateViaCache: 'none'
      });

      if (registrationRef.waiting) {
        showUpdateToast();
      }

      observeInstallingWorker(registrationRef.installing);

      registrationRef.addEventListener('updatefound', () => {
        observeInstallingWorker(registrationRef.installing);
      });

      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (refreshTriggered) {
          window.location.reload();
          return;
        }

        showUpdateToast();
      });

      scheduleRegistrationUpdates();
    } catch (error) {
      console.error('Service worker registration failed', error);
    }
  });
})();
