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

function getSourceLabel(source) {
  const labels = { WEB: 'Веб', ADMIN: 'Адмін', PHONE: 'Телефон', WALK_IN: 'Walk-in', EVENT: 'Подія', INSTAGRAM: 'Instagram', FACEBOOK: 'Facebook' };
  return labels[source] || source || '—';
}

function getSourceIcon(source) {
  const icons = { WEB: '🌐', ADMIN: '👤', PHONE: '📞', WALK_IN: '🚶', EVENT: '🎫', INSTAGRAM: '📷', FACEBOOK: '👍' };
  return icons[source] || '📋';
}

export default function ReservationDetailPage() {
  const { id } = useParams();
  const [state, setState] = useState({ loading: true, error: '', data: null, updating: false });
  const [editComments, setEditComments] = useState(false);
  const [customerComment, setCustomerComment] = useState('');
  const [adminComment, setAdminComment] = useState('');
  const [savingComments, setSavingComments] = useState(false);
  const { t, language } = useAdminI18n();

  async function loadReservation() {
    setState((prev) => ({ ...prev, loading: true, error: '' }));
    const { response, body } = await apiRequest(`/api/admin/reservations/${id}`);

    if (!response.ok) {
      setState({ loading: false, error: body.message || t('reservationDetail.errors.load'), data: null, updating: false });
      return;
    }

    setState({ loading: false, error: '', data: body, updating: false });
    setCustomerComment(body?.reservation?.commentCustomer || '');
    setAdminComment(body?.reservation?.commentAdmin || '');
  }

  useEffect(() => {
    loadReservation().catch(() => {
      setState({ loading: false, error: t('reservationDetail.errors.load'), data: null, updating: false });
    });
  }, [id, t]);

  async function saveComments() {
    setSavingComments(true);
    try {
      const { response, body } = await apiRequest(`/api/admin/reservations/${id}/comments`, {
        method: 'PATCH',
        body: JSON.stringify({ commentCustomer: customerComment, commentAdmin: adminComment })
      });
      if (response.ok) {
        await loadReservation();
        setEditComments(false);
      } else {
        alert(body?.message || 'Не вдалося зберегти коментарі');
      }
    } finally {
      setSavingComments(false);
    }
  }

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
                {reservation.customerEmail && <DetailRow label="Email" value={reservation.customerEmail} />}
                <DetailRow label={t('reservationDetail.fields.guests')} value={reservation.guests} />
                <DetailRow 
                  label={language === 'ua' ? 'Джерело' : language === 'ru' ? 'Источник' : 'Source'} 
                  value={
                    <span className="source-badge" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '2px 8px', background: 'var(--bg-card, #f5f5f5)', borderRadius: '6px', fontSize: '0.9rem' }}>
                      <span style={{ fontSize: '1.1rem' }}>{getSourceIcon(reservation.source)}</span>
                      <span>{getSourceLabel(reservation.source)}</span>
                    </span>
                  } 
                />
                <DetailRow label={t('reservationDetail.fields.mode')} value={modeLabel} />
                <DetailRow label={t('reservationDetail.fields.placeType')} value={placeTypeLabel} />
              </div>
            </PanelCard>

            <PanelCard 
              title={language === 'ua' ? 'Коментарі' : language === 'ru' ? 'Комментарии' : 'Comments'} 
              className="surface-muted full-height"
            >
              {editComments ? (
                <div style={{ display: 'grid', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '0.8rem', color: 'var(--accent-gold)', fontWeight: 700, marginBottom: '4px', display: 'block' }}>
                      👤 {language === 'ua' ? 'Коментар гостя' : language === 'ru' ? 'Комментарий гостя' : 'Guest comment'}
                    </label>
                    <textarea
                      value={customerComment}
                      onChange={(e) => setCustomerComment(e.target.value)}
                      rows="3"
                      style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--border-warm, #ddd)', fontFamily: 'inherit', fontSize: '0.9rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.8rem', color: 'var(--accent-rust)', fontWeight: 700, marginBottom: '4px', display: 'block' }}>
                      🔒 {language === 'ua' ? 'Коментар адміна' : language === 'ru' ? 'Комментарий админа' : 'Admin comment'}
                    </label>
                    <textarea
                      value={adminComment}
                      onChange={(e) => setAdminComment(e.target.value)}
                      rows="3"
                      style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--border-warm, #ddd)', fontFamily: 'inherit', fontSize: '0.9rem' }}
                    />
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button 
                      type="button" 
                      className="btn btn-primary" 
                      onClick={saveComments}
                      disabled={savingComments}
                    >
                      {savingComments ? '...' : language === 'ua' ? 'Зберегти' : language === 'ru' ? 'Сохранить' : 'Save'}
                    </button>
                    <button 
                      type="button" 
                      className="btn btn-secondary" 
                      onClick={() => { setEditComments(false); setCustomerComment(reservation.commentCustomer || ''); setAdminComment(reservation.commentAdmin || ''); }}
                    >
                      {language === 'ua' ? 'Скасувати' : language === 'ru' ? 'Отмена' : 'Cancel'}
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'grid', gap: '10px' }}>
                  {reservation.commentCustomer && (
                    <div style={{ borderLeft: '3px solid var(--accent-gold)', padding: '8px 12px', background: 'rgba(200,146,65,0.06)', borderRadius: '0 6px 6px 0' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--accent-gold)', fontWeight: 700, marginBottom: '4px' }}>
                        👤 {language === 'ua' ? 'Гість' : language === 'ru' ? 'Гость' : 'Guest'}
                      </div>
                      <div style={{ fontStyle: 'italic', fontSize: '0.9rem' }}>{reservation.commentCustomer}</div>
                    </div>
                  )}
                  {reservation.commentAdmin && (
                    <div style={{ borderLeft: '3px solid var(--accent-rust)', padding: '8px 12px', background: 'rgba(139,37,0,0.05)', borderRadius: '0 6px 6px 0' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--accent-rust)', fontWeight: 700, marginBottom: '4px' }}>
                        🔒 {language === 'ua' ? 'Адмін' : language === 'ru' ? 'Админ' : 'Admin'}
                      </div>
                      <div style={{ fontStyle: 'italic', fontSize: '0.9rem' }}>{reservation.commentAdmin}</div>
                    </div>
                  )}
                  {!reservation.commentCustomer && !reservation.commentAdmin && (
                    <p className="muted" style={{ fontSize: '0.85rem' }}>{language === 'ua' ? 'Немає коментарів' : language === 'ru' ? 'Нет комментариев' : 'No comments'}</p>
                  )}
                  <button 
                    type="button" 
                    className="btn btn-secondary" 
                    onClick={() => setEditComments(true)}
                    style={{ justifySelf: 'start' }}
                  >
                    ✏️ {language === 'ua' ? 'Редагувати' : language === 'ru' ? 'Редактировать' : 'Edit'}
                  </button>
                </div>
              )}
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
