import { getLayoutModeLabel, t } from '../../lib/editor-locale';

export default function StatusBar({ document, selectedObject, layoutMode, zoom, mode }) {
  return (
    <footer className="fp-statusbar">
      <span>{document.name}</span>
      <span>{t('status.version')}: {document.version}</span>
      <span>{t('status.mode')}: {mode}</span>
      <span>{t('status.layoutPreview')}: {getLayoutModeLabel(layoutMode?.code || '')}</span>
      <span>{t('status.zoom')}: {(zoom * 100).toFixed(0)}%</span>
      <span>{t('status.selected')}: {selectedObject?.name || t('common.none')}</span>
    </footer>
  );
}
