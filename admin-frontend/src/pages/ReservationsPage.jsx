import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import AdminLayout from '../components/AdminLayout';
import DataTable from '../components/DataTable';
import FilterBar from '../components/FilterBar';
import PageContainer from '../components/PageContainer';
import StatusPill from '../components/StatusPill';
import { apiRequest, formatDate, formatTime } from '../lib/api';

const QUICK_ACTIONS = {
  PENDING: [
    { label: 'Confirm', status: 'CONFIRMED', className: 'btn btn-small' },
    { label: 'Cancel', status: 'CANCELLED', className: 'btn btn-small btn-danger' }
  ],
  CONFIRMED: [
    { label: 'Complete', status: 'COMPLETED', className: 'btn btn-small btn-success' },
    { label: 'Cancel', status: 'CANCELLED', className: 'btn btn-small btn-danger' }
  ]
};

export default function ReservationsPage() {
  const [state, setState] = useState({ loading: true, error: '', rows: [] });
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [dateFilter, setDateFilter] = useState('');
  const [actionLoadingId, setActionLoadingId] = useState('');

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
      const reservationDate = String(reservation.reservationDate || '').slice(0, 10);
      const matchesDate = !dateFilter || reservationDate === dateFilter;

      if (!query) {
        return matchesStatus && matchesDate;
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

      return matchesStatus && matchesDate && searchable.includes(query);
    });
  }, [search, state.rows, statusFilter, dateFilter]);

  const columns = [
    {
      key: 'id',
      label: 'ID',
      render: (reservation) => <Link to={`/admin/reservations/${reservation.id}`}>{reservation.id}</Link>
    },
    { key: 'reservationDate', label: 'Date', render: (reservation) => formatDate(reservation.reservationDate) },
    { key: 'timeFrom', label: 'Time', render: (reservation) => formatTime(reservation.timeFrom) },
    { key: 'customerName', label: 'Guest' },
    { key: 'customerPhone', label: 'Phone' },
    {
      key: 'table',
      label: 'Table / Zone',
      render: (reservation) => `${reservation.table?.code || reservation.table?.name || '-'} / ${reservation.zone?.name || '-'}`
    },
    { key: 'status', label: 'Status', render: (reservation) => <StatusPill status={reservation.status} /> },
    {
      key: 'actions',
      label: 'Quick actions',
      render: (reservation) => {
        const actions = QUICK_ACTIONS[reservation.status] || [];
        if (!actions.length) {
          return <span className="muted">No actions</span>;
        }

        return (
          <div className="actions compact">
            {actions.map((action) => (
              <button
                key={`${reservation.id}-${action.status}`}
                type="button"
                className={action.className}
                disabled={actionLoadingId === reservation.id}
                onClick={() => onQuickAction(reservation.id, action.status)}
              >
                {actionLoadingId === reservation.id ? 'Saving...' : action.label}
              </button>
            ))}
          </div>
        );
      }
    }
  ];

  async function onQuickAction(id, status) {
    try {
      setActionLoadingId(id);
      const { response, body } = await apiRequest(`/api/admin/reservations/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status })
      });

      if (!response.ok) {
        setState((prev) => ({ ...prev, error: body.message || 'Failed to update reservation status.' }));
        setActionLoadingId('');
        return;
      }

      setState((prev) => ({
        ...prev,
        error: '',
        rows: prev.rows.map((row) => (row.id === id ? { ...row, status: body?.reservation?.status || status } : row))
      }));
    } catch {
      setState((prev) => ({ ...prev, error: 'Failed to update reservation status.' }));
    } finally {
      setActionLoadingId('');
    }
  }

  return (
    <AdminLayout>
      <PageContainer
        title="Reservations"
        description="Live list of reservations from the existing admin API."
        actions={<button className="btn btn-secondary" type="button" onClick={() => window.location.reload()}>Refresh</button>}
      >
        <FilterBar>
          <label>
            Search
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by guest, phone, table, or id"
            />
          </label>
          <label>
            Date
            <input type="date" value={dateFilter} onChange={(event) => setDateFilter(event.target.value)} />
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
        </FilterBar>

        {state.loading ? <p>Loading reservations...</p> : null}
        {state.error ? <p className="error">{state.error}</p> : null}
        {!state.loading && !state.error ? (
          <DataTable columns={columns} rows={filteredRows} emptyText="No reservations found for this filter." />
        ) : null}
      </PageContainer>
    </AdminLayout>
  );
}
