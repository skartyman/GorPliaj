import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import AdminLayout from '../components/AdminLayout';
import { apiRequest, formatDateTime } from '../lib/api';

function DetailRow({ label, value }) {
  return (
    <div className="detail-row">
      <span className="muted">{label}</span>
      <strong>{value || '-'}</strong>
    </div>
  );
}

export default function ReservationDetailPage() {
  const { id } = useParams();
  const [state, setState] = useState({ loading: true, error: '', data: null, updating: false });

  async function loadReservation() {
    setState((prev) => ({ ...prev, loading: true, error: '' }));
    const { response, body } = await apiRequest(`/api/admin/reservations/${id}`);

    if (!response.ok) {
      setState({ loading: false, error: body.message || 'Failed to load reservation.', data: null, updating: false });
      return;
    }

    setState({ loading: false, error: '', data: body, updating: false });
  }

  useEffect(() => {
    loadReservation().catch(() => {
      setState({ loading: false, error: 'Failed to load reservation.', data: null, updating: false });
    });
  }, [id]);

  async function onChangeStatus(status) {
    setState((prev) => ({ ...prev, updating: true, error: '' }));
    const { response, body } = await apiRequest(`/api/admin/reservations/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status })
    });

    if (!response.ok) {
      setState((prev) => ({ ...prev, updating: false, error: body.message || 'Failed to update status.' }));
      return;
    }

    await loadReservation();
  }

  const reservation = state.data?.reservation;
  const allowedNextStatuses = state.data?.allowedNextStatuses || [];

  return (
    <AdminLayout>
      <section className="card">
        <div className="row-between">
          <h1>Reservation #{id}</h1>
          <Link to="/admin/reservations">Back to list</Link>
        </div>

        {state.loading ? <p>Loading reservation...</p> : null}
        {state.error ? <p className="error">{state.error}</p> : null}

        {reservation ? (
          <>
            <div className="details-grid">
              <DetailRow label="Customer" value={reservation.customerName} />
              <DetailRow label="Phone" value={reservation.customerPhone} />
              <DetailRow label="Email" value={reservation.customerEmail || '-'} />
              <DetailRow label="Guests" value={reservation.guests} />
              <DetailRow label="Date" value={formatDateTime(reservation.reservationDate)} />
              <DetailRow label="Time from" value={formatDateTime(reservation.timeFrom)} />
              <DetailRow label="Time to" value={formatDateTime(reservation.timeTo)} />
              <DetailRow label="Table" value={reservation.table?.code || reservation.table?.name || '-'} />
              <DetailRow label="Zone" value={reservation.zone?.name || '-'} />
              <DetailRow label="Map" value={reservation.map?.name || '-'} />
              <DetailRow label="Customer comments" value={reservation.commentCustomer || '-'} />
              <DetailRow label="Admin comments" value={reservation.commentAdmin || '-'} />
              <DetailRow
                label="Current status"
                value={<span className={`status ${reservation.status}`}>{reservation.status}</span>}
              />
            </div>

            <h2>Status Actions</h2>
            <div className="actions">
              {!allowedNextStatuses.length ? <p className="muted">No status changes available.</p> : null}
              {allowedNextStatuses.map((status) => (
                <button
                  key={status}
                  type="button"
                  className={`btn ${status === 'CANCELLED' ? 'btn-danger' : ''}`}
                  disabled={state.updating}
                  onClick={() => onChangeStatus(status)}
                >
                  {state.updating ? 'Updating...' : `Set ${status}`}
                </button>
              ))}
            </div>
          </>
        ) : null}
      </section>
    </AdminLayout>
  );
}
