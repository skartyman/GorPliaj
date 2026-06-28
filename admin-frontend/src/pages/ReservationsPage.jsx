import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import AdminLayout from '../components/AdminLayout';
import DataTable from '../components/DataTable';
import FilterBar from '../components/FilterBar';
import PageContainer from '../components/PageContainer';
import StatusPill from '../components/StatusPill';
import { apiRequest, formatDate, formatTime, localizeField } from '../lib/api';
import { useAdminI18n } from '../lib/i18n';
import { parseReservationMeta } from '../lib/reservationMeta';

const KANBAN_STATUS_ORDER = ['PENDING', 'AWAITING_PAYMENT', 'CONFIRMED', 'HELD', 'SEATED', 'COMPLETED', 'CANCELLED', 'NO_SHOW'];

function getBookingKindLabel(bookingKind, t) {
  return t(`reservationMeta.bookingKind.${bookingKind}`);
}

function getUsageModeLabel(usageMode, t) {
  return t(`reservationMeta.mode.${usageMode}`);
}

function getPositionTypeLabel(positionType, t) {
  return t(`reservationMeta.place.${positionType}`);
}

function getReservationUnitName(reservation, language, tFn) {
  const code = reservation.table?.code || localizeField(reservation.table?.name, language) || '';
  const rowSortOrder = reservation.table?.row?.sortOrder;
  const rowLabel = rowSortOrder != null ? `${tFn ? tFn('reservationDetail.fields.row') : 'Ряд'} ${rowSortOrder}` : '';
  return [code, rowLabel].filter(Boolean).join(' · ') || '—';
}

function getReservationModePlace(reservation, t) {
  const meta = parseReservationMeta(reservation.commentCustomer);
  const modeLabel = reservation.map?.usageMode
    ? getUsageModeLabel(reservation.map.usageMode, t)
    : (meta.mode ? t(`reservationMeta.mode.${meta.mode}`) : '—');
  const placeLabel = reservation.table?.positionType
    ? getPositionTypeLabel(reservation.table.positionType, t)
    : (reservation.bookingKind ? getBookingKindLabel(reservation.bookingKind, t) : (meta.place ? t(`reservationMeta.place.${meta.place}`) : '—'));

  return `${modeLabel} / ${placeLabel}`;
}

function getPositionDisplayName(position, language) {
  return localizeField(position?.serviceName, language) || position?.code || localizeField(position?.name, language) || '—';
}

function getDateLocale(language) {
  return language === 'ua' ? 'uk-UA' : (language === 'ru' ? 'ru-RU' : 'en-US');
}

function toDateInput(value) {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) {
    return new Date().toISOString().slice(0, 10);
  }

  return date.toISOString().slice(0, 10);
}

function buildBookingForm(position, reservationDate, eventId) {
  return {
    tableId: position.id,
    mapId: position.map.id,
    zoneId: position.zone?.id || '',
    bookingKind: position.bookingKind,
    eventId: eventId || '',
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    guests: position.seatsMin || 1,
    reservationDate,
    timeFrom: '12:00',
    timeTo: '',
    source: 'WALK_IN',
    status: 'PENDING',
    depositRequired: Number(position.effective?.deposit || 0) > 0,
    depositAmount: Number(position.effective?.deposit || 0),
    commentCustomer: '',
    commentAdmin: ''
  };
}

