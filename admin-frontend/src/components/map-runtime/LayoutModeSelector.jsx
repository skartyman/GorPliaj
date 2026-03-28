import { getLayoutModeLabel, t } from '../../lib/editor-locale';

export default function LayoutModeSelector({ layoutModes, value, onChange }) {
  return (
    <label>
      {t('runtime.layoutMode')}
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        {layoutModes.map((mode) => (
          <option key={mode.id} value={mode.code}>{getLayoutModeLabel(mode)}</option>
        ))}
      </select>
    </label>
  );
}
