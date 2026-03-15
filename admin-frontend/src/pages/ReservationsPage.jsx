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
    { label: 'Mark completed', status: 'COMPLETED', className: 'btn btn-small btn-success' },
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
      label: 'Reservation',
      render: (reservation) => (
        <div>
          <Link to={`/admin/reservations/${reservation.id}`}>#{reservation.id}</Link>
          <div className="muted small">{reservation.customerName || 'Guest'}</div>
        </div>
      )
    },
    {
      key: 'slot',
      label: 'Date / Time',
      render: (reservation) => (
        <div>
          <div>{formatDate(reservation.reservationDate)}</div>
          <div className="muted small">{formatTime(reservation.timeFrom)}</div>
        </div>
      )
    },
    { key: 'customerPhone', label: 'Phone' },
    {
      key: 'table',
      label: 'Table / Zone',
      render: (reservation) => `${reservation.table?.code || reservation.table?.name || '-'} / ${reservation.zone?.name || '-'}`
    },
    {
      key: 'guests',
      label: 'Guests',
      render: (reservation) => reservation.guests || '-'
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

  function onResetFilters() {
    setSearch('');
    setStatusFilter('ALL');
    setDateFilter('');
  }

  return (
    <AdminLayout>
      <PageContainer
        title="Reservations"
        description="Operational reservation list from the current admin API with fast filtering and actions."
        actions={(
          <>
            <button className="btn btn-secondary" type="button" onClick={onResetFilters}>Reset filters</button>
            <button className="btn btn-secondary" type="button" onClick={() => window.location.reload()}>Refresh</button>
          </>
        )}
      >
        <FilterBar>
          <label>
            Search guest / phone
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Guest name or phone"
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

        <p className="muted table-meta">Showing {filteredRows.length} of {state.rows.length} reservations.</p>

        {state.loading ? <p>Loading reservations...</p> : null}
        {state.error ? <p className="error">{state.error}</p> : null}
        {!state.loading && !state.error ? (
          <DataTable columns={columns} rows={filteredRows} emptyText="No reservations found for this filter." />
        ) : null}
      </PageContainer>
    </AdminLayout>
  );
}
