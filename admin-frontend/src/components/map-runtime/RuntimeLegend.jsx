import { RUNTIME_STATUS_COLOR } from '../../lib/booking-schema';

export default function RuntimeLegend() {
  return (
    <div className="fp-runtime-legend">
      {Object.entries(RUNTIME_STATUS_COLOR).map(([status, color]) => (
        <div key={status} className="fp-runtime-legend-item">
          <span style={{ backgroundColor: color }} />
          <small>{status}</small>
        </div>
      ))}
    </div>
  );
}
