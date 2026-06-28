import { useEffect, useState } from 'react';
import { useLocale } from '../state/locale';
import { localizedCopy } from '../lib/i18n';
import { isStandaloneApp, registerInstallPromptListener, showInstallPrompt } from '../lib/pwa';

const installCopy = {
  title: {
    ua: 'Встановити ГорПляж',
    ru: 'Установить ГорПляж',
    en: 'Install GorPliaj'
  },
  description: {
    ua: 'Відкривайте меню, афішу та бронювання як окремий додаток.',
    ru: 'Открывайте меню, афишу и бронирование как отдельное приложение.',
    en: 'Open menu, events and booking as a standalone app.'
  },
  cta: {
    ua: 'Встановити',
    ru: 'Установить',
    en: 'Install'
  },
  installing: {
    ua: 'Відкриваємо...',
    ru: 'Открываем...',
    en: 'Opening...'
  }
};

export default function ClientInstallPrompt() {
  const { locale } = useLocale();
  const [canInstall, setCanInstall] = useState(false);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    if (isStandaloneApp()) {
      return undefined;
    }

    return registerInstallPromptListener((promptEvent) => {
      setCanInstall(!!promptEvent);
    });
  }, []);

  if (!canInstall) {
    return null;
  }

  async function handleInstall() {
    setInstalling(true);

    try {
      await showInstallPrompt();
    } finally {
      setInstalling(false);
    }
  }

  return (
    <div className="client-install-prompt" role="status" aria-live="polite">
      <div className="client-install-prompt__icon" aria-hidden="true">
        <img src="/icons/icon-192.png?v=8" alt="" />
      </div>
      <div className="client-install-prompt__text">
        <strong>{localizedCopy(installCopy.title, locale)}</strong>
        <span>{localizedCopy(installCopy.description, locale)}</span>
      </div>
      <button type="button" className="client-install-prompt__button" onClick={handleInstall} disabled={installing}>
        {localizedCopy(installing ? installCopy.installing : installCopy.cta, locale)}
      </button>
    </div>
  );
}
