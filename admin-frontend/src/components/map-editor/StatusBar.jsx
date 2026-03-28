import { getLayoutModeLabel, getLocalizedObjectName, t } from '../../lib/editor-locale';
import { useAdminI18n } from '../../lib/i18n';

export default function StatusBar({ document, selectedObject, layoutMode, zoom, mode }) {
  const { language } = useAdminI18n();

  return (
    <footer className="fp-statusbar">
      <span>{document.name}</span>
      <span>{t('status.version', language)}: {document.version}</span>
      <span>{t('status.mode', language)}: {t(`toolbar.mode.${mode}`, language)}</span>
      <span>{t('status.layoutPreview', language)}: {getLayoutModeLabel(layoutMode?.code || '', language)}</span>
      <span>{t('status.zoom', language)}: {(zoom * 100).toFixed(0)}%</span>
      <span>{t('status.selected', language)}: {selectedObject ? getLocalizedObjectName(selectedObject, language) : null || t('common.none', language)}</span>
    </footer>
  );
}
