import { useAdminI18n } from '../lib/i18n';

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
  const { t } = useAdminI18n();
  const tone = STATUS_CLASS_MAP[status] || 'neutral';
  const label = t(`status.${status || 'UNKNOWN'}`);

  return <span className={`status-pill ${tone}`}>{label}</span>;
}
