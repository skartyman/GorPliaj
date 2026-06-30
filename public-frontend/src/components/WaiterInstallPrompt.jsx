import { useState, useEffect } from 'react';
import { localizedCopy } from '../lib/i18n';
import { useLocale } from '../state/locale';

export default function WaiterInstallPrompt() {
  const { locale } = useLocale();
  const c = (v) => localizedCopy(v, locale);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches) return;
    if (localStorage.getItem('waiter-pwa-dismissed')) return;

    function handler(e) {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowPrompt(true);
    }
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  async function install() {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowPrompt(false);
      localStorage.setItem('waiter-pwa-dismissed', '1');
    }
    setDeferredPrompt(null);
  }

  function dismiss() {
    setShowPrompt(false);
    localStorage.setItem('waiter-pwa-dismissed', '1');
  }

  if (!showPrompt) return null;

  return (
    <div style={{ position: 'fixed', bottom: 80, left: 16, right: 16, zIndex: 2000, background: '#1a1a2e', color: '#fff', borderRadius: 12, padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 4px 20px rgba(0,0,0,0.3)' }}>
      <div style={{ fontSize: '0.85rem', flex: 1, marginRight: 12 }}>
        <strong>{c({ ua: 'Встановити додаток', ru: 'Установить приложение', en: 'Install app' })}</strong>
        <p style={{ margin: '2px 0 0', opacity: 0.8, fontSize: '0.8rem' }}>{c({ ua: 'Додайте кабінет офіціанта на екран', ru: 'Добавьте кабинет официанта на экран', en: 'Add waiter cabinet to home screen' })}</p>
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        <button onClick={install} style={{ background: '#fff', color: '#1a1a2e', border: 'none', borderRadius: 8, padding: '8px 14px', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer' }}>
          {c({ ua: 'Встановити', ru: 'Установить', en: 'Install' })}
        </button>
        <button onClick={dismiss} style={{ background: 'transparent', color: '#fff', border: 'none', padding: '8px 10px', fontSize: '0.8rem', cursor: 'pointer', opacity: 0.7 }}>
          ✕
        </button>
      </div>
    </div>
  );
}
