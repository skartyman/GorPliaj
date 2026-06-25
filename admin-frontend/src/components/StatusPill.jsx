import { useAdminI18n } from '../lib/i18n';

const STATUS_CLASS_MAP = {
  PENDING: 'pending',
  CONFIRMED: 'info',
  AWAITING_PAYMENT: 'pending',
  HELD: 'warning',
  SEATED: 'completed',
  COMPLETED: 'completed',
  CANCELLED: 'danger',
  NO_SHOW: 'danger',
  UNAVAILABLE: 'neutral',
  FREE: 'success'
};

export default function StatusPill({ status }) {
  const { t } = useAdminI18n();
  const tone = STATUS_CLASS_MAP[status] || 'neutral';
  const label = t(`status.${status || 'UNKNOWN'}`);

  return <span className={`status-pill ${tone}`}>{label}</span>;
}
