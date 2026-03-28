import { t } from '../../lib/editor-locale';
import { useAdminI18n } from '../../lib/i18n';

export default function TimelineBar({ value, onChange }) {
  const { language } = useAdminI18n();

  return (
    <label>
      {t('runtime.timeline', language)}
      <input type="time" value={value} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}
