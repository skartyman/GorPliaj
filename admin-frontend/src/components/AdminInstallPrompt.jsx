import { useEffect, useState } from 'react';
import { useAdminI18n } from '../lib/i18n';
import { registerInstallPromptListener, showInstallPrompt } from '../lib/pwa';

export default function AdminInstallPrompt() {
  const { t } = useAdminI18n();
  const [available, setAvailable] = useState(false);
  const [installing, setInstalling] = useState(false);

  useEffect(() => registerInstallPromptListener((promptEvent) => {
    setAvailable(Boolean(promptEvent));
  }), []);

  if (!available) {
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
    <div className="admin-install-prompt" role="status" aria-live="polite">
      <div className="admin-install-prompt__text">
        <strong>{t('install.title')}</strong>
        <span>{t('install.description')}</span>
      </div>
      <button type="button" className="btn btn-success" onClick={handleInstall} disabled={installing}>
        {installing ? t('install.installing') : t('install.cta')}
      </button>
    </div>
  );
}
