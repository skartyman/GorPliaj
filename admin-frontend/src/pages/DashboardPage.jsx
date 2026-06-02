import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import AdminLayout from '../components/AdminLayout';
import PageCard from '../components/PageCard';
import StatusPill from '../components/StatusPill';
import { apiRequest, formatDate, formatTime, localizeField } from '../lib/api';
import { useAdminI18n } from '../lib/i18n';
import { useAuth } from '../context/AuthContext';

export default function DashboardPage() {
  const { user } = useAuth();
  const canMenu = ['admin', 'manager', 'owner'].includes(user?.role);
  const [state, setState] = useState({
    loading: true,
    error: '',
    rows: [],
    insights: {
      summary: {
        totalLikes: 0,
        activeItemsCount: 0,
        availableItemsCount: 0,
        likedItemsCount: 0,
        categoryCount: 0,
        activeCategoryCount: 0
      },
      topLikedItems: []
    }
  });
  const { t, language } = useAdminI18n();

  useEffect(() => {
    Promise.all([apiRequest('/api/admin/reservations'), apiRequest('/api/admin/menu/insights')])
      .then(([reservationsResult, insightsResult]) => {
        if (!reservationsResult.response.ok) {
          setState((current) => ({
            ...current,
            loading: false,
            error: reservationsResult.body.message || t('dashboard.errors.load'),
            rows: []
          }));
          return;
        }

        if (!insightsResult.response.ok) {
          setState((current) => ({
            ...current,
            loading: false,
            error: reservationsResult.response.ok ? '' : (reservationsResult.body.message || t('dashboard.errors.load')),
            rows: Array.isArray(reservationsResult.body) ? reservationsResult.body : []
          }));
          return;
        }

        setState({
          loading: false,
          error: '',
          rows: Array.isArray(reservationsResult.body) ? reservationsResult.body : [],
          insights: {
            summary: insightsResult.body?.summary || {},
            topLikedItems: Array.isArray(insightsResult.body?.topLikedItems) ? insightsResult.body.topLikedItems : []
          }
        });
      })
      .catch(() => setState((current) => ({ ...current, loading: false, error: t('dashboard.errors.load'), rows: [] })));
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

    const safeVal = (val) => (typeof val === 'object' ? localizeField(val, language) : val);

    return [
      { label: t('dashboard.summary.today'), value: todayReservations.length },
      { label: t('dashboard.summary.pending'), value: pending },
      { label: t('dashboard.summary.confirmed'), value: confirmed },
      { label: t('dashboard.summary.completed'), value: completed },
      { label: t('dashboard.summary.busyTables'), value: busyTableIds.size },
      { label: t('dashboard.summary.totalLikes'), value: state.insights.summary.totalLikes || 0 },
      { label: t('dashboard.summary.likedItems'), value: state.insights.summary.likedItemsCount || 0 },
      { label: t('dashboard.summary.menuItems'), value: state.insights.summary.activeItemsCount || 0 }
    ];
  }, [state.rows, state.insights.summary, t, language]);

  const upcoming = useMemo(
    () => [...state.rows].sort((a, b) => new Date(a.timeFrom) - new Date(b.timeFrom)).slice(0, 6),
    [state.rows]
  );

  const latest = useMemo(
    () => [...state.rows].sort((a, b) => new Date(b.createdAt || b.timeFrom) - new Date(a.createdAt || a.timeFrom)).slice(0, 4),
    [state.rows]
  );

  const dateLocale = language === 'ua' ? 'uk-UA' : (language === 'ru' ? 'ru-RU' : 'en-US');

  return (
    <AdminLayout>
      <section className="page-hero dashboard-hero">
        <div className="page-hero-copy">
          <span className="eyebrow">{t('dashboard.eyebrow')}</span>
          <h2>{t('dashboard.title')}</h2>
          <p className="muted">{t('dashboard.description')}</p>
          <div className="actions hero-actions">
            <Link className="btn" to="/admin/reservations">{t('dashboard.openReservations')}</Link>
            {canMenu && <Link className="btn btn-secondary" to="/admin/menu">{t('dashboard.openMenu')}</Link>}
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
        <article className="metric-compact-card">
          <div className="metric-compact-grid">
            {summaryCards.map((card) => (
              <div key={card.label} className="metric-compact-item">
                <p className="muted">{card.label}</p>
                <strong>{state.loading ? '—' : card.value}</strong>
              </div>
            ))}
          </div>
        </article>
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
            <Link className="action-tile" to="/admin/menu">
              <strong>{t('dashboard.quick.menuTitle')}</strong>
              <span className="muted">{t('dashboard.quick.menuDescription')}</span>
            </Link>
            <Link className="action-tile" to="/admin/events">
              <strong>{t('dashboard.quick.eventsTitle')}</strong>
              <span className="muted">{t('dashboard.quick.eventsDescription')}</span>
            </Link>
          </div>
        </PageCard>

        <PageCard title={t('dashboard.likesTitle')} description={t('dashboard.likesDescription')}>
          {state.error ? <p className="error">{state.error}</p> : null}
          {!state.error && !state.insights.topLikedItems.length ? <p className="muted">{t('dashboard.empty.likes')}</p> : null}
          {!state.error && state.insights.topLikedItems.length ? (
            <ul className="plain-list rich-list">
              {state.insights.topLikedItems.map((item) => (
                <li key={`like-${item.id}`}>
                  <div>
                    <strong>{localizeField(item.name, language)}</strong>
                    <div className="muted small">{localizeField(item.categoryName, language) || t('dashboard.noCategory')}</div>
                  </div>
                  <strong>{item.likesCount} ♥</strong>
                </li>
              ))}
            </ul>
          ) : null}
        </PageCard>
      </section>

      <section className="stack-grid">
        <PageCard title={t('dashboard.upcomingTitle')} description={t('dashboard.upcomingDescription')}>
          {state.error ? <p className="error">{state.error}</p> : null}
          {!state.error && !upcoming.length ? <p className="muted">{t('dashboard.empty.upcoming')}</p> : null}
          {!state.error && upcoming.length ? (
            <ul className="plain-list rich-list">
              {upcoming.map((item) => (
                <li key={item.id}>
                  <div>
                    <strong>#{item.id}</strong> • {item.customerName || t('common.guest')}
                    <div className="muted small">{formatDate(item.reservationDate, dateLocale)} • {formatTime(item.timeFrom, dateLocale)}</div>
                  </div>
                  <StatusPill status={item.status} />
                </li>
              ))}
            </ul>
          ) : null}
        </PageCard>

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
      </section>
    </AdminLayout>
  );
}
