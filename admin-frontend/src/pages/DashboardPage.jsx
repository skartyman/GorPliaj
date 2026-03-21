import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import AdminLayout from '../components/AdminLayout';
import PageCard from '../components/PageCard';
import StatusPill from '../components/StatusPill';
import { apiRequest, formatDate, formatTime } from '../lib/api';
import { useAdminI18n } from '../lib/i18n';

export default function DashboardPage() {
  const [state, setState] = useState({ loading: true, error: '', rows: [] });
  const { t, locale } = useAdminI18n();

  useEffect(() => {
    apiRequest('/api/admin/reservations')
      .then(({ response, body }) => {
        if (!response.ok) {
          setState({ loading: false, error: body.message || t('dashboard.errors.load'), rows: [] });
          return;
        }

        setState({ loading: false, error: '', rows: Array.isArray(body) ? body : [] });
      })
      .catch(() => setState({ loading: false, error: t('dashboard.errors.load'), rows: [] }));
  }, [t]);

  const summaryCards = useMemo(() => {
    const today = new Date();
    const todayKey = today.toISOString().slice(0, 10);
    const todayReservations = state.rows.filter((row) => String(row.reservationDate).slice(0, 10) === todayKey);
    const pending = state.rows.filter((row) => row.status === 'PENDING').length;
    const confirmed = state.rows.filter((row) => row.status === 'CONFIRMED').length;
    const completed = state.rows.filter((row) => row.status === 'COMPLETED').length;
    const busyTableIds = new Set(
      todayReservations
        .filter((row) => ['PENDING', 'CONFIRMED', 'AWAITING_PAYMENT'].includes(row.status))
        .map((row) => row.table?.id)
        .filter(Boolean)
    );

    return [
      { label: t('dashboard.summary.today'), value: todayReservations.length },
      { label: t('dashboard.summary.pending'), value: pending },
      { label: t('dashboard.summary.confirmed'), value: confirmed },
      { label: t('dashboard.summary.completed'), value: completed },
      { label: t('dashboard.summary.busyTables'), value: busyTableIds.size }
    ];
  }, [state.rows, t]);

  const upcoming = useMemo(
    () => [...state.rows].sort((a, b) => new Date(a.timeFrom) - new Date(b.timeFrom)).slice(0, 6),
    [state.rows]
  );

  const latest = useMemo(
    () => [...state.rows].sort((a, b) => new Date(b.createdAt || b.timeFrom) - new Date(a.createdAt || a.timeFrom)).slice(0, 4),
    [state.rows]
  );

  return (
    <AdminLayout>
      <section className="page-hero dashboard-hero">
        <div className="page-hero-copy">
          <span className="eyebrow">{t('dashboard.eyebrow')}</span>
          <h2>{t('dashboard.title')}</h2>
          <p className="muted">{t('dashboard.description')}</p>
          <div className="actions hero-actions">
            <Link className="btn" to="/admin/reservations">{t('dashboard.openReservations')}</Link>
            <Link className="btn btn-secondary" to="/admin/map">{t('dashboard.viewMap')}</Link>
          </div>
        </div>

        <div className="hero-stat-grid">
          {summaryCards.slice(0, 3).map((card) => (
            <article key={card.label} className="hero-stat-card accent">
              <strong>{state.loading ? '—' : card.value}</strong>
              <span className="muted">{card.label}</span>
            </article>
          ))}
        </div>
      </section>

      <section className="grid-summary">
        {summaryCards.map((card) => (
          <article key={card.label} className="metric-card">
            <p className="muted">{card.label}</p>
            <strong>{state.loading ? '—' : card.value}</strong>
          </article>
        ))}
      </section>

      <section className="stack-grid">
        <PageCard title={t('dashboard.quickActionsTitle')} description={t('dashboard.quickActionsDescription')}>
          <div className="action-grid">
            <Link className="action-tile" to="/admin/reservations">
              <strong>{t('dashboard.quick.reservationsTitle')}</strong>
              <span className="muted">{t('dashboard.quick.reservationsDescription')}</span>
            </Link>
            <Link className="action-tile" to="/admin/map">
              <strong>{t('dashboard.quick.mapTitle')}</strong>
              <span className="muted">{t('dashboard.quick.mapDescription')}</span>
            </Link>
            <Link className="action-tile" to="/admin/news">
              <strong>{t('dashboard.quick.newsTitle')}</strong>
              <span className="muted">{t('dashboard.quick.newsDescription')}</span>
            </Link>
            <Link className="action-tile" to="/admin/events">
              <strong>{t('dashboard.quick.eventsTitle')}</strong>
              <span className="muted">{t('dashboard.quick.eventsDescription')}</span>
            </Link>
          </div>
        </PageCard>

        <PageCard title={t('dashboard.upcomingTitle')} description={t('dashboard.upcomingDescription')}>
          {state.error ? <p className="error">{state.error}</p> : null}
          {!state.error && !upcoming.length ? <p className="muted">{t('dashboard.empty.upcoming')}</p> : null}
          {!state.error && upcoming.length ? (
            <ul className="plain-list rich-list">
              {upcoming.map((item) => (
                <li key={item.id}>
                  <div>
                    <strong>#{item.id}</strong> • {item.customerName || t('common.guest')}
                    <div className="muted small">{formatDate(item.reservationDate, locale)} • {formatTime(item.timeFrom, locale)}</div>
                  </div>
                  <StatusPill status={item.status} />
                </li>
              ))}
            </ul>
          ) : null}
        </PageCard>
      </section>

      <PageCard title={t('dashboard.latestTitle')} description={t('dashboard.latestDescription')}>
        {!latest.length ? <p className="muted">{t('dashboard.empty.latest')}</p> : null}
        {latest.length ? (
          <ul className="plain-list compact rich-list">
            {latest.map((item) => (
              <li key={`latest-${item.id}`}>
                <div>
                  <Link to={`/admin/reservations/${item.id}`}>#{item.id}</Link> • {item.customerName || t('common.guest')}
                  <div className="muted small">{t('dashboard.createdFromFeed')}</div>
                </div>
                <StatusPill status={item.status} />
              </li>
            ))}
          </ul>
        ) : null}
      </PageCard>
    </AdminLayout>
  );
}
