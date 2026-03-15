import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import AdminLayout from '../components/AdminLayout';
import PanelCard from '../components/PanelCard';
import StatusPill from '../components/StatusPill';
import { apiRequest, formatDate, formatTime } from '../lib/api';

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
      <PanelCard
        title={`Reservation #${id}`}
        subtitle="Detailed reservation view with operator-friendly status actions."
        actions={<Link to="/admin/reservations">Back to reservations</Link>}
      >
        {state.loading ? <p>Loading reservation...</p> : null}
        {state.error ? <p className="error">{state.error}</p> : null}

        {reservation ? (
          <div className="reservation-detail-grid">
            <PanelCard title="Guest information" className="surface-muted">
              <div className="details-grid compact">
                <DetailRow label="Guest" value={reservation.customerName} />
                <DetailRow label="Phone" value={reservation.customerPhone} />
                <DetailRow label="Guests count" value={reservation.guests} />
                <DetailRow label="Comments" value={reservation.commentCustomer || reservation.commentAdmin || '-'} />
              </div>
            </PanelCard>

            <PanelCard title="Reservation slot" className="surface-muted">
              <div className="details-grid compact">
                <DetailRow label="Date" value={formatDate(reservation.reservationDate)} />
                <DetailRow label="Start time" value={formatTime(reservation.timeFrom)} />
                <DetailRow label="Table" value={reservation.table?.code || reservation.table?.name || '-'} />
                <DetailRow label="Zone" value={reservation.zone?.name || '-'} />
                <DetailRow label="Status" value={<StatusPill status={reservation.status} />} />
              </div>
            </PanelCard>

            <PanelCard title="Status actions" subtitle="Use these actions to keep table flow updated." className="surface-muted">
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
            </PanelCard>
          </div>
        ) : null}
      </PanelCard>
    </AdminLayout>
  );
}
