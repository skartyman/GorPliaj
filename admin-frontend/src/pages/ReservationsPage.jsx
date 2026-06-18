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

const KANBAN_STATUS_ORDER = ['PENDING', 'AWAITING_PAYMENT', 'CONFIRMED', 'HELD', 'SEATED', 'COMPLETED', 'CANCELLED', 'NO_SHOW'];

function pickLabel(language, labels) {
  return labels[language] || labels.ua || labels.ru || labels.en || '';
}

function getBookingKindLabel(bookingKind, language) {
  if (bookingKind === 'BEACH') {
    return pickLabel(language, {
      ua: 'Пляжна послуга',
      ru: 'Пляжная услуга',
      en: 'Beach service'
    });
  }

  return pickLabel(language, {
    ua: 'Стіл',
    ru: 'Стол',
    en: 'Table'
  });
}

function getUsageModeLabel(usageMode, language) {
  if (usageMode === 'EVENING') {
    return pickLabel(language, {
      ua: 'Вечір',
      ru: 'Вечер',
      en: 'Evening'
    });
  }

  if (usageMode === 'EVENT') {
    return pickLabel(language, {
      ua: 'Подія',
      ru: 'Событие',
      en: 'Event'
    });
  }

  return pickLabel(language, {
    ua: 'День',
    ru: 'День',
    en: 'Day'
  });
}

function getPositionTypeLabel(positionType, language) {
  const labels = {
    TABLE: { ua: 'Стіл', ru: 'Стол', en: 'Table' },
    SUNBED: { ua: 'Шезлонг', ru: 'Шезлонг', en: 'Sunbed' },
    BUNGALOW: { ua: 'Бунгало', ru: 'Бунгало', en: 'Bungalow' },
    KROVAT: { ua: 'Ліжко', ru: 'Кровать', en: 'Daybed' },
    PIER: { ua: 'Пірс', ru: 'Пирс', en: 'Pier' }
  };

  return labels[positionType] ? pickLabel(language, labels[positionType]) : '';
}

function getReservationUnitName(reservation, language) {
  return (
    localizeField(reservation.table?.serviceName, language)
    || reservation.table?.code
    || localizeField(reservation.table?.name, language)
    || '—'
  );
}

function getReservationModePlace(reservation, language, t) {
  const meta = parseReservationMeta(reservation.commentCustomer);
  const modeLabel = reservation.map?.usageMode
    ? getUsageModeLabel(reservation.map.usageMode, language)
    : (meta.mode ? t(`reservationMeta.mode.${meta.mode}`) : '—');
  const placeLabel = reservation.table?.positionType
    ? getPositionTypeLabel(reservation.table.positionType, language)
    : (reservation.bookingKind ? getBookingKindLabel(reservation.bookingKind, language) : (meta.place ? t(`reservationMeta.place.${meta.place}`) : '—'));

  return `${modeLabel} / ${placeLabel}`;
}

function KanbanCard({ reservation, onQuickAction, actionLoadingId, t, language, dateLocale }) {
  const actions = {
    PENDING: [
      { label: t('reservations.actions.confirm'), status: 'CONFIRMED', className: 'btn btn-small' },
      { label: t('reservations.actions.cancel'), status: 'CANCELLED', className: 'btn btn-small btn-danger' }
    ],
    CONFIRMED: [
      { label: t('reservations.actions.complete'), status: 'COMPLETED', className: 'btn btn-small btn-success' },
      { label: t('reservations.actions.cancel'), status: 'CANCELLED', className: 'btn btn-small btn-danger' }
    ]
  }[reservation.status] || [];

  return (
    <div className="kanban-card">
      <div className="kanban-card-head">
        <Link to={`/admin/reservations/${reservation.id}`} className="kanban-card-title">
          #{reservation.id} {reservation.customerName || t('common.guest')}
        </Link>
        <StatusPill status={reservation.status} />
      </div>
      <div className="kanban-card-body">
        <div className="kanban-card-row">
          <span className="muted">{t('reservations.columns.phone')}:</span>
          <span>{reservation.customerPhone || t('common.noData')}</span>
        </div>
        <div className="kanban-card-row">
          <span className="muted">{t('reservations.columns.guests')}:</span>
          <span>{reservation.guests || '—'}</span>
        </div>
        <div className="kanban-card-row">
          <span className="muted">{t('reservations.columns.tableZone')}:</span>
          <span>{getReservationUnitName(reservation, language)} / {localizeField(reservation.zone?.name, language) || '—'}</span>
        </div>
        <div className="kanban-card-row">
          <span className="muted">{t('reservations.columns.dateTime')}:</span>
          <span>{formatDate(reservation.reservationDate, dateLocale)} {formatTime(reservation.timeFrom, dateLocale)}</span>
        </div>
        <div className="kanban-card-row">
          <span className="muted">{t('reservations.columns.modePlace')}:</span>
          <span>{getReservationModePlace(reservation, language, t)}</span>
        </div>
      </div>
      {actions.length > 0 ? (
        <div className="kanban-card-actions">
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
      ) : null}
    </div>
  );
}

