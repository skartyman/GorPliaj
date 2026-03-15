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
    () => [...state.rows].sort((a, b) => new Date(a.timeFrom) - new Date(b.timeFrom)).slice(0, 7),
    [state.rows]
  );

  return (
    <AdminLayout>
      <section className="grid-summary">
        {summaryCards.map((card) => (
          <article key={card.label} className="metric-card">
            <p className="muted">{card.label}</p>
            <strong>{state.loading ? '—' : card.value}</strong>
          </article>
        ))}
      </section>

      <section className="grid-two-col">
        <PageCard title="Quick actions" description="Jump directly to frequent admin tasks.">
          <div className="actions">
            <Link className="btn" to="/admin/reservations">Manage reservations</Link>
            <Link className="btn btn-secondary" to="/admin/map">Open venue map</Link>
            <Link className="btn btn-secondary" to="/admin/news">Add news</Link>
            <Link className="btn btn-secondary" to="/admin/events">Add event</Link>
          </div>
        </PageCard>

        <PageCard title="Upcoming reservations" description="Latest and upcoming reservations from the current API feed.">
          {state.error ? <p className="error">{state.error}</p> : null}
          {!state.error && !upcoming.length ? <p className="muted">No upcoming reservations.</p> : null}
          {!state.error && upcoming.length ? (
            <ul className="plain-list">
              {upcoming.map((item) => (
                <li key={item.id}>
                  <strong>#{item.id}</strong> • {item.customerName} • {formatDate(item.reservationDate)} {formatTime(item.timeFrom)} •{' '}
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
