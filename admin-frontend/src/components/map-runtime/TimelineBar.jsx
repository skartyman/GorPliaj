import { t } from '../../lib/editor-locale';

export default function TimelineBar({ value, onChange }) {
  return (
    <label>
      {t('runtime.timeline')}
      <input type="time" value={value} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}