function KanbanBoard({ rows, onQuickAction, actionLoadingId, t, language, dateLocale }) {
  const dateLocaleResolved = language === 'ua' ? 'uk-UA' : (language === 'ru' ? 'ru-RU' : 'en-US');
  const columns = useMemo(() => {
    const grouped = {};
    for (const status of KANBAN_STATUS_ORDER) {
      const items = rows.filter((r) => r.status === status);
      if (items.length > 0) {
        grouped[status] = items;
      }
    }
    return grouped;
  }, [rows]);

  return (
    <div className="kanban-board">
      {Object.entries(columns).map(([status, items]) => (
        <div key={status} className="kanban-column">
          <div className="kanban-column-head">
            <StatusPill status={status} />
            <span className="kanban-column-count">{items.length}</span>
          </div>
          <div className="kanban-column-body">
            {items.map((reservation) => (
              <KanbanCard
                key={reservation.id}
                reservation={reservation}
                onQuickAction={onQuickAction}
                actionLoadingId={actionLoadingId}
                t={t}
                language={language}
                dateLocale={dateLocaleResolved}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function ReservationsPage() {
  const [state, setState] = useState({ loading: true, error: '', rows: [] });
  const [viewMode, setViewMode] = useState('table');
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
        reservation.bookingKind,
        reservation.table?.code,
        localizeField(reservation.table?.name, language),
        localizeField(reservation.table?.serviceName, language),
        localizeField(reservation.zone?.name, language),
        localizeField(reservation.map?.name, language),
        reservation.map?.usageMode,
        reservation.table?.positionType,
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
      render: (reservation) => `${getReservationUnitName(reservation, language)} / ${localizeField(reservation.zone?.name, language) || '—'}`
    },
    {
      key: 'guests',
      label: t('reservations.columns.guests'),
      render: (reservation) => reservation.guests || '—'
    },
    {
      key: 'modePlace',
      label: t('reservations.columns.modePlace'),
      render: (reservation) => getReservationModePlace(reservation, language, t)
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

        <div className="menu-admin-section-switch" role="tablist">
          <button
            type="button"
            className={`menu-admin-section-switch-btn ${viewMode === 'table' ? 'active' : ''}`}
            onClick={() => setViewMode('table')}
          >
            {t('reservations.viewToggle.table')}
          </button>
          <button
            type="button"
            className={`menu-admin-section-switch-btn ${viewMode === 'kanban' ? 'active' : ''}`}
            onClick={() => setViewMode('kanban')}
          >
            {t('reservations.viewToggle.kanban')}
          </button>
        </div>

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
          viewMode === 'table' ? (
            <DataTable columns={columns} rows={filteredRows} emptyText={t('reservations.empty')} />
          ) : (
            <KanbanBoard
              rows={filteredRows}
              onQuickAction={onQuickAction}
              actionLoadingId={actionLoadingId}
              t={t}
              language={language}
              dateLocale={dateLocale}
            />
          )
        ) : null}
      </PageContainer>
    </AdminLayout>
  );
}
