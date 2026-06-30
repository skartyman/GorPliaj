import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import AdminLayout from '../components/AdminLayout';
import PageCard from '../components/PageCard';
import StatusPill from '../components/StatusPill';
import { apiRequest, formatDate, formatTime, localizeField } from '../lib/api';
import { useAdminI18n } from '../lib/i18n';
import { useAuth } from '../context/AuthContext';

const ACTIVE_RESERVATION_STATUSES = ['PENDING', 'AWAITING_PAYMENT', 'CONFIRMED', 'HELD', 'SEATED'];
const ATTENTION_STATUSES = ['PENDING', 'AWAITING_PAYMENT', 'CONFIRMED'];
const MANAGEMENT_ROLES = ['admin', 'manager', 'owner'];
const RESERVATION_ROLES = ['admin', 'hostess', 'manager', 'owner'];
const TICKET_ROLES = ['admin', 'hostess', 'manager', 'owner'];

function localDateKey(value = new Date()) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function rowDateKey(value) {
  if (!value) return '';
  const raw = String(value);
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10);
  return localDateKey(value);
}

function lastDays(count, locale = 'uk-UA') {
  return Array.from({ length: count }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (count - 1 - index));
    return {
      key: localDateKey(date),
      label: date.toLocaleDateString(locale, { day: '2-digit', month: '2-digit' })
    };
  });
}

function money(value, locale = 'uk-UA') {
  return new Intl.NumberFormat(locale, {
    maximumFractionDigits: 0
  }).format(Number(value || 0));
}

function MiniBarChart({ data, valueSuffix = '' }) {
  const max = Math.max(...data.map((item) => Number(item.value || 0)), 1);

  return (
    <div className="dashboard-bars">
      {data.map((item) => (
        <div className="dashboard-bar-item" key={item.key || item.label}>
          <div className="dashboard-bar-track">
            <span style={{ height: `${Math.max((Number(item.value || 0) / max) * 100, item.value ? 8 : 0)}%` }} />
          </div>
          <strong>{item.value}{valueSuffix}</strong>
          <small>{item.label}</small>
        </div>
      ))}
    </div>
  );
}

