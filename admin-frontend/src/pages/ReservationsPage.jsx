import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import AdminLayout from '../components/AdminLayout';
import { apiRequest, formatDate, formatTime } from '../lib/api';

export default function ReservationsPage() {
  const [state, setState] = useState({ loading: true, error: '', rows: [] });

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

  return (
    <AdminLayout>
      <section className="card">
        <h1>Reservations</h1>
        {state.loading ? <p>Loading reservations...</p> : null}
        {state.error ? <p className="error">{state.error}</p> : null}
        {!state.loading && !state.error && !state.rows.length ? <p>No reservations found.</p> : null}
        {!state.loading && state.rows.length ? (
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
                {state.rows.map((reservation) => (
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
                      <span className={`status ${reservation.status}`}>{reservation.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>
    </AdminLayout>
  );
}
