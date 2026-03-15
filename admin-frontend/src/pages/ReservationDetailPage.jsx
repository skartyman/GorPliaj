import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import AdminLayout from '../components/AdminLayout';
import PageCard from '../components/PageCard';
import StatusPill from '../components/StatusPill';
import { apiRequest, formatDateTime } from '../lib/api';

function DetailRow({ label, value }) {
  return (
    <div className="detail-row">
      <span className="muted">{label}</span>
      <strong>{value || '-'}</strong>
    </div>
  );
}

function getActionTone(status) {
  if (status === 'CANCELLED') {
    return 'btn btn-danger';
  }

  if (status === 'COMPLETED') {
    return 'btn btn-success';
  }

  return 'btn';
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
      <PageCard
        title={`Reservation #${id}`}
        description="Detailed reservation view with status workflow actions."
        actions={<Link to="/admin/reservations">Back to list</Link>}
      >
        {state.loading ? <p>Loading reservation...</p> : null}
        {state.error ? <p className="error">{state.error}</p> : null}

        {reservation ? (
          <>
            <div className="reservation-detail-summary">
              <article className="summary-card">
                <h3>Reservation summary</h3>
                <div className="details-grid">
                  <DetailRow label="Current status" value={<StatusPill status={reservation.status} />} />
                  <DetailRow label="Date" value={formatDateTime(reservation.reservationDate)} />
                  <DetailRow label="Time from" value={formatDateTime(reservation.timeFrom)} />
                  <DetailRow label="Time to" value={formatDateTime(reservation.timeTo)} />
                  <DetailRow label="Guests" value={reservation.guests} />
                  <DetailRow label="Table" value={reservation.table?.code || reservation.table?.name || '-'} />
                  <DetailRow label="Zone" value={reservation.zone?.name || '-'} />
                  <DetailRow label="Map" value={reservation.map?.name || '-'} />
                </div>
              </article>

              <article className="summary-card">
                <h3>Customer & contact</h3>
                <div className="details-grid">
                  <DetailRow label="Customer" value={reservation.customerName} />
                  <DetailRow label="Phone" value={reservation.customerPhone} />
                  <DetailRow label="Email" value={reservation.customerEmail || '-'} />
                  <DetailRow label="Customer comments" value={reservation.commentCustomer || '-'} />
                  <DetailRow label="Admin comments" value={reservation.commentAdmin || '-'} />
                </div>
              </article>
            </div>

            <h3>Update status</h3>
            <div className="actions prominent-actions">
              {!allowedNextStatuses.length ? <p className="muted">No status changes available.</p> : null}
              {allowedNextStatuses.map((status) => (
                <button
                  key={status}
                  type="button"
                  className={getActionTone(status)}
                  disabled={state.updating}
                  onClick={() => onChangeStatus(status)}
                >
                  {state.updating ? 'Updating...' : `Set ${status}`}
                </button>
              ))}
            </div>
          </>
        ) : null}
      </PageCard>
    </AdminLayout>
  );
}
