import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import AdminLayout from '../components/AdminLayout';
import DataTable from '../components/DataTable';
import FilterBar from '../components/FilterBar';
import PageContainer from '../components/PageContainer';
import StatusPill from '../components/StatusPill';
import { apiRequest, formatDate, formatTime, localizeField } from '../lib/api';
import { useAdminI18n } from '../lib/i18n';
import { parseReservationMeta } from '../lib/reservationMeta';

export default function ReservationsPage() {
  const [state, setState] = useState({ loading: true, error: '', rows: [] });
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [dateFilter, setDateFilter] = useState('');
  const [actionLoadingId, setActionLoadingId] = useState('');
  const { t, language } = useAdminI18n();

  const quickActions = useMemo(
    () => ({
      PENDING: [
        { label: t('reservations.actions.confirm'), status: 'CONFIRMED', className: 'btn btn-small' },
        { label: t('reservations.actions.cancel'), status: 'CANCELLED', className: 'btn btn-small btn-danger' }
      ],
      CONFIRMED: [
        { label: t('reservations.actions.complete'), status: 'COMPLETED', className: 'btn btn-small btn-success' },
        { label: t('reservations.actions.cancel'), status: 'CANCELLED', className: 'btn btn-small btn-danger' }
      ]
    }),
    [t]
  );

  useEffect(() => {
    apiRequest('/api/admin/reservations')
      .then(({ response, body }) => {
        if (!response.ok) {
          setState({ loading: false, error: body.message || t('reservations.errors.load'), rows: [] });
          return;
        }

        setState({ loading: false, error: '', rows: Array.isArray(body) ? body : [] });
      })
      .catch(() => {
        setState({ loading: false, error: t('reservations.errors.load'), rows: [] });
      });
  }, [t]);

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
        localizeField(reservation.table?.name, language),
        localizeField(reservation.zone?.name, language),
        parseReservationMeta(reservation.commentCustomer).mode,
        parseReservationMeta(reservation.commentCustomer).place
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return matchesStatus && matchesDate && searchable.includes(query);
    });
  }, [search, state.rows, statusFilter, dateFilter, language]);

  const summary = useMemo(() => {
    const pending = filteredRows.filter((row) => row.status === 'PENDING').length;
    const confirmed = filteredRows.filter((row) => row.status === 'CONFIRMED').length;
    const guests = filteredRows.reduce((total, row) => total + (Number(row.guests) || 0), 0);

    return [
      { label: t('reservations.summary.visible'), value: filteredRows.length },
      { label: t('reservations.summary.pending'), value: pending },
      { label: t('reservations.summary.confirmed'), value: confirmed },
      { label: t('reservations.summary.guests'), value: guests }
    ];
  }, [filteredRows, t]);

  async function onQuickAction(id, status) {
    try {
      setActionLoadingId(id);
      const { response, body } = await apiRequest(`/api/admin/reservations/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status })
      });

      if (!response.ok) {
        setState((prev) => ({ ...prev, error: body.message || t('reservations.errors.update') }));
        setActionLoadingId('');
        return;
      }

      setState((prev) => ({
        ...prev,
        error: '',
        rows: prev.rows.map((row) => (row.id === id ? { ...row, status: body?.reservation?.status || status } : row))
      }));
    } catch {
      setState((prev) => ({ ...prev, error: t('reservations.errors.update') }));
    } finally {
      setActionLoadingId('');
    }
  }

  const dateLocale = language === 'ua' ? 'uk-UA' : (language === 'ru' ? 'ru-RU' : 'en-US');

  const columns = [
    {
      key: 'id',
      label: t('reservations.columns.reservation'),
      render: (reservation) => (
        <div>
          <Link to={`/admin/reservations/${reservation.id}`}>#{reservation.id}</Link>
          <div className="muted small">{reservation.customerName || t('common.guest')}</div>
        </div>
      )
    },
    {
      key: 'slot',
      label: t('reservations.columns.dateTime'),
      render: (reservation) => (
        <div>
          <div>{formatDate(reservation.reservationDate, dateLocale)}</div>
          <div className="muted small">{formatTime(reservation.timeFrom, dateLocale)}</div>
        </div>
      )
    },
    { key: 'customerPhone', label: t('reservations.columns.phone') },
    {
      key: 'table',
      label: t('reservations.columns.tableZone'),
      render: (reservation) => `${reservation.table?.code || localizeField(reservation.table?.name, language) || '—'} / ${localizeField(reservation.zone?.name, language) || '—'}`
    },
    {
      key: 'guests',
      label: t('reservations.columns.guests'),
      render: (reservation) => reservation.guests || '—'
    },
    {
      key: 'modePlace',
      label: t('reservations.columns.modePlace'),
      render: (reservation) => {
        const meta = parseReservationMeta(reservation.commentCustomer);
        const modeLabel = meta.mode ? t(`reservationMeta.mode.${meta.mode}`) : '—';
        const placeLabel = meta.place ? t(`reservationMeta.place.${meta.place}`) : '—';
        return `${modeLabel} / ${placeLabel}`;
      }
    },
    { key: 'status', label: t('reservations.columns.status'), render: (reservation) => <StatusPill status={reservation.status} /> },
    {
      key: 'actions',
      label: t('reservations.columns.actions'),
      render: (reservation) => {
        const actions = quickActions[reservation.status] || [];
        if (!actions.length) {
          return <span className="muted">{t('reservations.actions.none')}</span>;
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
                {actionLoadingId === reservation.id ? t('reservations.actions.save') : action.label}
              </button>
            ))}
          </div>
        );
      }
    }
  ];

  function onResetFilters() {
    setSearch('');
    setStatusFilter('ALL');
    setDateFilter('');
  }

  return (
    <AdminLayout>
      <PageContainer
        title={t('reservations.title')}
        description={t('reservations.description')}
        actions={(
          <>
            <button className="btn btn-secondary" type="button" onClick={onResetFilters}>{t('reservations.resetFilters')}</button>
            <button className="btn btn-secondary" type="button" onClick={() => window.location.reload()}>{t('reservations.refresh')}</button>
          </>
        )}
      >
        <section className="page-hero compact">
          <div className="page-hero-copy">
            <span className="eyebrow">{t('reservations.eyebrow')}</span>
            <h3>{t('reservations.heroTitle')}</h3>
            <p className="muted">{t('reservations.heroDescription')}</p>
          </div>
          <div className="hero-stat-grid mini">
            {summary.map((item) => (
              <article key={item.label} className="hero-stat-card">
                <strong>{state.loading ? '—' : item.value}</strong>
                <span className="muted">{item.label}</span>
              </article>
            ))}
          </div>
        </section>

        <FilterBar>
          <label>
            {t('reservations.searchLabel')}
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t('reservations.searchPlaceholder')}
            />
          </label>
          <label>
            {t('reservations.dateLabel')}
            <input type="date" value={dateFilter} onChange={(event) => setDateFilter(event.target.value)} />
          </label>
          <label>
            {t('reservations.statusLabel')}
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              {statuses.map((status) => (
                <option key={status} value={status}>
                  {status === 'ALL' ? t('reservations.statuses.all') : t(`status.${status}`)}
                </option>
              ))}
            </select>
          </label>
        </FilterBar>

        <p className="muted table-meta">{t('reservations.showing', { visible: filteredRows.length, total: state.rows.length })}</p>

        {state.loading ? <p>{t('reservations.loading')}</p> : null}
        {state.error ? <p className="error">{state.error}</p> : null}
        {!state.loading && !state.error ? (
          <DataTable columns={columns} rows={filteredRows} emptyText={t('reservations.empty')} />
        ) : null}
      </PageContainer>
    </AdminLayout>
  );
}
