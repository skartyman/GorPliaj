import { getLayoutModeLabel, t } from '../../lib/editor-locale';
import { useAdminI18n } from '../../lib/i18n';

export default function LayoutModeSelector({ layoutModes, value, onChange }) {
  const { language } = useAdminI18n();

  return (
    <label>
      {t('runtime.layoutMode', language)}
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        {layoutModes.map((mode) => (
          <option key={mode.id} value={mode.code}>{getLayoutModeLabel(mode, language)}</option>
        ))}
      </select>
    </label>
  );
}
