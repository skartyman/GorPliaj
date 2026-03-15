import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import AdminLayout from '../components/AdminLayout';
import PageCard from '../components/PageCard';
import StatusPill from '../components/StatusPill';
import { apiRequest, formatDate, formatTime } from '../lib/api';

export default function ReservationsPage() {
  const [state, setState] = useState({ loading: true, error: '', rows: [] });
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  useEffect(() => {
    apiRequest('/api/admin/reservations')
      .then(({ response, body }) => {
        if (!response.ok) {
          setState({ loading: false, error: body.message || 'Failed to load reservations.', rows: [] });
          return;
        }

        setState({ loading: false, error: '', rows: Array.isArray(body) ? body : [] });
      })
      .catch(() => {
        setState({ loading: false, error: 'Failed to load reservations.', rows: [] });
      });
  }, []);

  const statuses = useMemo(
    () => ['ALL', ...new Set(state.rows.map((row) => row.status).filter(Boolean))],
    [state.rows]
  );

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    return state.rows.filter((reservation) => {
      const matchesStatus = statusFilter === 'ALL' || reservation.status === statusFilter;
      if (!query) {
        return matchesStatus;
      }

      const searchable = [
        reservation.id,
        reservation.customerName,
        reservation.customerPhone,
        reservation.table?.code,
        reservation.table?.name,
        reservation.zone?.name
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return matchesStatus && searchable.includes(query);
    });
  }, [search, state.rows, statusFilter]);

  return (
    <AdminLayout>
      <PageCard
        title="Reservations"
        description="Live list of reservations from the existing admin API."
        actions={<button className="btn btn-secondary" type="button" onClick={() => window.location.reload()}>Refresh</button>}
      >
        <div className="toolbar">
          <label>
            Search
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by guest, phone, table, or id"
            />
          </label>
          <label>
            Status
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              {statuses.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </label>
        </div>

        {state.loading ? <p>Loading reservations...</p> : null}
        {state.error ? <p className="error">{state.error}</p> : null}
        {!state.loading && !state.error && !filteredRows.length ? <p>No reservations found.</p> : null}

        {!state.loading && filteredRows.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Date</th>
                  <th>Time</th>
                  <th>Guest</th>
                  <th>Phone</th>
                  <th>Table / Zone</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((reservation) => (
                  <tr key={reservation.id}>
                    <td>
                      <Link to={`/admin/reservations/${reservation.id}`}>{reservation.id}</Link>
                    </td>
                    <td>{formatDate(reservation.reservationDate)}</td>
                    <td>{formatTime(reservation.timeFrom)}</td>
                    <td>{reservation.customerName}</td>
                    <td>{reservation.customerPhone}</td>
                    <td>{reservation.table?.code || reservation.table?.name || '-'} / {reservation.zone?.name || '-'}</td>
                    <td>
                      <StatusPill status={reservation.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </PageCard>
    </AdminLayout>
  );
}
