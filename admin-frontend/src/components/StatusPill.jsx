const STATUS_CLASS_MAP = {
  PENDING: 'pending',
  CONFIRMED: 'success',
  SEATED: 'success',
  COMPLETED: 'success',
  CANCELLED: 'danger',
  NO_SHOW: 'danger'
};

export default function StatusPill({ status }) {
  const tone = STATUS_CLASS_MAP[status] || 'neutral';
  return <span className={`status-pill ${tone}`}>{status || 'UNKNOWN'}</span>;
}
