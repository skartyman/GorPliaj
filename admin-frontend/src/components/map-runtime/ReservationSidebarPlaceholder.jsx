import { t } from '../../lib/editor-locale';

export default function ReservationSidebarPlaceholder() {
  return (
    <aside className="fp-runtime-sidebar">
      <h3>{t('runtime.sidebarTitle')}</h3>
      <p className="muted">{t('runtime.sidebarPlaceholder')}</p>
    </aside>
  );
}
