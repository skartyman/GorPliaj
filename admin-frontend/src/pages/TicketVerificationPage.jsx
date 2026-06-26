import { useState, useRef, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Html5Qrcode } from 'html5-qrcode';
import { apiRequest, localizeField } from '../lib/api';
import { useAdminI18n } from '../lib/i18n';
import AdminLayout from '../components/AdminLayout';
import PageContainer from '../components/PageContainer';
import StatusPill from '../components/StatusPill';

const QR_SCAN_ID = 'qr-scanner-element';

export default function TicketVerificationPage() {
  const { t, language } = useAdminI18n();
  const [searchParams] = useSearchParams();
  const [code, setCode] = useState('');
  const [verifyResult, setVerifyResult] = useState(null);
  const [saleTicket, setSaleTicket] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [arriving, setArriving] = useState(false);
  const [arrivedGuests, setArrivedGuests] = useState('');
  const [arriveSuccess, setArriveSuccess] = useState(false);
  const [arriveError, setArriveError] = useState('');
  const [scanMode, setScanMode] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [fileScanning, setFileScanning] = useState(false);
  const scannerRef = useRef(null);
  const fileInputRef = useRef(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    return () => { mountedRef.current = false; };
  }, []);

  async function fetchVerify(ticketCode, signature) {
    setLoading(true);
    setError('');
    setVerifyResult(null);
    setSaleTicket(null);
    setArriveSuccess(false);
    setArriveError('');

    try {
      const params = signature ? `?t=${encodeURIComponent(signature)}` : '';
      const isSaleTicket = /^GPT-/i.test(ticketCode);
      const path = isSaleTicket
        ? `/api/admin/tickets/verify/${encodeURIComponent(ticketCode)}${params}`
        : `/api/admin/reservations/verify/${encodeURIComponent(ticketCode)}${params}`;
      const { response, body } = await apiRequest(path);
      if (response.ok) {
        if (isSaleTicket) {
          setSaleTicket(body.ticket);
        } else {
          setVerifyResult(body.reservation);
          setArrivedGuests(body.reservation.arrivedAt ? '' : String(body.reservation.guests || ''));
        }
      } else {
        setError(body.message || t('verifyTicket.notFound'));
      }
    } catch {
      setError(t('verifyTicket.error'));
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify(e) {
    e.preventDefault();
    const trimmed = code.trim();
    if (!trimmed) return;
    await fetchVerify(trimmed, '');
  }

  function parseQrUrl(url) {
    try {
      const parsed = new URL(url);
      
      // Try to get ticket from query parameter first (new format)
      let ticketCode = parsed.searchParams.get('ticket');
      const signature = parsed.searchParams.get('t') || '';
      
      // If not in query parameter, get it from the last segment of the path (old format)
      if (!ticketCode) {
        const segments = parsed.pathname.split('/');
        ticketCode = segments[segments.length - 1];
      }
      
      if (!ticketCode || !/^GP(?:T)?-/i.test(ticketCode)) return null;
      return { ticketCode: ticketCode.toUpperCase(), signature };
    } catch {
      return null;
    }
  }

  const handleDecodedText = useCallback(async (decodedText) => {
    const parsed = parseQrUrl(decodedText);
    if (parsed) {
      setCode(parsed.ticketCode);
      await fetchVerify(parsed.ticketCode, parsed.signature);
    } else {
      setError(t('verifyTicket.invalidQr'));
    }
  }, [t]);

  const startScanner = useCallback(async () => {
    if (scannerRef.current) {
      try { await scannerRef.current.stop(); } catch {}
      try { await scannerRef.current.clear(); } catch {}
      scannerRef.current = null;
    }

    setCameraError('');
    setError('');
    setScanMode(true);

    const element = document.getElementById(QR_SCAN_ID);
    if (!element) {
      setCameraError(t('verifyTicket.cameraError'));
      setScanMode(false);
      return;
    }

    const scanner = new Html5Qrcode(QR_SCAN_ID);
    scannerRef.current = scanner;
    try {
      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1 },
        async (decodedText) => {
          try {
            await scanner.stop();
          } catch {}
          scannerRef.current = null;
          if (mountedRef.current) setScanMode(false);
          await handleDecodedText(decodedText);
        },
        () => {}
      );
    } catch (error) {
      console.error('[ticket-scanner] Camera start failed.', error);
      scannerRef.current = null;
      try { await scanner.clear(); } catch {}
      if (mountedRef.current) {
        setCameraError(t('verifyTicket.cameraError'));
        setScanMode(false);
      }
    }
  }, [handleDecodedText, t]);

  async function stopScanner() {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
      } catch {}
      scannerRef.current = null;
    }
    setScanMode(false);
  }

  async function handleQrFile(file) {
    if (!file) return;
    setFileScanning(true);
    setCameraError('');
    setError('');

    const temporaryId = `${QR_SCAN_ID}-file`;
    const temporaryElement = document.createElement('div');
    temporaryElement.id = temporaryId;
    temporaryElement.style.display = 'none';
    document.body.appendChild(temporaryElement);
    const scanner = new Html5Qrcode(temporaryId);

    try {
      const decodedText = await scanner.scanFile(file, true);
      await handleDecodedText(decodedText);
    } catch (error) {
      console.error('[ticket-scanner] Image scan failed.', error);
      setError(t('verifyTicket.invalidQr'));
    } finally {
      try { await scanner.clear(); } catch {}
      temporaryElement.remove();
      setFileScanning(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        try { scannerRef.current.stop(); } catch {}
      }
    };
  }, []);

  useEffect(() => {
    const ticketCode = String(searchParams.get('ticket') || '').trim().toUpperCase();
    const signature = String(searchParams.get('t') || '').trim();
    if (ticketCode) {
      setCode(ticketCode);
      fetchVerify(ticketCode, signature);
    }
  }, [searchParams]);

  async function handleUseSaleTicket() {
    if (!saleTicket) return;
    setArriving(true);
    setArriveError('');
    const { response, body } = await apiRequest(`/api/admin/tickets/verify/${encodeURIComponent(saleTicket.code)}/use`, {
      method: 'POST'
    });
    setArriving(false);
    if (!response.ok) {
      setArriveError(body.message || t('verifyTicket.arriveError'));
      return;
    }
    setSaleTicket(body.ticket);
    setArriveSuccess(true);
  }

  async function handleArrive() {
    if (!verifyResult) return;
    setArriving(true);
    setArriveError('');
    setArriveSuccess(false);

    try {
      const { response, body } = await apiRequest(`/api/admin/reservations/${verifyResult.id}/arrive`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ arrivedGuests: arrivedGuests ? Number(arrivedGuests) : null })
      });

      if (response.ok) {
        setArriveSuccess(true);
        setVerifyResult((prev) => ({ ...prev, arrivedAt: new Date().toISOString(), arrivedGuests: arrivedGuests ? Number(arrivedGuests) : null }));
      } else {
        setArriveError(body.message || t('verifyTicket.arriveError'));
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
  const isAuthentic = verifyResult?.isAuthentic;

  return (
    <AdminLayout>
      <PageContainer title={t('verifyTicket.title')}>
      <div className="card" style={{ maxWidth: 600, margin: '0 auto' }}>
        {!scanMode ? (
          <>
            <div style={{ marginBottom: 12, textAlign: 'center' }}>
              <button type="button" className="btn btn-primary" onClick={startScanner}>
                {t('verifyTicket.scanQr')}
              </button>
              <button
                type="button"
                className="btn"
                style={{ marginLeft: 8 }}
                disabled={fileScanning}
                onClick={() => fileInputRef.current?.click()}
              >
                {fileScanning ? t('verifyTicket.searching') : t('verifyTicket.scanImage')}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                hidden
                onChange={(event) => handleQrFile(event.target.files?.[0])}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, color: 'var(--text-muted)', fontSize: 13 }}>
              <hr style={{ flex: 1, border: 'none', borderTop: '1px solid var(--border-light)' }} />
              <span>{t('verifyTicket.or')}</span>
              <hr style={{ flex: 1, border: 'none', borderTop: '1px solid var(--border-light)' }} />
            </div>

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
          </>
        ) : null}

        <div style={{ display: scanMode ? 'block' : 'none', marginBottom: 16 }}>
          <div id={QR_SCAN_ID} style={{ width: '100%', maxWidth: 400, margin: '0 auto', minHeight: 280 }} />
          <div style={{ textAlign: 'center', marginTop: 8 }}>
            <button type="button" className="btn" onClick={stopScanner}>
              {t('verifyTicket.cancelScan')}
            </button>
          </div>
        </div>

        {cameraError && <div className="status-pill status-error" style={{ marginBottom: 12 }}>{cameraError}</div>}
        {error && <div className="status-pill status-error" style={{ marginBottom: 12 }}>{error}</div>}

        {verifyResult && (
          <div className="card" style={{ background: 'var(--bg-page)' }}>
            {arriveSuccess && <div className="status-pill status-success" style={{ marginBottom: 12 }}>{t('verifyTicket.arrived')}</div>}

            <div style={{ display: 'grid', gap: 8, fontSize: 15 }}>
              <div style={{ textAlign: 'center', marginBottom: 8 }}>
                <div style={{ fontFamily: 'monospace', fontSize: 24, fontWeight: 700, letterSpacing: 3, color: 'var(--accent-gold)' }}>
                  {verifyResult.ticketCode}
                </div>
                <div style={{ marginTop: 4 }}>
                  {isAuthentic === true ? (
                    <span className="status-pill status-success" style={{ fontSize: 12 }}>{t('verifyTicket.authentic')}</span>
                  ) : isAuthentic === false ? (
                    <span className="status-pill status-error" style={{ fontSize: 12 }}>{t('verifyTicket.notAuthentic')}</span>
                  ) : (
                    <span className="status-pill" style={{ fontSize: 12, background: 'var(--bg-page)', color: 'var(--text-muted)' }}>{t('verifyTicket.noSignature')}</span>
                  )}
                </div>
              </div>
              <div><strong>{t('verifyTicket.guest')}:</strong> {verifyResult.customerName}</div>
              <div><strong>{t('verifyTicket.phone')}:</strong> {verifyResult.customerPhone}</div>
              {verifyResult.customerEmail && <div><strong>{t('verifyTicket.email')}:</strong> {verifyResult.customerEmail}</div>}
              <div><strong>{t('verifyTicket.table')}:</strong> {localizeField(verifyResult.table?.name, language) || '—'}</div>
              <div><strong>{t('verifyTicket.zone')}:</strong> {localizeField(verifyResult.zone?.name, language) || '—'}</div>
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

        {saleTicket && (
          <div className="card" style={{ background: 'var(--bg-page)' }}>
            {arriveSuccess && <div className="status-pill status-success" style={{ marginBottom: 12 }}>{t('verifyTicket.arrived')}</div>}
            <div style={{ display: 'grid', gap: 8, fontSize: 15 }}>
              <div style={{ textAlign: 'center', marginBottom: 8 }}>
                <div style={{ fontFamily: 'monospace', fontSize: 24, fontWeight: 700, letterSpacing: 2, color: 'var(--accent-gold)' }}>
                  {saleTicket.code}
                </div>
              </div>
              <div><strong>Подія:</strong> {localizeField(saleTicket.event?.title, language)}</div>
              {saleTicket.eventSession ? <div><strong>Дата:</strong> {formatDate(saleTicket.eventSession.startsAt)} {formatTime(saleTicket.eventSession.startsAt)} - {formatTime(saleTicket.eventSession.endsAt)}</div> : null}
              <div><strong>Тариф:</strong> {localizeField(saleTicket.ticketType?.name, language)}</div>
              <div><strong>{t('verifyTicket.guest')}:</strong> {saleTicket.holderName || saleTicket.order?.customerName || '—'}</div>
              <div><strong>Email:</strong> {saleTicket.holderEmail || saleTicket.order?.customerEmail || '—'}</div>
              <div><strong>{t('verifyTicket.status')}:</strong> <StatusPill status={saleTicket.status} /></div>
              {saleTicket.usedAt ? <div><strong>{t('verifyTicket.arrivedAt')}:</strong> {formatDate(saleTicket.usedAt)} {formatTime(saleTicket.usedAt)}</div> : null}
            </div>
            {saleTicket.status === 'VALID' ? (
              <div style={{ marginTop: 20, borderTop: '1px solid var(--border-light)', paddingTop: 16 }}>
                {arriveError && <div className="status-pill status-error" style={{ marginBottom: 8 }}>{arriveError}</div>}
                <button type="button" className="btn btn-primary" disabled={arriving} onClick={handleUseSaleTicket}>
                  {arriving ? t('verifyTicket.saving') : t('verifyTicket.confirmArrive')}
                </button>
              </div>
            ) : null}
          </div>
        )}
      </div>
      </PageContainer>
    </AdminLayout>
  );
}