function ShareBar({ items }) {
  const total = items.reduce((sum, item) => sum + Number(item.value || 0), 0);

  return (
    <div className="dashboard-share-list">
      {items.map((item) => {
        const value = Number(item.value || 0);
        const width = total ? Math.max((value / total) * 100, value ? 6 : 0) : 0;
        return (
          <div className="dashboard-share-row" key={item.label}>
            <div>
              <strong>{item.label}</strong>
              <span className="muted">{value}</span>
            </div>
            <div className="dashboard-share-track">
              <span className={item.tone || ''} style={{ width: `${width}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function QuickAction({ to, title, description, meta, tone = 'primary' }) {
  return (
    <Link className={`dashboard-action-card ${tone}`} to={to}>
      <span className="dashboard-action-meta">{meta}</span>
      <strong>{title}</strong>
      <span>{description}</span>
    </Link>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const { t, language, locale } = useAdminI18n();
  const role = user?.role || '';
  const canReservations = RESERVATION_ROLES.includes(role);
  const canMenu = MANAGEMENT_ROLES.includes(role);
  const canTickets = TICKET_ROLES.includes(role);
  const canAnalytics = MANAGEMENT_ROLES.includes(role);
  const canManageEventContent = ['seo_smm', ...MANAGEMENT_ROLES].includes(role);
  const [state, setState] = useState({
    loading: true,
    error: '',
    reservations: [],
    payments: [],
    ticketOrders: [],
    menuItems: [],
    insights: {
      summary: {
        totalLikes: 0,
        activeItemsCount: 0,
        availableItemsCount: 0,
        likedItemsCount: 0
      },
      topLikedItems: []
    }
  });

  useEffect(() => {
    let cancelled = false;

    async function loadDashboard() {
      setState((current) => ({ ...current, loading: true, error: '' }));
      const next = {
        reservations: [],
        payments: [],
        ticketOrders: [],
        menuItems: [],
        insights: {
          summary: currentSafeSummary(),
          topLikedItems: []
        }
      };
      const errors = [];

      const tasks = [];

      if (canReservations) {
        tasks.push(apiRequest('/api/admin/reservations').then(({ response, body }) => {
          if (response.ok) next.reservations = Array.isArray(body) ? body : [];
          else errors.push(body.message || t('dashboard.errors.loadReservations'));
        }));
      }

      if (canMenu) {
        tasks.push(apiRequest('/api/admin/menu/insights').then(({ response, body }) => {
          if (response.ok) {
            next.insights = {
              summary: body?.summary || {},
              topLikedItems: Array.isArray(body?.topLikedItems) ? body.topLikedItems : []
            };
          }
        }));
        tasks.push(apiRequest('/api/admin/menu/items').then(({ response, body }) => {
          if (response.ok) next.menuItems = Array.isArray(body) ? body : [];
        }));
      }

      if (canAnalytics) {
        tasks.push(apiRequest('/api/admin/payments').then(({ response, body }) => {
          if (response.ok) next.payments = Array.isArray(body) ? body : [];
        }));
        tasks.push(apiRequest('/api/admin/ticket-orders').then(({ response, body }) => {
          if (response.ok) next.ticketOrders = Array.isArray(body) ? body : [];
        }));
      }

      await Promise.all(tasks);

      if (!cancelled) {
        setState({
          loading: false,
          error: errors[0] || '',
          ...next
        });
      }
    }

    loadDashboard().catch(() => {
      if (!cancelled) {
        setState((current) => ({ ...current, loading: false, error: t('dashboard.errors.loadDashboard') }));
      }
    });

    return () => {
      cancelled = true;
    };
  }, [canAnalytics, canMenu, canManageEventContent, canReservations]);

  const dateLocale = language === 'ua' ? 'uk-UA' : (language === 'ru' ? 'ru-RU' : 'en-US');
  const todayKey = localDateKey();

  const reservationStats = useMemo(() => {
    const today = state.reservations.filter((row) => rowDateKey(row.reservationDate) === todayKey);
    const activeToday = today.filter((row) => ACTIVE_RESERVATION_STATUSES.includes(row.status));
    const pending = state.reservations.filter((row) => row.status === 'PENDING').length;
    const confirmed = state.reservations.filter((row) => row.status === 'CONFIRMED').length;
    const activeGuestsToday = activeToday.reduce((sum, row) => sum + Number(row.guests || 0), 0);
    const busyTableIds = new Set(activeToday.map((row) => row.table?.id).filter(Boolean));

    return {
      today: today.length,
      activeToday: activeToday.length,
      activeGuestsToday,
      busyTablesToday: busyTableIds.size,
      pending,
      confirmed
    };
  }, [state.reservations, todayKey]);

  const paidPayments = useMemo(
    () => state.payments.filter((payment) => payment.status === 'PAID'),
    [state.payments]
  );

  const paidRevenue = useMemo(
    () => paidPayments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0),
    [paidPayments]
  );

  const paidTicketOrders = useMemo(
    () => state.ticketOrders.filter((order) => order.status === 'PAID'),
    [state.ticketOrders]
  );

  const stopListCount = useMemo(
    () => state.menuItems.filter((item) => item.isAvailable === false).length,
    [state.menuItems]
  );

  const days = useMemo(() => lastDays(7, locale), [locale]);

  const reservationTrend = useMemo(
    () => days.map((day) => ({
      ...day,
      value: state.reservations.filter((row) => rowDateKey(row.reservationDate) === day.key).length
    })),
    [days, state.reservations]
  );

  const revenueTrend = useMemo(
    () => days.map((day) => ({
      ...day,
      value: paidPayments
        .filter((payment) => rowDateKey(payment.paidAt || payment.updatedAt || payment.createdAt) === day.key)
        .reduce((sum, payment) => sum + Number(payment.amount || 0), 0)
    })),
    [days, paidPayments]
  );

  const statusShare = useMemo(() => ([
    { label: t('dashboard.statusShare.pending'), value: state.reservations.filter((row) => row.status === 'PENDING').length, tone: 'warning' },
    { label: t('dashboard.statusShare.confirmed'), value: state.reservations.filter((row) => row.status === 'CONFIRMED').length, tone: 'success' },
    { label: t('dashboard.statusShare.completed'), value: state.reservations.filter((row) => row.status === 'COMPLETED').length, tone: 'neutral' },
    { label: t('dashboard.statusShare.cancelled'), value: state.reservations.filter((row) => row.status === 'CANCELLED').length, tone: 'danger' }
  ]), [state.reservations, t]);

  const attentionReservations = useMemo(
    () => state.reservations
      .filter((row) => ATTENTION_STATUSES.includes(row.status))
      .sort((left, right) => new Date(left.timeFrom || left.reservationDate) - new Date(right.timeFrom || right.reservationDate))
      .slice(0, 5),
    [state.reservations]
  );

  const topLiked = state.insights.topLikedItems.slice(0, 4);

  return (
    <AdminLayout>
      <section className="dashboard-hero-v2">
        <div className="dashboard-hero-copy">
          <span className="eyebrow">{t('dashboard.eyebrow')}</span>
          <h2>{t('dashboard.title')}</h2>
          <p className="muted">{t('dashboard.description')}</p>
        </div>
        <div className="dashboard-hero-kpis">
          <article>
            <span>{t('dashboard.heroKpi.reservationsToday')}</span>
            <strong>{state.loading ? '—' : reservationStats.today}</strong>
          </article>
          <article>
            <span>{t('dashboard.heroKpi.activeGuests')}</span>
            <strong>{state.loading ? '—' : reservationStats.activeGuestsToday}</strong>
          </article>
          <article>
            <span>{t('dashboard.heroKpi.awaitingConfirmation')}</span>
            <strong>{state.loading ? '—' : reservationStats.pending}</strong>
          </article>
        </div>
      </section>

      {state.error ? <p className="error">{state.error}</p> : null}

      <section className="dashboard-action-grid">
        {canReservations ? (
          <QuickAction
            to="/admin/reservations#manual-booking"
            title={t('dashboard.quickActions.createBooking.title')}
            description={t('dashboard.quickActions.createBooking.description')}
            meta={t('dashboard.quickActions.createBooking.meta')}
            tone="primary"
          />
        ) : null}
        {canReservations ? (
          <QuickAction
            to="/admin/map"
            title={t('dashboard.quickActions.openMap.title')}
            description={t('dashboard.quickActions.openMap.description')}
            meta={t('dashboard.quickActions.openMap.meta')}
            tone="dark"
          />
        ) : null}
        {canMenu ? (
          <QuickAction
            to="/admin/menu#stop-list"
            title={t('dashboard.quickActions.stopList.title')}
            description={t('dashboard.quickActions.stopList.description')}
            meta={t('dashboard.quickActions.stopList.meta', { count: stopListCount })}
            tone="warning"
          />
        ) : null}
        {canTickets ? (
          <QuickAction
            to="/admin/verify-ticket"
            title={t('dashboard.quickActions.scanTickets.title')}
            description={t('dashboard.quickActions.scanTickets.description')}
            meta={t('dashboard.quickActions.scanTickets.meta')}
            tone="success"
          />
        ) : null}
      </section>

      {canAnalytics ? (
        <>
          <section className="dashboard-metric-strip">
            <article>
              <span>{t('dashboard.metrics.revenue')}</span>
              <strong>{state.loading ? '—' : `${money(paidRevenue, locale)} UAH`}</strong>
            </article>
            <article>
              <span>{t('dashboard.metrics.paidPayments')}</span>
              <strong>{state.loading ? '—' : paidPayments.length}</strong>
            </article>
            <article>
              <span>{t('dashboard.metrics.paidTickets')}</span>
              <strong>{state.loading ? '—' : paidTicketOrders.reduce((sum, order) => sum + (order.tickets?.length || 0), 0)}</strong>
            </article>
            <article>
              <span>{t('dashboard.metrics.menuItems')}</span>
              <strong>{state.loading ? '—' : (state.insights.summary.activeItemsCount || 0)}</strong>
            </article>
          </section>

          <section className="dashboard-chart-grid">
            <PageCard title={t('dashboard.charts.reservations7days')} description={t('dashboard.charts.reservations7daysDesc')}>
              <MiniBarChart data={reservationTrend} />
            </PageCard>
            <PageCard title={t('dashboard.charts.revenue7days')} description={t('dashboard.charts.revenue7daysDesc')}>
              <MiniBarChart data={revenueTrend.map((item) => ({ ...item, value: Math.round(item.value) }))} />
            </PageCard>
            <PageCard title={t('dashboard.charts.statusShare')} description={t('dashboard.charts.statusShareDesc')}>
              <ShareBar items={statusShare} />
            </PageCard>
            <PageCard title={t('dashboard.charts.menuDemand')} description={t('dashboard.charts.menuDemandDesc')}>
              <div className="dashboard-menu-signal">
                <div>
                  <strong>{state.insights.summary.totalLikes || 0}</strong>
                  <span className="muted">{t('dashboard.charts.totalLikes')}</span>
                </div>
                <div>
                  <strong>{stopListCount}</strong>
                  <span className="muted">{t('dashboard.charts.inStopList')}</span>
                </div>
              </div>
              {topLiked.length ? (
                <ul className="plain-list dashboard-compact-list">
                  {topLiked.map((item) => (
                    <li key={item.id}>
                      <span>{localizeField(item.name, language)}</span>
                      <strong>{item.likesCount} ♥</strong>
                    </li>
                  ))}
                </ul>
              ) : <p className="muted">{t('dashboard.emptyLikes')}</p>}
            </PageCard>
          </section>
        </>
      ) : null}

      <section className="dashboard-bottom-grid">
        <PageCard title={t('dashboard.attention.title')} description={t('dashboard.attention.description')}>
          {!attentionReservations.length ? <p className="muted">{t('dashboard.attention.empty')}</p> : null}
          {attentionReservations.length ? (
            <ul className="plain-list dashboard-compact-list">
              {attentionReservations.map((item) => (
                <li key={item.id}>
                  <div>
                    <Link to={`/admin/reservations/${item.id}`}>#{item.id} {item.customerName || t('dashboard.attention.guest')}</Link>
                    <span className="muted">
                      {formatDate(item.reservationDate, dateLocale)} · {formatTime(item.timeFrom, dateLocale)}
                    </span>
                  </div>
                  <StatusPill status={item.status} />
                </li>
              ))}
            </ul>
          ) : null}
        </PageCard>

        <PageCard title={t('dashboard.quickLinks.title')} description={t('dashboard.quickLinks.description')}>
          <div className="dashboard-link-list">
            {canAnalytics ? <Link to="/admin/payments">{t('dashboard.quickLinks.payments')}</Link> : null}
            {canManageEventContent ? <Link to="/admin/ticket-sales">{t('dashboard.quickLinks.ticketSales')}</Link> : null}
            {canMenu ? <Link to="/admin/menu">{t('dashboard.quickLinks.menuEditor')}</Link> : null}
            {canManageEventContent ? <Link to="/admin/events">{t('dashboard.quickLinks.events')}</Link> : null}
            {canReservations ? <Link to="/admin/reservations">{t('dashboard.quickLinks.allReservations')}</Link> : null}
          </div>
        </PageCard>
      </section>
    </AdminLayout>
  );
}

function currentSafeSummary(summary = {}) {
  return {
    totalLikes: summary.totalLikes || 0,
    activeItemsCount: summary.activeItemsCount || 0,
    availableItemsCount: summary.availableItemsCount || 0,
    likedItemsCount: summary.likedItemsCount || 0
  };
}
