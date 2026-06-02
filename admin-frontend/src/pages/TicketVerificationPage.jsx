import { useState } from 'react';
import { apiRequest } from '../lib/api';
import { useAdminI18n } from '../lib/i18n';
import PageContainer from '../components/PageContainer';
import StatusPill from '../components/StatusPill';

export default function TicketVerificationPage() {
  const { t } = useAdminI18n();
  const [code, setCode] = useState('');
  const [verifyResult, setVerifyResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [arriving, setArriving] = useState(false);
  const [arrivedGuests, setArrivedGuests] = useState('');
  const [arriveSuccess, setArriveSuccess] = useState(false);
  const [arriveError, setArriveError] = useState('');

  async function handleVerify(e) {
    e.preventDefault();
    const trimmed = code.trim();
    if (!trimmed) return;

    setLoading(true);
    setError('');
    setVerifyResult(null);
    setArriveSuccess(false);
    setArriveError('');

    try {
      const { response } = await apiRequest(`/api/admin/reservations/verify/${encodeURIComponent(trimmed)}`);
      if (response.ok) {
        const data = await response.json();
        setVerifyResult(data.reservation);
        setArrivedGuests(data.reservation.arrivedAt ? '' : String(data.reservation.guests || ''));
      } else {
        const errData = await response.json().catch(() => null);
        setError(errData?.message || t('verifyTicket.notFound'));
      }
    } catch {
      setError(t('verifyTicket.error'));
    } finally {
      setLoading(false);
    }
  }

  async function handleArrive() {
    if (!verifyResult) return;

    setArriving(true);
    setArriveError('');
    setArriveSuccess(false);

    try {
      const { response } = await apiRequest(`/api/admin/reservations/${verifyResult.id}/arrive`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ arrivedGuests: arrivedGuests ? Number(arrivedGuests) : null })
      });

      if (response.ok) {
        setArriveSuccess(true);
        setVerifyResult((prev) => ({ ...prev, arrivedAt: new Date().toISOString(), arrivedGuests: arrivedGuests ? Number(arrivedGuests) : null }));
      } else {
        const errData = await response.json().catch(() => null);
        setArriveError(errData?.message || t('verifyTicket.arriveError'));
      }
    } catch {
      setArriveError(t('verifyTicket.arriveError'));
    } finally {
      setArriving(false);
    }
  }

  function formatDate(dateStr) {
    const d = new Date(dateStr);
    return d.toLocaleDateString('uk-UA', { day: 'numeric', month: 'long', year: 'numeric' });
  }

  function formatTime(dateStr) {
    const d = new Date(dateStr);
    return d.toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' });
  }

  const payStatus = verifyResult?.paymentStatus;
  const isPaid = payStatus === 'PAID';
  const arrived = verifyResult?.arrivedAt;

  return (
    <PageContainer title={t('verifyTicket.title')}>
      <div className="card" style={{ maxWidth: 600, margin: '0 auto' }}>
        <form onSubmit={handleVerify} style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder={t('verifyTicket.placeholder')}
            className="input"
            style={{ flex: 1, fontFamily: 'monospace', fontSize: 18, letterSpacing: 2, textTransform: 'uppercase' }}
          />
          <button type="submit" className="btn btn-primary" disabled={loading || !code.trim()}>
            {loading ? t('verifyTicket.searching') : t('verifyTicket.search')}
          </button>
        </form>

        {error && <div className="status-pill status-error" style={{ marginBottom: 12 }}>{error}</div>}

        {verifyResult && (
          <div className="card" style={{ background: 'var(--bg-page)' }}>
            {arriveSuccess && <div className="status-pill status-success" style={{ marginBottom: 12 }}>{t('verifyTicket.arrived')}</div>}

            <div style={{ display: 'grid', gap: 8, fontSize: 15 }}>
              <div style={{ textAlign: 'center', marginBottom: 8 }}>
                <div style={{ fontFamily: 'monospace', fontSize: 24, fontWeight: 700, letterSpacing: 3, color: 'var(--accent-gold)' }}>
                  {verifyResult.ticketCode}
                </div>
              </div>
              <div><strong>{t('verifyTicket.guest')}:</strong> {verifyResult.customerName}</div>
              <div><strong>{t('verifyTicket.phone')}:</strong> {verifyResult.customerPhone}</div>
              {verifyResult.customerEmail && <div><strong>{t('verifyTicket.email')}:</strong> {verifyResult.customerEmail}</div>}
              <div><strong>{t('verifyTicket.table')}:</strong> {verifyResult.table?.name || '—'}</div>
              <div><strong>{t('verifyTicket.zone')}:</strong> {verifyResult.zone?.name || '—'}</div>
              <div><strong>{t('verifyTicket.guests')}:</strong> {verifyResult.guests}</div>
              <div><strong>{t('verifyTicket.date')}:</strong> {formatDate(verifyResult.reservationDate)}</div>
              <div><strong>{t('verifyTicket.time')}:</strong> {formatTime(verifyResult.timeFrom)} — {formatTime(verifyResult.timeTo)}</div>
              <div><strong>{t('verifyTicket.status')}:</strong> <StatusPill status={verifyResult.status} /></div>
              <div>
                <strong>{t('verifyTicket.payment')}:</strong>{' '}
                {payStatus ? <StatusPill status={payStatus} /> : <span style={{ color: '#888' }}>{t('verifyTicket.noPayment')}</span>}
                {isPaid && verifyResult.paidAt && (
                  <span style={{ fontSize: 13, color: '#888', marginLeft: 8 }}>
                    ({formatDate(verifyResult.paidAt)})
                  </span>
                )}
              </div>
              <div><strong>{t('verifyTicket.source')}:</strong> {verifyResult.source || '—'}</div>
              {arrived && <div><strong>{t('verifyTicket.arrivedAt')}:</strong> {formatDate(arrived)} {formatTime(arrived)}{verifyResult.arrivedGuests ? ` (${verifyResult.arrivedGuests} ${t('verifyTicket.guests').toLowerCase()})` : ''}</div>}
            </div>

            {!arrived && (
              <div style={{ marginTop: 20, borderTop: '1px solid var(--border-light)', paddingTop: 16 }}>
                <h4 style={{ margin: '0 0 8px' }}>{t('verifyTicket.markArrived')}</h4>
                {arriveError && <div className="status-pill status-error" style={{ marginBottom: 8 }}>{arriveError}</div>}
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input
                    type="number"
                    value={arrivedGuests}
                    onChange={(e) => setArrivedGuests(e.target.value)}
                    placeholder={t('verifyTicket.arrivedGuestsPlaceholder')}
                    className="input"
                    style={{ width: 120 }}
                    min="1"
                  />
                  <button type="button" className="btn btn-primary" onClick={handleArrive} disabled={arriving}>
                    {arriving ? t('verifyTicket.saving') : t('verifyTicket.confirmArrive')}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </PageContainer>
  );
}
