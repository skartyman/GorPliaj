import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import AdminLayout from '../components/AdminLayout';
import PageCard from '../components/PageCard';
import StatusPill from '../components/StatusPill';
import { apiRequest, formatDate, formatTime } from '../lib/api';

export default function DashboardPage() {
  const [state, setState] = useState({ loading: true, error: '', rows: [] });

  useEffect(() => {
    apiRequest('/api/admin/reservations')
      .then(({ response, body }) => {
        if (!response.ok) {
          setState({ loading: false, error: body.message || 'Failed to load dashboard.', rows: [] });
          return;
        }

        setState({ loading: false, error: '', rows: Array.isArray(body) ? body : [] });
      })
      .catch(() => setState({ loading: false, error: 'Failed to load dashboard.', rows: [] }));
  }, []);

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
      { label: 'Reservations today', value: todayReservations.length },
      { label: 'Pending reservations', value: pending },
      { label: 'Confirmed reservations', value: confirmed },
      { label: 'Completed reservations', value: completed },
      { label: 'Busy tables', value: busyTableIds.size }
    ];
  }, [state.rows]);

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
          <span className="eyebrow">Main workspace</span>
          <h2>Operations overview built mobile first</h2>
          <p className="muted">
            The dashboard prioritizes today&apos;s service flow on narrow screens and expands into a wider control center on larger layouts.
          </p>
          <div className="actions hero-actions">
            <Link className="btn" to="/admin/reservations">Open reservations</Link>
            <Link className="btn btn-secondary" to="/admin/map">View live map</Link>
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
        <PageCard title="Quick actions" description="Daily operator shortcuts for phone-sized and desktop layouts.">
          <div className="action-grid">
            <Link className="action-tile" to="/admin/reservations">
              <strong>Reservations</strong>
              <span className="muted">Search, filter, and update statuses fast.</span>
            </Link>
            <Link className="action-tile" to="/admin/map">
              <strong>Floor map</strong>
              <span className="muted">Inspect table load and active seating context.</span>
            </Link>
            <Link className="action-tile" to="/admin/news">
              <strong>Homepage news</strong>
              <span className="muted">Prepare highlights and announcements.</span>
            </Link>
            <Link className="action-tile" to="/admin/events">
              <strong>Events</strong>
              <span className="muted">Plan posters, dates, and promotional visibility.</span>
            </Link>
          </div>
        </PageCard>

        <PageCard title="Upcoming reservations" description="Latest and upcoming bookings from the live API.">
          {state.error ? <p className="error">{state.error}</p> : null}
          {!state.error && !upcoming.length ? <p className="muted">No upcoming reservations.</p> : null}
          {!state.error && upcoming.length ? (
            <ul className="plain-list rich-list">
              {upcoming.map((item) => (
                <li key={item.id}>
                  <div>
                    <strong>#{item.id}</strong> • {item.customerName || 'Guest'}
                    <div className="muted small">{formatDate(item.reservationDate)} • {formatTime(item.timeFrom)}</div>
                  </div>
                  <StatusPill status={item.status} />
                </li>
              ))}
            </ul>
          ) : null}
        </PageCard>
      </section>

      <PageCard title="Latest created" description="Most recent booking entries for quick follow-up.">
        {!latest.length ? <p className="muted">No recent reservations.</p> : null}
        {latest.length ? (
          <ul className="plain-list compact rich-list">
            {latest.map((item) => (
              <li key={`latest-${item.id}`}>
                <div>
                  <Link to={`/admin/reservations/${item.id}`}>#{item.id}</Link> • {item.customerName || 'Guest'}
                  <div className="muted small">Created from the current admin feed.</div>
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
