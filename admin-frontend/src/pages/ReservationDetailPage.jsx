import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import AdminLayout from '../components/AdminLayout';
import PanelCard from '../components/PanelCard';
import StatusPill from '../components/StatusPill';
import { apiRequest, formatDate, formatTime, localizeField } from '../lib/api';
import { useAdminI18n } from '../lib/i18n';
import { parseReservationMeta } from '../lib/reservationMeta';

function getBookingKindLabel(bookingKind, t) {
  return t(`reservationMeta.bookingKind.${bookingKind}`);
}

function getUsageModeLabel(usageMode, t) {
  return t(`reservationMeta.mode.${usageMode}`);
}

function getPositionTypeLabel(positionType, t) {
  return t(`reservationMeta.place.${positionType}`);
}

function getReservationUnitName(reservation, language, tFn) {
  const code = reservation.table?.code || localizeField(reservation.table?.name, language) || '';
  const rowSortOrder = reservation.table?.row?.sortOrder;
  const rowLabel = rowSortOrder != null ? `${tFn ? tFn('reservationDetail.fields.row') : 'Ряд'} ${rowSortOrder}` : '';
  return [code, rowLabel].filter(Boolean).join(' · ') || '—';
}

function DetailRow({ label, value }) {
  return (
    <div className="detail-row">
      <span className="muted">{label}</span>
      <strong>{value || '—'}</strong>
    </div>
  );
}

function getActionTone(status) {
  if (status === 'CANCELLED') {
    return 'btn btn-danger';
  }

  if (status === 'COMPLETED') {
    return 'btn btn-success';
  }

  return 'btn';
}

export default function ReservationDetailPage() {
  const { id } = useParams();
  const [state, setState] = useState({ loading: true, error: '', data: null, updating: false });
  const { t, language } = useAdminI18n();

  async function loadReservation() {
    setState((prev) => ({ ...prev, loading: true, error: '' }));
    const { response, body } = await apiRequest(`/api/admin/reservations/${id}`);

    if (!response.ok) {
      setState({ loading: false, error: body.message || t('reservationDetail.errors.load'), data: null, updating: false });
      return;
    }

    setState({ loading: false, error: '', data: body, updating: false });
  }

  useEffect(() => {
    loadReservation().catch(() => {
      setState({ loading: false, error: t('reservationDetail.errors.load'), data: null, updating: false });
    });
  }, [id, t]);

  async function onChangeStatus(status) {
    setState((prev) => ({ ...prev, updating: true, error: '' }));
    const { response, body } = await apiRequest(`/api/admin/reservations/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status })
    });

    if (!response.ok) {
      setState((prev) => ({ ...prev, updating: false, error: body.message || t('reservationDetail.errors.update') }));
      return;
    }

    await loadReservation();
  }

  const reservation = state.data?.reservation;
  const allowedNextStatuses = state.data?.allowedNextStatuses || [];
  const reservationMeta = parseReservationMeta(reservation?.commentCustomer);
  const dateLocale = language === 'ua' ? 'uk-UA' : (language === 'ru' ? 'ru-RU' : 'en-US');
  const unitLabel = reservation ? getReservationUnitName(reservation, language, t) : '—';
  const modeLabel = reservation?.map?.usageMode
    ? getUsageModeLabel(reservation.map.usageMode, t)
    : (reservationMeta.mode ? t(`reservationMeta.mode.${reservationMeta.mode}`) : '—');
  const placeTypeLabel = reservation?.table?.positionType
    ? getPositionTypeLabel(reservation.table.positionType, t)
    : (reservation?.bookingKind ? getBookingKindLabel(reservation.bookingKind, t) : (reservationMeta.place ? t(`reservationMeta.place.${reservationMeta.place}`) : '—'));
  const commentLabel = reservationMeta.cleanComment || reservation?.commentCustomer || reservation?.commentAdmin || '—';

  return (
    <AdminLayout>
      <section className="page-hero compact">
        <div className="page-hero-copy">
          <span className="eyebrow">{t('reservationDetail.eyebrow')}</span>
          <h2>{t('reservationDetail.title', { id })}</h2>
          <p className="muted">{t('reservationDetail.description')}</p>
        </div>
        <div className="actions hero-actions">
          <Link className="btn btn-secondary" to="/admin/reservations">{t('reservationDetail.back')}</Link>
        </div>
      </section>

      <PanelCard
        title={t('reservationDetail.overviewTitle')}
        subtitle={t('reservationDetail.overviewDescription')}
      >
        {state.loading ? <p>{t('reservationDetail.loading')}</p> : null}
        {state.error ? <p className="error">{state.error}</p> : null}

        {reservation ? (
          <div className="reservation-detail-grid">
            <PanelCard title={t('reservationDetail.guestInfo')} className="surface-muted full-height">
              <div className="details-grid compact">
                <DetailRow label={t('reservationDetail.fields.guest')} value={reservation.customerName} />
                <DetailRow label={t('reservationDetail.fields.phone')} value={reservation.customerPhone} />
                <DetailRow label={t('reservationDetail.fields.guests')} value={reservation.guests} />
                <DetailRow label={t('reservationDetail.fields.mode')} value={modeLabel} />
                <DetailRow label={t('reservationDetail.fields.placeType')} value={placeTypeLabel} />
                <DetailRow label={t('reservationDetail.fields.comments')} value={commentLabel} />
              </div>
            </PanelCard>

            <PanelCard title={t('reservationDetail.slotInfo')} className="surface-muted full-height">
              <div className="details-grid compact">
                <DetailRow label={t('reservationDetail.fields.date')} value={formatDate(reservation.reservationDate, dateLocale)} />
                <DetailRow label={t('reservationDetail.fields.startTime')} value={formatTime(reservation.timeFrom, dateLocale)} />
                <DetailRow label={t('reservationDetail.fields.table')} value={unitLabel} />
                <DetailRow label={t('reservationDetail.fields.zone')} value={localizeField(reservation.zone?.name, language) || '—'} />
                <DetailRow label={t('reservationDetail.fields.status')} value={<StatusPill status={reservation.status} />} />
                <DetailRow label={t('reservationDetail.fields.map')} value={localizeField(reservation.map?.name, language) || reservation.map?.slug || '—'} />
                <DetailRow label={t('reservationDetail.fields.deposit')} value={reservation.depositRequired ? `${reservation.depositAmount || reservation.table?.deposit || '—'} UAH` : '—'} />
              </div>
            </PanelCard>

            <PanelCard title={t('reservationDetail.statusActions')} subtitle={t('reservationDetail.statusActionsDescription')} className="surface-muted detail-action-panel">
              <div className="actions prominent-actions wrap-mobile">
                {!allowedNextStatuses.length ? <p className="muted">{t('reservationDetail.noActions')}</p> : null}
                {allowedNextStatuses.map((status) => (
                  <button
                    key={status}
                    type="button"
                    className={getActionTone(status)}
                    disabled={state.updating}
                    onClick={() => onChangeStatus(status)}
                  >
                    {state.updating ? t('reservationDetail.updating') : t('reservationDetail.setStatus', { status: t(`status.${status}`) })}
                  </button>
                ))}
              </div>
            </PanelCard>
          </div>
        ) : null}
      </PanelCard>
    </AdminLayout>
  );
}
