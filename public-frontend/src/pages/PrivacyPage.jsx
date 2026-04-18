import { useLocale } from '../state/locale';
import { useMeta } from '../hooks/useMeta';

export default function PrivacyPage() {
  const { t } = useLocale();
  useMeta(t('privacyTitle'), t('privacyTitle'));

  return (
    <div className="content-page">
      <section className="content-section">
        <h1>{t('privacyTitle')}</h1>
        <p className="muted">{t('privacyLastUpdated')}</p>
        
        <div style={{ marginTop: 32 }}>
          <h3>{t('privacySection1Title')}</h3>
          <p>{t('privacySection1Text')}</p>
          
          <h3 style={{ marginTop: 24 }}>{t('privacySection2Title')}</h3>
          <p>{t('privacySection2Text')}</p>
          
          <h3 style={{ marginTop: 24 }}>{t('privacySection3Title')}</h3>
          <p>{t('privacySection3Text')}</p>
        </div>
      </section>
    </div>
  );
}
