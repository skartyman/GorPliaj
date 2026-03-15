import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import AdminLayout from '../components/AdminLayout';
import PageCard from '../components/PageCard';
import { apiRequest, formatDate } from '../lib/api';

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
    const cancelled = state.rows.filter((row) => row.status === 'CANCELLED').length;

    return [
      { label: 'Today reservations', value: todayReservations.length },
      { label: 'Pending confirmations', value: pending },
      { label: 'Confirmed bookings', value: confirmed },
      { label: 'Cancelled bookings', value: cancelled }
    ];
  }, [state.rows]);

  const upcoming = useMemo(
    () => [...state.rows].sort((a, b) => new Date(a.timeFrom) - new Date(b.timeFrom)).slice(0, 5),
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
            <Link className="btn btn-secondary" to="/admin/payments">Review payments</Link>
          </div>
        </PageCard>

        <PageCard title="Upcoming reservations" description="Next reservations from the current API feed.">
          {state.error ? <p className="error">{state.error}</p> : null}
          {!state.error && !upcoming.length ? <p className="muted">No upcoming reservations.</p> : null}
          {!state.error && upcoming.length ? (
            <ul className="plain-list">
              {upcoming.map((item) => (
                <li key={item.id}>
                  <strong>#{item.id}</strong> • {item.customerName} • {formatDate(item.reservationDate)}
                </li>
              ))}
            </ul>
          ) : null}
        </PageCard>
      </section>
    </AdminLayout>
  );
}
