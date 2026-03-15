const STATUS_CLASS_MAP = {
  PENDING: 'pending',
  CONFIRMED: 'success',
  AWAITING_PAYMENT: 'pending',
  HELD: 'warning',
  SEATED: 'success',
  COMPLETED: 'success',
  CANCELLED: 'danger',
  NO_SHOW: 'danger',
  UNAVAILABLE: 'neutral',
  FREE: 'success'
};

export default function StatusPill({ status }) {
  const tone = STATUS_CLASS_MAP[status] || 'neutral';
  return <span className={`status-pill ${tone}`}>{status || 'UNKNOWN'}</span>;
}
