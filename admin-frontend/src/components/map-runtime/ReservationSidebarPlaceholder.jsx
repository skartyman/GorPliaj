import { t } from '../../lib/editor-locale';
import { useAdminI18n } from '../../lib/i18n';

export default function ReservationSidebarPlaceholder() {
  const { language } = useAdminI18n();

  return (
    <aside className="fp-runtime-sidebar">
      <h3>{t('runtime.sidebarTitle', language)}</h3>
      <p className="muted">{t('runtime.sidebarPlaceholder', language)}</p>
    </aside>
  );
}
