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
    PIER: { ua: 'Пірс', ru: 'Пирс', en: 'Pier' },
    RESTAURANT: { ua: 'Ресторан', ru: 'Ресторан', en: 'Restaurant' },
    TERRACE: { ua: 'Тераса', ru: 'Терраса', en: 'Terrace' }
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

function getPositionDisplayName(position, language) {
  return localizeField(position?.serviceName, language) || position?.code || localizeField(position?.name, language) || '—';
}

function getAvailabilityLabel(position, language) {
  if (!position?.effective?.isActive) {
    return pickLabel(language, { ua: 'Сховано', ru: 'Скрыто', en: 'Hidden' });
  }

  if (!position?.effective?.isBookable) {
    return pickLabel(language, { ua: 'Закрито', ru: 'Закрыто', en: 'Closed' });
  }

  return pickLabel(language, { ua: 'Доступно', ru: 'Доступно', en: 'Available' });
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
          <span>{getReservationUnitName(reservation, language)} / {localizeField(reservation.zone?.name, language) || '—'}</span>
        </div>
        <div className="kanban-card-row">
          <span className="muted">{t('reservations.columns.dateTime')}:</span>
          <span>{formatDate(reservation.reservationDate, getDateLocale(language))} {formatTime(reservation.timeFrom, getDateLocale(language))}</span>
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
  const dateLocale = getDateLocale(language);
  const today = useMemo(() => toDateInput(new Date()), []);

  const [state, setState] = useState({ loading: true, error: '', rows: [] });
  const [viewMode, setViewMode] = useState('table');
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
  const [selectedPositionId, setSelectedPositionId] = useState(null);
  const [baseForm, setBaseForm] = useState({ deposit: 0, isActive: true, isBookable: true, photoUrl: '' });
  const [overrideForm, setOverrideForm] = useState({ enabled: false, deposit: 0, isActive: true, isBookable: true, photoUrl: '', note: '' });
  const [positionActionState, setPositionActionState] = useState({ savingBase: false, savingOverride: false, deletingOverride: false, uploading: false, error: '', success: '' });
  const [bookingFormState, setBookingFormState] = useState({ open: false, saving: false, error: '', success: '', form: null });

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
          setManagementState((prev) => ({ ...prev, loading: false, error: body.message || 'Unable to load positions.' }));
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
        setSelectedPositionId((current) => {
          if (current && nextPositions.some((position) => position.id === current)) {
            return current;
          }

          return nextPositions[0]?.id || null;
        });
      })
      .catch(() => {
        if (!cancelled) {
          setManagementState((prev) => ({ ...prev, loading: false, error: 'Unable to load positions.' }));
        }
      });

    return () => {
      cancelled = true;
    };
  }, [dateFilter, managementEventId, managementMapId, managementZoneId, managementSearch, today]);

  const selectedPosition = useMemo(
    () => managementState.positions.find((position) => position.id === selectedPositionId) || null,
    [managementState.positions, selectedPositionId]
  );

  useEffect(() => {
    if (!selectedPosition) {
      return;
    }

    setBaseForm({
      deposit: Number(selectedPosition.base?.deposit || 0),
      isActive: Boolean(selectedPosition.base?.isActive),
      isBookable: Boolean(selectedPosition.base?.isBookable),
      photoUrl: selectedPosition.base?.photoUrl || ''
    });

    setOverrideForm({
      enabled: Boolean(selectedPosition.override),
      deposit: Number(selectedPosition.override?.deposit ?? selectedPosition.effective?.deposit ?? 0),
      isActive: selectedPosition.override?.isActive ?? Boolean(selectedPosition.effective?.isActive),
      isBookable: selectedPosition.override?.isBookable ?? Boolean(selectedPosition.effective?.isBookable),
      photoUrl: selectedPosition.override?.photoUrl ?? selectedPosition.effective?.photoUrl ?? '',
      note: selectedPosition.override?.note || ''
    });

    setPositionActionState({ savingBase: false, savingOverride: false, deletingOverride: false, uploading: false, error: '', success: '' });
    setBookingFormState((current) => ({
      ...current,
      open: false,
      error: '',
      success: '',
      form: buildBookingForm(selectedPosition, managementState.scope.reservationDate || today, managementState.scope.eventId || managementEventId)
    }));
  }, [selectedPosition, managementState.scope.reservationDate, managementState.scope.eventId, managementEventId, today]);

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
      setManagementState((prev) => ({ ...prev, loading: false, error: body.message || 'Unable to load positions.' }));
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
    setSelectedPositionId((current) => {
      if (current && nextPositions.some((position) => position.id === current)) {
        return current;
      }

      return nextPositions[0]?.id || null;
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

  async function saveBaseSettings() {
    if (!selectedPosition) return;

    setPositionActionState((current) => ({ ...current, savingBase: true, error: '', success: '' }));
    const { response, body } = await apiRequest(`/api/admin/reservation-positions/${selectedPosition.id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        deposit: Number(baseForm.deposit || 0),
        isActive: Boolean(baseForm.isActive),
        isBookable: Boolean(baseForm.isBookable),
        photoUrl: baseForm.photoUrl
      })
    });

    if (!response.ok) {
      setPositionActionState((current) => ({ ...current, savingBase: false, error: body.message || 'Unable to save base settings.' }));
      return;
    }

    await reloadManagement();
    setPositionActionState((current) => ({ ...current, savingBase: false, success: 'Base settings saved.' }));
  }

  async function saveOverrideSettings() {
    if (!selectedPosition) return;

    setPositionActionState((current) => ({ ...current, savingOverride: true, error: '', success: '' }));

    if (!overrideForm.enabled) {
      if (!selectedPosition.override) {
        setPositionActionState((current) => ({ ...current, savingOverride: false, success: 'Override is disabled.' }));
        return;
      }

      const query = new URLSearchParams();
      if (managementState.scope.eventId) {
        query.set('eventId', String(managementState.scope.eventId));
      } else {
        query.set('ruleDate', managementState.scope.reservationDate);
      }

      const { response, body } = await apiRequest(`/api/admin/reservation-positions/${selectedPosition.id}/override?${query.toString()}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        setPositionActionState((current) => ({ ...current, savingOverride: false, error: body.message || 'Unable to delete override.' }));
        return;
      }

      await reloadManagement();
      setPositionActionState((current) => ({ ...current, savingOverride: false, success: 'Override removed.' }));
      return;
    }

    const payload = {
      eventId: managementState.scope.eventId || null,
      ruleDate: managementState.scope.eventId ? null : managementState.scope.reservationDate,
      deposit: Number(overrideForm.deposit || 0),
      isActive: Boolean(overrideForm.isActive),
      isBookable: Boolean(overrideForm.isBookable),
      photoUrl: overrideForm.photoUrl,
      note: overrideForm.note
    };

    const { response, body } = await apiRequest(`/api/admin/reservation-positions/${selectedPosition.id}/override`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      setPositionActionState((current) => ({ ...current, savingOverride: false, error: body.message || 'Unable to save override.' }));
      return;
    }

    await reloadManagement();
    setPositionActionState((current) => ({ ...current, savingOverride: false, success: 'Override saved.' }));
  }

  async function deleteOverrideSettings() {
    if (!selectedPosition?.override) return;

    setPositionActionState((current) => ({ ...current, deletingOverride: true, error: '', success: '' }));
    const query = new URLSearchParams();
    if (managementState.scope.eventId) {
      query.set('eventId', String(managementState.scope.eventId));
    } else {
      query.set('ruleDate', managementState.scope.reservationDate);
    }

    const { response, body } = await apiRequest(`/api/admin/reservation-positions/${selectedPosition.id}/override?${query.toString()}`, {
      method: 'DELETE'
    });

    if (!response.ok) {
      setPositionActionState((current) => ({ ...current, deletingOverride: false, error: body.message || 'Unable to delete override.' }));
      return;
    }

    await reloadManagement();
    setPositionActionState((current) => ({ ...current, deletingOverride: false, success: 'Override removed.' }));
  }

  async function uploadBasePhoto(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    setPositionActionState((current) => ({ ...current, uploading: true, error: '', success: '' }));
    const formData = new FormData();
    formData.append('folder', 'map-objects');
    formData.append('image', file);

    const result = await apiRequest('/api/admin/uploads/image', {
      method: 'POST',
      body: formData
    });

    if (!result.response.ok || !result.body?.url) {
      setPositionActionState((current) => ({ ...current, uploading: false, error: result.body?.message || 'Unable to upload photo.' }));
      event.target.value = '';
      return;
    }

    setBaseForm((current) => ({ ...current, photoUrl: result.body.url }));
    setPositionActionState((current) => ({ ...current, uploading: false, success: 'Photo uploaded. Save base settings to apply it.' }));
    event.target.value = '';
  }

  function updateBookingForm(field, value) {
    setBookingFormState((current) => ({
      ...current,
      form: current.form ? { ...current.form, [field]: value } : current.form
    }));
  }

  async function submitBookingForm(event) {
    event.preventDefault();
    if (!selectedPosition || !bookingFormState.form) return;

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
      setBookingFormState((current) => ({ ...current, saving: false, error: body.message || 'Unable to create reservation.' }));
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
      success: 'Reservation created.'
    }));
  }

  const managementColumns = [
    {
      key: 'position',
      label: 'Position',
      render: (position) => (
        <div>
          <button
            type="button"
            className={`btn btn-small ${selectedPositionId === position.id ? '' : 'btn-secondary'}`}
            onClick={() => setSelectedPositionId(position.id)}
          >
            {getPositionDisplayName(position, language)}
          </button>
          <div className="muted small">{getBookingKindLabel(position.bookingKind, language)}</div>
        </div>
      )
    },
    {
      key: 'mapZone',
      label: 'Map / zone',
      render: (position) => `${localizeField(position.map?.name, language) || '—'} / ${localizeField(position.zone?.name, language) || '—'}`
    },
    {
      key: 'capacity',
      label: 'Capacity',
      render: (position) => `${position.seatsMin || '—'}-${position.seatsMax || '—'}`
    },
    {
      key: 'effective',
      label: 'Effective',
      render: (position) => (
        <div>
          <div>{getAvailabilityLabel(position, language)}</div>
          <div className="muted small">Deposit: {Number(position.effective?.deposit || 0)}</div>
        </div>
      )
    },
    {
      key: 'reservations',
      label: 'Bookings',
      render: (position) => (
        <div>
          <div>{position.reservationStats?.activeCount || 0}</div>
          <div className="muted small">Confirmed: {position.reservationStats?.confirmedCount || 0}</div>
        </div>
      )
    }
  ];

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

        <section className="panel-card">
          <div className="panel-card-head">
            <div>
              <span className="eyebrow">Position management</span>
              <h3 className="panel-section-title">Deposits, availability, photo and manual booking</h3>
              <p className="muted">This block works in the selected date or event scope and keeps static settings separate from per-scope overrides.</p>
            </div>
            <Link className="btn btn-secondary btn-small" to="/admin/map">Open map page</Link>
          </div>

          <FilterBar>
            <label>
              Scope date
              <input type="date" value={dateFilter} onChange={(event) => setDateFilter(event.target.value)} />
            </label>
            <label>
              Event
              <select
                value={managementEventId}
                onChange={(event) => {
                  const nextValue = event.target.value;
                  setManagementEventId(nextValue);
                  const selectedEvent = managementState.events.find((item) => String(item.id) === nextValue);
                  if (selectedEvent?.startAt) {
                    setDateFilter(toDateInput(selectedEvent.startAt));
                  }
                }}
              >
                <option value="">No event scope</option>
                {managementState.events.map((event) => (
                  <option key={event.id} value={event.id}>
                    {localizeField(event.title, language) || `#${event.id}`} · {formatDate(event.startAt, dateLocale)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Map
              <select value={managementMapId} onChange={(event) => { setManagementMapId(event.target.value); setManagementZoneId(''); }}>
                <option value="">All maps</option>
                {managementState.maps.map((map) => (
                  <option key={map.id} value={map.id}>
                    {localizeField(map.name, language) || `#${map.id}`}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Zone
              <select value={managementZoneId} onChange={(event) => setManagementZoneId(event.target.value)}>
                <option value="">All zones</option>
                {managementState.maps
                  .filter((map) => !managementMapId || String(map.id) === managementMapId)
                  .flatMap((map) => map.zones || [])
                  .map((zone) => (
                    <option key={zone.id} value={zone.id}>
                      {localizeField(zone.name, language) || `#${zone.id}`}
                    </option>
                  ))}
              </select>
            </label>
            <label>
              Search
              <input
                value={managementSearch}
                onChange={(event) => setManagementSearch(event.target.value)}
                placeholder="Code, map, zone, service"
              />
            </label>
          </FilterBar>

          <p className="muted table-meta">
            Scope: {managementState.scope.eventId ? `event #${managementState.scope.eventId}` : 'date'} · {managementState.scope.reservationDate || dateFilter}
          </p>

          {managementState.loading ? <p>Loading positions...</p> : null}
          {managementState.error ? <p className="error">{managementState.error}</p> : null}
          {!managementState.loading && !managementState.error ? (
            <>
              <DataTable columns={managementColumns} rows={managementState.positions} emptyText="No positions in this scope." />

              {selectedPosition ? (
                <div className="reservation-management-grid">
                  <article className="panel-card reservation-management-panel">
                    <div className="panel-card-head">
                      <div>
                        <span className="eyebrow">Selected position</span>
                        <h3 className="panel-section-title">{getPositionDisplayName(selectedPosition, language)}</h3>
                        <p className="muted">{localizeField(selectedPosition.map?.name, language) || '—'} / {localizeField(selectedPosition.zone?.name, language) || '—'}</p>
                      </div>
                      <StatusPill status={selectedPosition.effective?.isBookable && selectedPosition.effective?.isActive ? 'CONFIRMED' : 'CANCELLED'} />
                    </div>

                    <div className="details-grid compact table-sheet-grid">
                      <div className="detail-row"><span className="muted">Kind</span><strong>{getBookingKindLabel(selectedPosition.bookingKind, language)}</strong></div>
                      <div className="detail-row"><span className="muted">Type</span><strong>{getPositionTypeLabel(selectedPosition.positionType, language) || '—'}</strong></div>
                      <div className="detail-row"><span className="muted">Capacity</span><strong>{selectedPosition.seatsMin}-{selectedPosition.seatsMax}</strong></div>
                      <div className="detail-row"><span className="muted">Effective deposit</span><strong>{Number(selectedPosition.effective?.deposit || 0)}</strong></div>
                      <div className="detail-row"><span className="muted">Bookings in scope</span><strong>{selectedPosition.reservationStats?.activeCount || 0}</strong></div>
                      <div className="detail-row"><span className="muted">Availability</span><strong>{getAvailabilityLabel(selectedPosition, language)}</strong></div>
                    </div>

                    {positionActionState.error ? <p className="error">{positionActionState.error}</p> : null}
                    {positionActionState.success ? <p className="success-message">{positionActionState.success}</p> : null}

                    <div className="reservation-management-forms">
                      <form className="admin-form-grid" onSubmit={(event) => { event.preventDefault(); saveBaseSettings(); }}>
                        <div className="field-span-2">
                          <h4 className="panel-section-title">Base settings</h4>
                          <p className="muted">Static properties of the position. They apply outside overrides too.</p>
                        </div>
                        <label>
                          Base deposit
                          <input type="number" min="0" step="1" value={baseForm.deposit} onChange={(event) => setBaseForm((current) => ({ ...current, deposit: event.target.value }))} />
                        </label>
                        <label>
                          Photo URL
                          <input type="url" value={baseForm.photoUrl} onChange={(event) => setBaseForm((current) => ({ ...current, photoUrl: event.target.value }))} />
                        </label>
                        <label className="checkbox-label inline">
                          <input type="checkbox" checked={baseForm.isActive} onChange={(event) => setBaseForm((current) => ({ ...current, isActive: event.target.checked }))} />
                          Active on map
                        </label>
                        <label className="checkbox-label inline">
                          <input type="checkbox" checked={baseForm.isBookable} onChange={(event) => setBaseForm((current) => ({ ...current, isBookable: event.target.checked }))} />
                          Bookable by default
                        </label>
                        <label className="btn btn-secondary btn-small">
                          {positionActionState.uploading ? 'Uploading...' : 'Upload photo'}
                          <input type="file" accept=".png,.jpg,.jpeg,.webp" onChange={uploadBasePhoto} disabled={positionActionState.uploading} />
                        </label>
                        <div className="actions field-span-2">
                          <button type="submit" className="btn" disabled={positionActionState.savingBase}>
                            {positionActionState.savingBase ? 'Saving...' : 'Save base settings'}
                          </button>
                        </div>
                      </form>

                      <form className="admin-form-grid" onSubmit={(event) => { event.preventDefault(); saveOverrideSettings(); }}>
                        <div className="field-span-2">
                          <h4 className="panel-section-title">Scope override</h4>
                          <p className="muted">Applied to {managementState.scope.eventId ? `event #${managementState.scope.eventId}` : managementState.scope.reservationDate} with higher priority than base settings.</p>
                        </div>
                        <label className="checkbox-label inline field-span-2">
                          <input type="checkbox" checked={overrideForm.enabled} onChange={(event) => setOverrideForm((current) => ({ ...current, enabled: event.target.checked }))} />
                          Enable override in this scope
                        </label>
                        <label>
                          Override deposit
                          <input type="number" min="0" step="1" value={overrideForm.deposit} disabled={!overrideForm.enabled} onChange={(event) => setOverrideForm((current) => ({ ...current, deposit: event.target.value }))} />
                        </label>
                        <label>
                          Override photo URL
                          <input type="url" value={overrideForm.photoUrl} disabled={!overrideForm.enabled} onChange={(event) => setOverrideForm((current) => ({ ...current, photoUrl: event.target.value }))} />
                        </label>
                        <label className="checkbox-label inline">
                          <input type="checkbox" checked={overrideForm.isActive} disabled={!overrideForm.enabled} onChange={(event) => setOverrideForm((current) => ({ ...current, isActive: event.target.checked }))} />
                          Active in this scope
                        </label>
                        <label className="checkbox-label inline">
                          <input type="checkbox" checked={overrideForm.isBookable} disabled={!overrideForm.enabled} onChange={(event) => setOverrideForm((current) => ({ ...current, isBookable: event.target.checked }))} />
                          Bookable in this scope
                        </label>
                        <label className="field-span-2">
                          Note
                          <textarea rows="3" value={overrideForm.note} disabled={!overrideForm.enabled} onChange={(event) => setOverrideForm((current) => ({ ...current, note: event.target.value }))} />
                        </label>
                        <div className="actions field-span-2">
                          <button type="submit" className="btn" disabled={positionActionState.savingOverride}>
                            {positionActionState.savingOverride ? 'Saving...' : 'Save override'}
                          </button>
                          {selectedPosition.override ? (
                            <button
                              type="button"
                              className="btn btn-secondary"
                              disabled={positionActionState.deletingOverride}
                              onClick={deleteOverrideSettings}
                            >
                              {positionActionState.deletingOverride ? 'Removing...' : 'Remove override'}
                            </button>
                          ) : null}
                        </div>
                      </form>
                    </div>

                    <div className="booking-admin-panel">
                      <div className="table-sheet-head">
                        <div>
                          <span className="eyebrow">Manual booking</span>
                          <h4>{getPositionDisplayName(selectedPosition, language)}</h4>
                        </div>
                        <button
                          type="button"
                          className="btn"
                          onClick={() => setBookingFormState((current) => ({
                            ...current,
                            open: !current.open,
                            error: '',
                            success: '',
                            form: buildBookingForm(selectedPosition, managementState.scope.reservationDate || today, managementState.scope.eventId || managementEventId)
                          }))}
                        >
                          {bookingFormState.open ? 'Close form' : 'Create booking'}
                        </button>
                      </div>

                      {bookingFormState.error ? <p className="error">{bookingFormState.error}</p> : null}
                      {bookingFormState.success ? <p className="success-message">{bookingFormState.success}</p> : null}

                      {bookingFormState.open && bookingFormState.form ? (
                        <form className="admin-form-grid" onSubmit={submitBookingForm}>
                          <label>
                            Guest name
                            <input type="text" required value={bookingFormState.form.customerName} onChange={(event) => updateBookingForm('customerName', event.target.value)} />
                          </label>
                          <label>
                            Phone
                            <input type="text" required value={bookingFormState.form.customerPhone} onChange={(event) => updateBookingForm('customerPhone', event.target.value)} />
                          </label>
                          <label>
                            Email
                            <input type="email" value={bookingFormState.form.customerEmail} onChange={(event) => updateBookingForm('customerEmail', event.target.value)} />
                          </label>
                          <label>
                            Guests
                            <input type="number" min={selectedPosition.seatsMin || 1} max={selectedPosition.seatsMax || 99} required value={bookingFormState.form.guests} onChange={(event) => updateBookingForm('guests', event.target.value)} />
                          </label>
                          <label>
                            Date
                            <input type="date" required value={bookingFormState.form.reservationDate} onChange={(event) => updateBookingForm('reservationDate', event.target.value)} />
                          </label>
                          <label>
                            Start
                            <input type="time" required value={bookingFormState.form.timeFrom} onChange={(event) => updateBookingForm('timeFrom', event.target.value)} />
                          </label>
                          <label>
                            End
                            <input type="time" value={bookingFormState.form.timeTo} onChange={(event) => updateBookingForm('timeTo', event.target.value)} />
                          </label>
                          <label>
                            Source
                            <select value={bookingFormState.form.source} onChange={(event) => updateBookingForm('source', event.target.value)}>
                              <option value="WALK_IN">Walk-in</option>
                              <option value="PHONE">Phone</option>
                              <option value="INSTAGRAM">Instagram</option>
                              <option value="FACEBOOK">Facebook</option>
                              <option value="WEB">Web</option>
                            </select>
                          </label>
                          <label>
                            Status
                            <select value={bookingFormState.form.status} onChange={(event) => updateBookingForm('status', event.target.value)}>
                              <option value="PENDING">Pending</option>
                              <option value="CONFIRMED">Confirmed</option>
                            </select>
                          </label>
                          <label className="checkbox-label inline">
                            <input type="checkbox" checked={Boolean(bookingFormState.form.depositRequired)} onChange={(event) => updateBookingForm('depositRequired', event.target.checked)} />
                            Deposit required
                          </label>
                          <label>
                            Deposit amount
                            <input type="number" min="0" step="1" disabled={!bookingFormState.form.depositRequired} value={bookingFormState.form.depositAmount} onChange={(event) => updateBookingForm('depositAmount', event.target.value)} />
                          </label>
                          <label className="field-span-2">
                            Guest comment
                            <textarea rows="3" value={bookingFormState.form.commentCustomer} onChange={(event) => updateBookingForm('commentCustomer', event.target.value)} />
                          </label>
                          <label className="field-span-2">
                            Admin comment
                            <textarea rows="3" value={bookingFormState.form.commentAdmin} onChange={(event) => updateBookingForm('commentAdmin', event.target.value)} />
                          </label>
                          <div className="actions field-span-2">
                            <button type="submit" className="btn" disabled={bookingFormState.saving}>
                              {bookingFormState.saving ? 'Saving...' : 'Create booking'}
                            </button>
                          </div>
                        </form>
                      ) : null}
                    </div>
                  </article>
                </div>
              ) : null}
            </>
          ) : null}
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
      </PageContainer>
    </AdminLayout>
  );
}
