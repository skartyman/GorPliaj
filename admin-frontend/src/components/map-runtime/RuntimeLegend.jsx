import { RUNTIME_STATUS_COLOR } from '../../lib/booking-schema';
import { getRuntimeStatusLabel } from '../../lib/editor-locale';
import { useAdminI18n } from '../../lib/i18n';

export default function RuntimeLegend() {
  const { language } = useAdminI18n();

  return (
    <div className="fp-runtime-legend">
      {Object.entries(RUNTIME_STATUS_COLOR).map(([status, color]) => (
        <div key={status} className="fp-runtime-legend-item">
          <span style={{ backgroundColor: color }} />
          <small>{getRuntimeStatusLabel(status, language)}</small>
        </div>
      ))}
    </div>
  );
}