function KanbanCard({ reservation, onQuickAction, actionLoadingId, t, language }) {
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
          <span>{getReservationUnitName(reservation, language, t)} / {localizeField(reservation.zone?.name, language) || '—'}</span>
        </div>
        <div className="kanban-card-row">
          <span className="muted">{t('reservations.columns.dateTime')}:</span>
          <span>{formatDate(reservation.reservationDate, getDateLocale(language))} {formatTime(reservation.timeFrom, getDateLocale(language))}</span>
        </div>
        <div className="kanban-card-row">
          <span className="muted">{t('reservations.columns.modePlace')}:</span>
          <span>{getReservationModePlace(reservation, t)}</span>
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

function KanbanBoard({ rows, onQuickAction, actionLoadingId, t, language }) {
  const columns = useMemo(() => {
    const grouped = {};
    for (const status of KANBAN_STATUS_ORDER) {
      const items = rows.filter((row) => row.status === status);
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
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function ReservationsPage() {
  const { t, language } = useAdminI18n();
  const location = useLocation();
  const dateLocale = getDateLocale(language);
  const today = useMemo(() => toDateInput(new Date()), []);

  const [state, setState] = useState({ loading: true, error: '', rows: [] });
  const [viewMode, setViewMode] = useState('table');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [dateFilter, setDateFilter] = useState(today);
  const [actionLoadingId, setActionLoadingId] = useState('');

  const [managementState, setManagementState] = useState({
    loading: true,
    error: '',
    positions: [],
    maps: [],
    events: [],
    scope: { reservationDate: today, eventId: null }
  });
  const [managementSearch, setManagementSearch] = useState('');
  const [managementMapId, setManagementMapId] = useState('');
  const [managementZoneId, setManagementZoneId] = useState('');
  const [managementEventId, setManagementEventId] = useState('');
  const [positionActionState, setPositionActionState] = useState({ savingBase: false, error: '', success: '' });
  const [bookingFormState, setBookingFormState] = useState({ open: false, saving: false, error: '', success: '', form: null });
  const [positionModal, setPositionModal] = useState({ type: null, position: null });
  const [depositEdit, setDepositEdit] = useState({ saving: false, value: 0 });
  const [photoEdit, setPhotoEdit] = useState({ saving: false, url: '' });

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

  useEffect(() => {
    if (location.hash !== '#manual-booking') return;
    setActiveTab('availability');
    window.setTimeout(() => {
      document.getElementById('manual-booking')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 240);
  }, [location.hash]);

  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams();
    if (dateFilter) params.set('date', dateFilter);
    if (managementEventId) params.set('eventId', managementEventId);
    if (managementMapId) params.set('mapId', managementMapId);
    if (managementZoneId) params.set('zoneId', managementZoneId);
    if (managementSearch.trim()) params.set('search', managementSearch.trim());

    setManagementState((prev) => ({ ...prev, loading: true, error: '' }));

    apiRequest(`/api/admin/reservation-positions?${params.toString()}`)
      .then(({ response, body }) => {
        if (cancelled) return;
        if (!response.ok) {
          setManagementState((prev) => ({ ...prev, loading: false, error: body.message || t('reservations.management.errors.loadPositions') }));
          return;
        }

        const nextPositions = Array.isArray(body.positions) ? body.positions : [];
        setManagementState({
          loading: false,
          error: '',
          positions: nextPositions,
          maps: Array.isArray(body.maps) ? body.maps : [],
          events: Array.isArray(body.events) ? body.events : [],
          scope: body.scope || { reservationDate: dateFilter || today, eventId: managementEventId ? Number(managementEventId) : null }
        });
      })
      .catch(() => {
        if (!cancelled) {
          setManagementState((prev) => ({ ...prev, loading: false, error: t('reservations.management.errors.loadPositions') }));
        }
      });

    return () => {
      cancelled = true;
    };
  }, [dateFilter, managementEventId, managementMapId, managementZoneId, managementSearch, today]);

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

  const timelineRows = useMemo(() => {
    return [...filteredRows].sort((a, b) => {
      const timeA = a.timeFrom || '00:00';
      const timeB = b.timeFrom || '00:00';
      return timeA.localeCompare(timeB);
    });
  }, [filteredRows]);

  function getTimelineActions(reservation) {
    const list = [];
    const isUa = language === 'ua';
    const isRu = language === 'ru';
    if (reservation.status === 'PENDING') {
      list.push({ label: isUa ? 'Підтвердити' : isRu ? 'Подтвердить' : 'Confirm', status: 'CONFIRMED', className: 'btn btn-small' });
      list.push({ label: isUa ? 'Скасувати' : isRu ? 'Отменить' : 'Cancel', status: 'CANCELLED', className: 'btn btn-small btn-danger' });
    } else if (reservation.status === 'CONFIRMED') {
      list.push({ label: isUa ? 'Посадити' : isRu ? 'Посадить' : 'Seat Guest', status: 'SEATED', className: 'btn btn-small btn-primary' });
      list.push({ label: isUa ? 'Завершити' : isRu ? 'Завершить' : 'Complete', status: 'COMPLETED', className: 'btn btn-small btn-success' });
      list.push({ label: isUa ? 'Скасувати' : isRu ? 'Отменить' : 'Cancel', status: 'CANCELLED', className: 'btn btn-small btn-danger' });
    } else if (reservation.status === 'SEATED') {
      list.push({ label: isUa ? 'Завершити' : isRu ? 'Завершить' : 'Complete', status: 'COMPLETED', className: 'btn btn-small btn-success' });
      list.push({ label: isUa ? 'Не зʼявився' : isRu ? 'Не пришел' : 'No Show', status: 'NO_SHOW', className: 'btn btn-small btn-secondary' });
    }
    return list;
  }

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

  async function reloadManagement() {
    const params = new URLSearchParams();
    if (dateFilter) params.set('date', dateFilter);
    if (managementEventId) params.set('eventId', managementEventId);
    if (managementMapId) params.set('mapId', managementMapId);
    if (managementZoneId) params.set('zoneId', managementZoneId);
    if (managementSearch.trim()) params.set('search', managementSearch.trim());

    setManagementState((prev) => ({ ...prev, loading: true, error: '' }));
    const { response, body } = await apiRequest(`/api/admin/reservation-positions?${params.toString()}`);
    if (!response.ok) {
      setManagementState((prev) => ({ ...prev, loading: false, error: body.message || t('reservations.management.errors.loadPositions') }));
      return false;
    }

    const nextPositions = Array.isArray(body.positions) ? body.positions : [];
    setManagementState({
      loading: false,
      error: '',
      positions: nextPositions,
      maps: Array.isArray(body.maps) ? body.maps : [],
      events: Array.isArray(body.events) ? body.events : [],
      scope: body.scope || { reservationDate: dateFilter || today, eventId: managementEventId ? Number(managementEventId) : null }
    });
    return true;
  }

  async function onQuickAction(id, status) {
    try {
      setActionLoadingId(id);
      const { response, body } = await apiRequest(`/api/admin/reservations/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status })
      });

      if (!response.ok) {
        setState((prev) => ({ ...prev, error: body.message || t('reservations.errors.update') }));
        return;
      }

      setState((prev) => ({
        ...prev,
        error: '',
        rows: prev.rows.map((row) => (row.id === id ? { ...row, status: body?.reservation?.status || status } : row))
      }));
      await reloadManagement();
    } catch {
      setState((prev) => ({ ...prev, error: t('reservations.errors.update') }));
    } finally {
      setActionLoadingId('');
    }
  }

  function updateBookingForm(field, value) {
    setBookingFormState((current) => ({
      ...current,
      form: current.form ? { ...current.form, [field]: value } : current.form
    }));
  }

  async function submitBookingForm(event) {
    event.preventDefault();
    if (!bookingFormState.form) return;

    setBookingFormState((current) => ({ ...current, saving: true, error: '', success: '' }));
    const payload = {
      ...bookingFormState.form,
      tableId: Number(bookingFormState.form.tableId),
      mapId: Number(bookingFormState.form.mapId),
      zoneId: Number(bookingFormState.form.zoneId),
      eventId: bookingFormState.form.eventId ? Number(bookingFormState.form.eventId) : undefined,
      guests: Number(bookingFormState.form.guests),
      depositRequired: Boolean(bookingFormState.form.depositRequired),
      depositAmount: bookingFormState.form.depositRequired ? Number(bookingFormState.form.depositAmount || 0) : 0
    };

    const { response, body } = await apiRequest('/api/admin/reservations', {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      setBookingFormState((current) => ({ ...current, saving: false, error: body.message || t('reservations.management.errors.createReservation') }));
      return;
    }

    setState((prev) => ({
      ...prev,
      rows: body?.reservation ? [body.reservation, ...prev.rows] : prev.rows
    }));
    await reloadManagement();
    setBookingFormState((current) => ({
      ...current,
      saving: false,
      open: false,
      success: t('reservations.management.feedback.reservationCreated')
    }));
  }

  async function togglePositionAvailability(position) {
    const nextActive = !position.effective?.isActive;
    const nextBookable = nextActive ? true : false;
    setPositionActionState((current) => ({ ...current, savingBase: true, error: '', success: '' }));
    const { response, body } = await apiRequest(`/api/admin/reservation-positions/${position.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ isActive: nextActive, isBookable: nextBookable, deposit: Number(position.effective?.deposit || 0) })
    });
    if (!response.ok) {
      setPositionActionState((current) => ({ ...current, savingBase: false, error: body.message || t('reservations.management.errors.saveBase') }));
      return;
    }
    await reloadManagement();
    setPositionActionState((current) => ({ ...current, savingBase: false, success: '' }));
  }

  async function saveDepositFromModal() {
    const pos = positionModal.position;
    if (!pos) return;
    setDepositEdit((c) => ({ ...c, saving: true }));
    const { response, body } = await apiRequest(`/api/admin/reservation-positions/${pos.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ deposit: Number(depositEdit.value || 0), isActive: Boolean(pos.effective?.isActive), isBookable: Boolean(pos.effective?.isBookable) })
    });
    if (!response.ok) {
      setPositionActionState((current) => ({ ...current, error: body.message || t('reservations.management.errors.saveBase') }));
      setDepositEdit((c) => ({ ...c, saving: false }));
      return;
    }
    await reloadManagement();
    setPositionModal({ type: null, position: null });
    setDepositEdit({ saving: false, value: 0 });
  }

  async function savePhotoFromModal() {
    const pos = positionModal.position;
    if (!pos) return;
    setPhotoEdit((c) => ({ ...c, saving: true }));
    const { response, body } = await apiRequest(`/api/admin/reservation-positions/${pos.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ photoUrl: photoEdit.url, isActive: Boolean(pos.effective?.isActive), isBookable: Boolean(pos.effective?.isBookable), deposit: Number(pos.effective?.deposit || 0) })
    });
    if (!response.ok) {
      setPositionActionState((current) => ({ ...current, error: body.message || t('reservations.management.errors.saveBase') }));
      setPhotoEdit((c) => ({ ...c, saving: false }));
      return;
    }
    await reloadManagement();
    setPositionModal({ type: null, position: null });
    setPhotoEdit({ saving: false, url: '' });
  }

  async function uploadPhotoFromModal(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    setPhotoEdit((c) => ({ ...c, saving: true }));
    const formData = new FormData();
    formData.append('folder', 'map-objects');
    formData.append('image', file);
    const result = await apiRequest('/api/admin/uploads/image', { method: 'POST', body: formData });
    if (!result.response.ok || !result.body?.url) {
      setPositionActionState((current) => ({ ...current, error: result.body?.message || t('reservations.management.errors.uploadPhoto') }));
      setPhotoEdit((c) => ({ ...c, saving: false }));
      event.target.value = '';
      return;
    }
    setPhotoEdit({ saving: false, url: result.body.url });
    event.target.value = '';
  }

  const reservationColumns = [
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
      render: (reservation) => `${getReservationUnitName(reservation, language, t)} / ${localizeField(reservation.zone?.name, language) || '—'}`
    },
    {
      key: 'guests',
      label: t('reservations.columns.guests'),
      render: (reservation) => reservation.guests || '—'
    },
    {
      key: 'modePlace',
      label: t('reservations.columns.modePlace'),
      render: (reservation) => getReservationModePlace(reservation, t)
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
    setDateFilter(today);
    setManagementSearch('');
    setManagementMapId('');
    setManagementZoneId('');
    setManagementEventId('');
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

        <div className="menu-admin-section-switch" role="tablist" style={{ marginTop: 24, marginBottom: 24 }}>
          <button
            type="button"
            className={`menu-admin-section-switch-btn ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
          >
            📅 {language === 'ua' ? 'Календар & Стрічка' : language === 'ru' ? 'Календарь & Лента' : 'Calendar & Schedule'}
          </button>
          <button
            type="button"
            className={`menu-admin-section-switch-btn ${activeTab === 'bookings' ? 'active' : ''}`}
            onClick={() => setActiveTab('bookings')}
          >
            📋 {language === 'ua' ? 'Список бронювань' : language === 'ru' ? 'Список бронирований' : 'Bookings List'}
          </button>
          <button
            type="button"
            className={`menu-admin-section-switch-btn ${activeTab === 'availability' ? 'active' : ''}`}
            onClick={() => setActiveTab('availability')}
          >
            ⚙️ {language === 'ua' ? 'Керування наявністю' : language === 'ru' ? 'Управление доступностью' : 'Availability & Overrides'}
          </button>
        </div>

        {activeTab === 'dashboard' && (
          <>
            <FilterBar>
              <label>
                {language === 'ua' ? 'Обрати дату' : language === 'ru' ? 'Выбрать дату' : 'Select Date'}
                <input type="date" value={dateFilter} onChange={(event) => setDateFilter(event.target.value)} />
              </label>
            </FilterBar>

            {state.loading ? <p>{t('reservations.loading')}</p> : null}
            {state.error ? <p className="error">{state.error}</p> : null}

            {!state.loading && !state.error && (
              <div className="timeline-container">
                {timelineRows.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px 10px', color: 'var(--text-muted)' }}>
                    <div style={{ fontSize: '48px', marginBottom: '16px' }}>📅</div>
                    <p style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)' }}>
                      {language === 'ua' ? 'Немає бронювань на цей день' : language === 'ru' ? 'Нет бронирований на этот день' : 'No reservations for this day'}
                    </p>
                  </div>
                ) : (
                  timelineRows.map((reservation) => {
                    const actions = getTimelineActions(reservation);
                    return (
                      <div key={reservation.id} className="timeline-item">
                        <div className="timeline-time-col">
                          <div className="timeline-time-badge">
                            {formatTime(reservation.timeFrom, dateLocale)}
                          </div>
                        </div>
                        <div className={`timeline-card status-${String(reservation.status).toLowerCase()}`}>
                          <div className="timeline-card-content">
                            <div className="timeline-guest-info">
                              <Link to={`/admin/reservations/${reservation.id}`} className="timeline-guest-name">
                                #{reservation.id} {reservation.customerName || t('common.guest')}
                              </Link>
                              <StatusPill status={reservation.status} />
                            </div>
                            
                            <div className="timeline-meta-grid">
                              <div className="timeline-meta-item">
                                📞 <strong>{reservation.customerPhone || t('common.noData')}</strong>
                              </div>
                              <div className="timeline-meta-item">
                                👥 {reservation.guests || '—'} {language === 'ua' ? 'гостей' : language === 'ru' ? 'гостей' : 'guests'}
                              </div>
                              <div className="timeline-meta-item">
                                📍 {getReservationUnitName(reservation, language, t)} / {localizeField(reservation.zone?.name, language) || '—'}
                              </div>
                              <div className="timeline-meta-item">
                                🏷️ {getReservationModePlace(reservation, t)}
                              </div>
                            </div>
                            
                            {reservation.commentCustomer && (
                              <div className="timeline-comment">
                                &ldquo;{reservation.commentCustomer}&rdquo;
                              </div>
                            )}
                          </div>
                          
                          {actions.length > 0 && (
                            <div className="timeline-actions">
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
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </>
        )}

        {activeTab === 'bookings' && (
          <>
            <div className="menu-admin-section-switch" role="tablist" style={{ marginBottom: 16, width: 'fit-content' }}>
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
                <DataTable columns={reservationColumns} rows={filteredRows} emptyText={t('reservations.empty')} />
              ) : (
                <KanbanBoard
                  rows={filteredRows}
                  onQuickAction={onQuickAction}
                  actionLoadingId={actionLoadingId}
                  t={t}
                  language={language}
                />
              )
            ) : null}
          </>
        )}

        {activeTab === 'availability' && (
          <section id="manual-booking" className="panel-card">
            <div className="panel-card-head">
              <div>
                <span className="eyebrow">{t('reservations.management.title')}</span>
                <h3 className="panel-section-title">{t('reservations.management.description')}</h3>
              </div>
              <Link className="btn btn-secondary btn-small" to="/admin/map">{t('reservations.management.openMap')}</Link>
            </div>

            <FilterBar>
              <label>
                {t('reservations.management.scopeDate')}
                <input type="date" value={dateFilter} onChange={(event) => setDateFilter(event.target.value)} />
              </label>
              <label>
                {t('reservations.management.event')}
                <select
                  value={managementEventId}
                  onChange={(event) => {
                    const nextValue = event.target.value;
                    setManagementEventId(nextValue);
                    const selectedEvent = managementState.events.find((item) => String(item.id) === nextValue);
                    if (selectedEvent?.startAt) setDateFilter(toDateInput(selectedEvent.startAt));
                  }}
                >
                  <option value="">{t('reservations.management.noEvent')}</option>
                  {managementState.events.map((ev) => (
                    <option key={ev.id} value={ev.id}>{localizeField(ev.title, language) || `#${ev.id}`} · {formatDate(ev.startAt, dateLocale)}</option>
                  ))}
                </select>
              </label>
              <label>
                {t('reservations.management.map')}
                <select value={managementMapId} onChange={(event) => { setManagementMapId(event.target.value); setManagementZoneId(''); }}>
                  <option value="">{t('reservations.management.allMaps')}</option>
                  {managementState.maps.map((m) => (
                    <option key={m.id} value={m.id}>{localizeField(m.name, language) || `#${m.id}`}</option>
                  ))}
                </select>
              </label>
              <label>
                {t('reservations.management.zone')}
                <select value={managementZoneId} onChange={(event) => setManagementZoneId(event.target.value)}>
                  <option value="">{t('reservations.management.allZones')}</option>
                  {managementState.maps
                    .filter((m) => !managementMapId || String(m.id) === managementMapId)
                    .flatMap((m) => m.zones || [])
                    .map((z) => (
                      <option key={z.id} value={z.id}>{localizeField(z.name, language) || `#${z.id}`}</option>
                    ))}
                </select>
              </label>
              <label>
                {t('reservations.management.search')}
                <input value={managementSearch} onChange={(event) => setManagementSearch(event.target.value)} placeholder={t('reservations.management.searchPlaceholder')} />
              </label>
            </FilterBar>

            {managementState.loading ? <p>{t('reservations.management.loading')}</p> : null}
            {managementState.error ? <p className="error">{managementState.error}</p> : null}
            {positionActionState.error ? <p className="error">{positionActionState.error}</p> : null}
            {positionActionState.success ? <p className="success-message">{positionActionState.success}</p> : null}
            {bookingFormState.success ? <p className="success-message">{bookingFormState.success}</p> : null}

            {!managementState.loading && !managementState.error && (
              <div className="position-flat-table-wrap">
                <table className="position-flat-table">
                  <thead>
                    <tr>
                      <th>{t('reservations.management.flat.code')}</th>
                      <th>{t('reservations.management.flat.type')}</th>
                      <th>{t('reservations.management.flat.zone')}</th>
                      <th>{t('reservations.management.flat.capacity')}</th>
                      <th>{t('reservations.management.flat.deposit')}</th>
                      <th>{t('reservations.management.flat.status')}</th>
                      <th>{t('reservations.management.flat.bookings')}</th>
                      <th>{t('reservations.management.flat.actions')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {managementState.positions.length === 0 ? (
                      <tr><td colSpan="8" className="muted" style={{ textAlign: 'center', padding: '24px' }}>{t('reservations.management.empty')}</td></tr>
                    ) : managementState.positions.map((pos) => {
                      const isActive = Boolean(pos.effective?.isActive);
                      const isBookable = Boolean(pos.effective?.isBookable);
                      return (
                        <tr key={pos.id} className={!isActive ? 'position-row-inactive' : ''}>
                          <td><strong>{pos.code || `#${pos.id}`}</strong></td>
                          <td>{getBookingKindLabel(pos.bookingKind, t)} · {getPositionTypeLabel(pos.positionType, t)}</td>
                          <td>{localizeField(pos.map?.name, language) || '—'} / {localizeField(pos.zone?.name, language) || '—'}</td>
                          <td>{pos.seatsMin}-{pos.seatsMax}</td>
                          <td>
                            <button type="button" className="btn-link" onClick={() => { setPositionModal({ type: 'deposit', position: pos }); setDepositEdit({ saving: false, value: Number(pos.effective?.deposit || 0) }); }}>
                              {Number(pos.effective?.deposit || 0)}
                            </button>
                          </td>
                          <td>
                            <StatusPill status={isActive && isBookable ? 'CONFIRMED' : isActive ? 'HELD' : 'CANCELLED'} />
                          </td>
                          <td>{pos.reservationStats?.activeCount || 0}</td>
                          <td className="position-flat-actions">
                            <button type="button" className="btn btn-small btn-secondary" title={t('reservations.management.flat.toggleAvailability')} onClick={() => togglePositionAvailability(pos)} disabled={positionActionState.savingBase}>
                              {isActive ? '⏸' : '▶️'}
                            </button>
                            <button type="button" className="btn btn-small btn-secondary" title={t('reservations.management.flat.photo')} onClick={() => { setPositionModal({ type: 'photo', position: pos }); setPhotoEdit({ saving: false, url: pos.effective?.photoUrl || pos.base?.photoUrl || '' }); }}>
                              📷
                            </button>
                            <button type="button" className="btn btn-small" title={t('reservations.management.flat.createBooking')} onClick={() => { setPositionModal({ type: 'booking', position: pos }); setBookingFormState((c) => ({ ...c, open: true, error: '', success: '', form: buildBookingForm(pos, managementState.scope.reservationDate || today, managementState.scope.eventId || managementEventId) })) }}>
                              📅
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {positionModal.type === 'deposit' && positionModal.position && (
              <div className="modal-overlay" onClick={() => setPositionModal({ type: null, position: null })}>
                <div className="modal-card" onClick={(e) => e.stopPropagation()}>
                  <h4>{t('reservations.management.flat.deposit')} — {positionModal.position.code || `#${positionModal.position.id}`}</h4>
                  <label>
                    {t('reservations.management.flat.deposit')}
                    <input type="number" min="0" step="1" value={depositEdit.value} onChange={(e) => setDepositEdit((c) => ({ ...c, value: e.target.value }))} />
                  </label>
                  <div className="modal-actions">
                    <button type="button" className="btn btn-secondary" onClick={() => setPositionModal({ type: null, position: null })}>{t('reservations.management.flat.cancel')}</button>
                    <button type="button" className="btn" disabled={depositEdit.saving} onClick={saveDepositFromModal}>{depositEdit.saving ? t('reservations.management.flat.saving') : t('reservations.management.flat.save')}</button>
                  </div>
                </div>
              </div>
            )}

            {positionModal.type === 'photo' && positionModal.position && (
              <div className="modal-overlay" onClick={() => setPositionModal({ type: null, position: null })}>
                <div className="modal-card" onClick={(e) => e.stopPropagation()}>
                  <h4>{t('reservations.management.flat.photo')} — {positionModal.position.code || `#${positionModal.position.id}`}</h4>
                  {photoEdit.url ? <img src={photoEdit.url} alt="" className="modal-photo-preview" /> : null}
                  <label>
                    {t('reservations.management.flat.photoUrl')}
                    <input type="url" value={photoEdit.url} onChange={(e) => setPhotoEdit((c) => ({ ...c, url: e.target.value }))} placeholder="https://..." />
                  </label>
                  <label className="btn btn-secondary btn-small">
                    {photoEdit.saving ? t('reservations.management.baseSettings.uploading') : t('reservations.management.baseSettings.uploadPhoto')}
                    <input type="file" accept=".png,.jpg,.jpeg,.webp" onChange={uploadPhotoFromModal} disabled={photoEdit.saving} />
                  </label>
                  <div className="modal-actions">
                    <button type="button" className="btn btn-secondary" onClick={() => setPositionModal({ type: null, position: null })}>{t('reservations.management.flat.cancel')}</button>
                    <button type="button" className="btn" disabled={photoEdit.saving} onClick={savePhotoFromModal}>{photoEdit.saving ? t('reservations.management.flat.saving') : t('reservations.management.flat.save')}</button>
                  </div>
                </div>
              </div>
            )}

            {positionModal.type === 'booking' && positionModal.position && bookingFormState.form ? (
              <div className="modal-overlay" onClick={() => setPositionModal({ type: null, position: null })}>
                <div className="modal-card modal-card-wide" onClick={(e) => e.stopPropagation()}>
                  <h4>{t('reservations.management.manualBooking.title')} — {getPositionDisplayName(positionModal.position, language)}</h4>
                  {bookingFormState.error ? <p className="error">{bookingFormState.error}</p> : null}
                  <form className="admin-form-grid" onSubmit={(e) => { e.preventDefault(); submitBookingForm(e); }}>
                    <label>
                      {t('reservations.management.manualBooking.guestName')}
                      <input type="text" required value={bookingFormState.form.customerName} onChange={(e) => updateBookingForm('customerName', e.target.value)} />
                    </label>
                    <label>
                      {t('reservations.management.manualBooking.phone')}
                      <input type="text" required value={bookingFormState.form.customerPhone} onChange={(e) => updateBookingForm('customerPhone', e.target.value)} />
                    </label>
                    <label>
                      {t('reservations.management.manualBooking.email')}
                      <input type="email" value={bookingFormState.form.customerEmail} onChange={(e) => updateBookingForm('customerEmail', e.target.value)} />
                    </label>
                    <label>
                      {t('reservations.management.manualBooking.guests')}
                      <input type="number" min={positionModal.position.seatsMin || 1} max={positionModal.position.seatsMax || 99} required value={bookingFormState.form.guests} onChange={(e) => updateBookingForm('guests', e.target.value)} />
                    </label>
                    <label>
                      {t('reservations.management.manualBooking.date')}
                      <input type="date" required value={bookingFormState.form.reservationDate} onChange={(e) => updateBookingForm('reservationDate', e.target.value)} />
                    </label>
                    <label>
                      {t('reservations.management.manualBooking.start')}
                      <input type="time" required value={bookingFormState.form.timeFrom} onChange={(e) => updateBookingForm('timeFrom', e.target.value)} />
                    </label>
                    <label>
                      {t('reservations.management.manualBooking.end')}
                      <input type="time" value={bookingFormState.form.timeTo} onChange={(e) => updateBookingForm('timeTo', e.target.value)} />
                    </label>
                    <label>
                      {t('reservations.management.manualBooking.source')}
                      <select value={bookingFormState.form.source} onChange={(e) => updateBookingForm('source', e.target.value)}>
                        <option value="WALK_IN">Walk-in</option>
                        <option value="PHONE">Phone</option>
                        <option value="INSTAGRAM">Instagram</option>
                        <option value="FACEBOOK">Facebook</option>
                        <option value="WEB">Web</option>
                      </select>
                    </label>
                    <label>
                      {t('reservations.management.manualBooking.status')}
                      <select value={bookingFormState.form.status} onChange={(e) => updateBookingForm('status', e.target.value)}>
                        <option value="PENDING">Pending</option>
                        <option value="CONFIRMED">Confirmed</option>
                      </select>
                    </label>
                    <label className="checkbox-label inline">
                      <input type="checkbox" checked={Boolean(bookingFormState.form.depositRequired)} onChange={(e) => updateBookingForm('depositRequired', e.target.checked)} />
                      {t('reservations.management.manualBooking.depositRequired')}
                    </label>
                    <label>
                      {t('reservations.management.manualBooking.depositAmount')}
                      <input type="number" min="0" step="1" disabled={!bookingFormState.form.depositRequired} value={bookingFormState.form.depositAmount} onChange={(e) => updateBookingForm('depositAmount', e.target.value)} />
                    </label>
                    <label className="field-span-2">
                      {t('reservations.management.manualBooking.guestComment')}
                      <textarea rows="2" value={bookingFormState.form.commentCustomer} onChange={(e) => updateBookingForm('commentCustomer', e.target.value)}></textarea>
                    </label>
                    <label className="field-span-2">
                      {t('reservations.management.manualBooking.adminComment')}
                      <textarea rows="2" value={bookingFormState.form.commentAdmin} onChange={(e) => updateBookingForm('commentAdmin', e.target.value)}></textarea>
                    </label>
                    <div className="actions field-span-2">
                      <button type="button" className="btn btn-secondary" onClick={() => setPositionModal({ type: null, position: null })}>{t('reservations.management.flat.cancel')}</button>
                      <button type="submit" className="btn" disabled={bookingFormState.saving}>
                        {bookingFormState.saving ? t('reservations.management.manualBooking.saving') : t('reservations.management.manualBooking.create')}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            ) : null}
          </section>
        )}
      </PageContainer>
    </AdminLayout>
  );
}
