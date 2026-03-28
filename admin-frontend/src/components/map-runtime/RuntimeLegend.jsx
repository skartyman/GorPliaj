import { RUNTIME_STATUS_COLOR } from '../../lib/booking-schema';
import { RUNTIME_STATUS_LABELS } from '../../lib/editor-locale';

export default function RuntimeLegend() {
  return (
    <div className="fp-runtime-legend">
      {Object.entries(RUNTIME_STATUS_COLOR).map(([status, color]) => (
        <div key={status} className="fp-runtime-legend-item">
          <span style={{ backgroundColor: color }} />
          <small>{RUNTIME_STATUS_LABELS[status] || status}</small>
        </div>
      ))}
    </div>
  );
}
