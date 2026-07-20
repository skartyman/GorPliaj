import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import AdminLayout from '../components/AdminLayout';
import PageContainer from '../components/PageContainer';
import PanelCard from '../components/PanelCard';
import DataTable from '../components/DataTable';
import StatusPill from '../components/StatusPill';
import { apiRequest, formatDateTime, localizeField } from '../lib/api';
import { useAdminI18n } from '../lib/i18n';

const EMPTY_SESSION = {
  name: { ua: '', ru: '', en: '' },
  startsAt: '',
  endsAt: '',
  isActive: true,
  admissionMode: 'TICKETED',
  sortOrder: 0
};

const EMPTY_TYPE = {
  name: { ua: '', ru: '', en: '' },
  price: '',
  currency: 'UAH',
  capacity: '',
  salesStart: '',
  salesEnd: '',
  isActive: true,
  eventSessionId: ''
};

const EMPTY_ORDER = {
  customerName: '',
  customerEmail: '',
  customerPhone: '',
  ticketTypeId: '',
  quantity: 1,
  paid: false
};

function toDateTimeLocal(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const kyivStr = date.toLocaleString('sv-SE', { timeZone: 'Europe/Kyiv' });
  return kyivStr.slice(0, 16);
}

function toIso(value) {
  if (!value) return null;
  const parts = String(value).split('T');
  if (parts.length !== 2) return null;
  const [datePart, timePart] = parts;
  const [year, month, day] = datePart.split('-').map(Number);
  const [hour, minute] = timePart.split(':').map(Number);
  const kyivDate = new Date(Date.UTC(year, month - 1, day, hour, minute));
  const utcMs = kyivDate.getTime() + (3 * 60 * 60 * 1000);
  const utcDate = new Date(utcMs);
  return Number.isNaN(utcDate.getTime()) ? null : utcDate.toISOString();
}

function formatSessionLabel(session, t) {
  if (!session) return t ? t('ticketSales.noSession') : '';
  const start = formatDateTime(session.startsAt);
  const end = formatDateTime(session.endsAt);
  return `${start} - ${end}`;
}

function createEmptyTypeForm(sessions = []) {
  return {
    ...EMPTY_TYPE,
    name: { ...EMPTY_TYPE.name },
    eventSessionId: sessions.length ? String(sessions[0].id) : ''
  };
}

function buildTicketTypeForm(type) {
  return {
    name: {
      ua: type.name?.ua || '',
      ru: type.name?.ru || '',
      en: type.name?.en || ''
    },
    price: String(Number(type.price ?? 0)),
    currency: type.currency || 'UAH',
    capacity: String(type.capacity ?? ''),
    salesStart: toDateTimeLocal(type.salesStart),
    salesEnd: toDateTimeLocal(type.salesEnd),
    isActive: Boolean(type.isActive),
    eventSessionId: type.eventSessionId ? String(type.eventSessionId) : ''
  };
}

export default function TicketSalesPage() {
  const { t, language } = useAdminI18n();
  const [searchParams, setSearchParams] = useSearchParams();
  const [events, setEvents] = useState([]);
  const [eventId, setEventId] = useState(() => searchParams.get('eventId') || '');
  const [sessions, setSessions] = useState([]);
  const [ticketTypes, setTicketTypes] = useState([]);
  const [orders, setOrders] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [sessionForm, setSessionForm] = useState(EMPTY_SESSION);
  const [editingSessionId, setEditingSessionId] = useState(null);
  const [typeForm, setTypeForm] = useState(() => createEmptyTypeForm());
  const [editingTypeId, setEditingTypeId] = useState(null);
  const [orderForm, setOrderForm] = useState(EMPTY_ORDER);
  const [state, setState] = useState({ loading: true, saving: false, error: '', message: '' });

  async function loadEvents() {
    const { response, body } = await apiRequest('/api/admin/events');
    if (!response.ok) throw new Error(body.message || t('ticketSales.errors.loadEvents'));
    const rows = Array.isArray(body) ? body : [];
    setEvents(rows);
    setEventId((current) => {
      const fromQuery = searchParams.get('eventId') || '';
      const queryExists = rows.some((row) => String(row.id) === fromQuery);
      if (queryExists) return fromQuery;
      if (rows.some((row) => String(row.id) === current)) return current;
      return String(rows[0]?.id || '');
    });
  }

  async function loadSales(selectedEventId) {
    if (!selectedEventId) return;
    setState((current) => ({ ...current, loading: true, error: '' }));
    const query = `eventId=${encodeURIComponent(selectedEventId)}`;
    const results = await Promise.all([
      apiRequest(`/api/admin/events/${selectedEventId}/sessions`),
      apiRequest(`/api/admin/events/${selectedEventId}/ticket-types`),
      apiRequest(`/api/admin/ticket-orders?${query}`),
      apiRequest(`/api/admin/tickets?${query}`)
    ]);
    const failed = results.find((item) => !item.response.ok);
    if (failed) throw new Error(failed.body.message || t('ticketSales.errors.loadSales'));

    const loadedSessions = Array.isArray(results[0].body) ? results[0].body : [];
    const loadedTypes = Array.isArray(results[1].body) ? results[1].body : [];
    const sessionIds = new Set(loadedSessions.map((session) => String(session.id)));
    setSessions(loadedSessions);
    setTicketTypes(loadedTypes);
    setOrders(Array.isArray(results[2].body) ? results[2].body : []);
    setTickets(Array.isArray(results[3].body) ? results[3].body : []);
    setTypeForm((current) => {
      if (!loadedSessions.length) return { ...current, eventSessionId: '' };
      if (current.eventSessionId && sessionIds.has(String(current.eventSessionId))) return current;
      return { ...current, eventSessionId: String(loadedSessions[0].id) };
    });
    setOrderForm((current) => ({
      ...current,
      ticketTypeId: loadedTypes.some((type) => String(type.id) === current.ticketTypeId)
        ? current.ticketTypeId
        : String(loadedTypes[0]?.id || '')
    }));
    setState((current) => ({ ...current, loading: false }));
  }

  useEffect(() => {
    loadEvents().catch((error) => setState((current) => ({ ...current, loading: false, error: error.message })));
  }, []);

  useEffect(() => {
    loadSales(eventId).catch((error) => {
      setState((current) => ({ ...current, loading: false, error: error.message }));
    });
    if (eventId) {
      setSearchParams({ eventId }, { replace: true });
    }
  }, [eventId]);

  function resetSessionForm() {
    setSessionForm(EMPTY_SESSION);
    setEditingSessionId(null);
  }

  function resetTypeForm() {
    setTypeForm(createEmptyTypeForm(sessions));
    setEditingTypeId(null);
  }

  async function saveSession(event) {
    event.preventDefault();
    setState((current) => ({ ...current, saving: true, error: '', message: '' }));
    const payload = {
      ...sessionForm,
      startsAt: toIso(sessionForm.startsAt),
      endsAt: toIso(sessionForm.endsAt)
    };
    const { response, body } = editingSessionId
      ? await apiRequest(`/api/admin/event-sessions/${editingSessionId}`, {
        method: 'PATCH',
        body: JSON.stringify(payload)
      })
      : await apiRequest(`/api/admin/events/${eventId}/sessions`, {
        method: 'POST',
        body: JSON.stringify(payload)
      });
    if (!response.ok) {
      setState((current) => ({ ...current, saving: false, error: body.message || t('ticketSales.errors.saveSession') }));
      return;
    }
    const wasEditing = Boolean(editingSessionId);
    resetSessionForm();
    await loadSales(eventId);
    setState((current) => ({ ...current, saving: false, message: wasEditing ? t('ticketSales.feedback.sessionSaved') : t('ticketSales.feedback.sessionCreated') }));
  }

  async function deleteSession(id) {
    if (!window.confirm(t('ticketSales.confirm.deleteSession'))) return;
    setState((current) => ({ ...current, saving: true, error: '', message: '' }));
    const { response, body } = await apiRequest(`/api/admin/event-sessions/${id}`, { method: 'DELETE' });
    if (!response.ok) {
      setState((current) => ({ ...current, saving: false, error: body.message || t('ticketSales.errors.deleteSession') }));
      return;
    }
    await loadSales(eventId);
    setState((current) => ({ ...current, saving: false, message: t('ticketSales.feedback.sessionDeleted') }));
  }

  async function saveTicketType(event) {
    event.preventDefault();
    setState((current) => ({ ...current, saving: true, error: '', message: '' }));
    const payload = {
      ...typeForm,
      eventSessionId: typeForm.eventSessionId ? Number(typeForm.eventSessionId) : null,
      price: Number(typeForm.price),
      capacity: Number(typeForm.capacity),
      salesStart: toIso(typeForm.salesStart),
      salesEnd: toIso(typeForm.salesEnd)
    };
    const { response, body } = editingTypeId
      ? await apiRequest(`/api/admin/ticket-types/${editingTypeId}`, {
        method: 'PATCH',
        body: JSON.stringify(payload)
      })
      : await apiRequest(`/api/admin/events/${eventId}/ticket-types`, {
        method: 'POST',
        body: JSON.stringify(payload)
      });
    if (!response.ok) {
      setState((current) => ({ ...current, saving: false, error: body.message || t('ticketSales.errors.saveType') }));
      return;
    }
    const wasEditing = Boolean(editingTypeId);
    resetTypeForm();
    await loadSales(eventId);
    setState((current) => ({ ...current, saving: false, message: wasEditing ? t('ticketSales.feedback.typeSaved') : t('ticketSales.feedback.typeCreated') }));
  }

  async function updateTicketType(id, payload) {
    setState((current) => ({ ...current, saving: true, error: '', message: '' }));
    const { response, body } = await apiRequest(`/api/admin/ticket-types/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload)
    });
    if (!response.ok) {
      setState((current) => ({ ...current, saving: false, error: body.message || t('ticketSales.errors.updateType') }));
      return;
    }
    await loadSales(eventId);
    setState((current) => ({ ...current, saving: false, message: t('ticketSales.feedback.typeUpdated') }));
  }

  async function deleteTicketType(id) {
    if (!window.confirm(t('ticketSales.confirm.deleteType'))) return;
    setState((current) => ({ ...current, saving: true, error: '', message: '' }));
    const { response, body } = await apiRequest(`/api/admin/ticket-types/${id}`, { method: 'DELETE' });
    if (!response.ok) {
      setState((current) => ({ ...current, saving: false, error: body.message || t('ticketSales.errors.deleteType') }));
      return;
    }
    await loadSales(eventId);
    setState((current) => ({ ...current, saving: false, message: t('ticketSales.feedback.typeDeleted') }));
  }

  async function createOrder(event) {
    event.preventDefault();
    setState((current) => ({ ...current, saving: true, error: '', message: '' }));
    const { response, body } = await apiRequest('/api/admin/ticket-orders', {
      method: 'POST',
      body: JSON.stringify({
        eventId: Number(eventId),
        customerName: orderForm.customerName,
        customerEmail: orderForm.customerEmail,
        customerPhone: orderForm.customerPhone,
        status: orderForm.paid ? 'PAID' : 'PENDING',
        items: [{ ticketTypeId: Number(orderForm.ticketTypeId), quantity: Number(orderForm.quantity) }]
      })
    });
    if (!response.ok) {
      setState((current) => ({ ...current, saving: false, error: body.message || t('ticketSales.errors.createOrder') }));
      return;
    }
    setOrderForm((current) => ({ ...EMPTY_ORDER, ticketTypeId: current.ticketTypeId }));
    await loadSales(eventId);
    setState((current) => ({ ...current, saving: false, message: t('ticketSales.feedback.orderCreated', { number: body.order?.orderNumber || '' }) }));
  }

  async function updateOrderStatus(id, status) {
    setState((current) => ({ ...current, saving: true, error: '', message: '' }));
    const { response, body } = await apiRequest(`/api/admin/ticket-orders/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status })
    });
    if (!response.ok) {
      setState((current) => ({ ...current, saving: false, error: body.message || t('ticketSales.errors.updateOrder') }));
      return;
    }
    await loadSales(eventId);
    setState((current) => ({ ...current, saving: false, message: t('ticketSales.feedback.orderStatusUpdated') }));
  }

  const activeTicketTypes = useMemo(
    () => ticketTypes.filter((type) => type.isActive),
    [ticketTypes]
  );

  const sessionIds = useMemo(
    () => new Set(sessions.map((session) => String(session.id))),
    [sessions]
  );

  const ticketTypesBySessionId = useMemo(() => {
    const grouped = new Map();
    ticketTypes.forEach((type) => {
      const key = type.eventSessionId ? String(type.eventSessionId) : '';
      const rows = grouped.get(key) || [];
      rows.push(type);
      grouped.set(key, rows);
    });
    return grouped;
  }, [ticketTypes]);

  const unassignedTicketTypes = useMemo(
    () => ticketTypes.filter((type) => !type.eventSessionId || !sessionIds.has(String(type.eventSessionId))),
    [sessionIds, ticketTypes]
  );

  function scrollToTicketTypeForm() {
    window.requestAnimationFrame(() => {
      document.getElementById('ticket-type-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  function beginTicketTypeForSession(sessionId = '') {
    setEditingTypeId(null);
    setTypeForm({
      ...createEmptyTypeForm(sessions),
      eventSessionId: sessionId ? String(sessionId) : ''
    });
    scrollToTicketTypeForm();
  }

  function editTicketType(type) {
    setTypeForm(buildTicketTypeForm(type));
    setEditingTypeId(type.id);
    scrollToTicketTypeForm();
  }

  function duplicateTicketType(type) {
    setTypeForm(buildTicketTypeForm(type));
    setEditingTypeId(null);
    scrollToTicketTypeForm();
  }

  const orderColumns = [
    { key: 'number', label: t('ticketSales.columns.order'), render: (row) => <strong>{row.orderNumber}</strong> },
    { key: 'session', label: t('ticketSales.columns.date'), render: (row) => row.eventSession ? formatSessionLabel(row.eventSession, t) : t('ticketSales.columns.generalDate') },
    { key: 'customer', label: t('ticketSales.columns.customer'), render: (row) => <div>{row.customerName}<div className="muted small">{row.customerEmail}</div></div> },
    { key: 'tickets', label: t('ticketSales.columns.tickets'), render: (row) => row.tickets?.length || 0 },
    { key: 'amount', label: t('ticketSales.columns.amount'), render: (row) => `${Number(row.amount).toFixed(2)} ${row.currency}` },
    { key: 'status', label: t('ticketSales.columns.status'), render: (row) => <StatusPill status={row.status} /> },
    {
      key: 'actions',
      label: t('ticketSales.columns.actions'),
      render: (row) => (
        <div className="actions compact">
          {['PENDING', 'AWAITING_PAYMENT'].includes(row.status) ? (
            <button className="btn btn-small btn-success" type="button" disabled={state.saving} onClick={() => updateOrderStatus(row.id, 'PAID')}>{t('ticketSales.orderActions.paid')}</button>
          ) : null}
          {!['CANCELLED', 'EXPIRED', 'REFUNDED'].includes(row.status) ? (
            <button className="btn btn-small btn-danger" type="button" disabled={state.saving} onClick={() => updateOrderStatus(row.id, 'CANCELLED')}>{t('ticketSales.orderActions.cancel')}</button>
          ) : null}
        </div>
      )
    }
  ];

  const ticketColumns = [
    { key: 'code', label: t('ticketSales.columns.code'), render: (row) => <strong style={{ fontFamily: 'monospace' }}>{row.code}</strong> },
    { key: 'session', label: t('ticketSales.columns.date'), render: (row) => row.eventSession ? formatSessionLabel(row.eventSession, t) : t('ticketSales.columns.generalDate') },
    { key: 'type', label: t('ticketSales.columns.type'), render: (row) => localizeField(row.ticketType?.name, language) },
    { key: 'holder', label: t('ticketSales.columns.holder'), render: (row) => row.holderName || row.order?.customerName || '—' },
    { key: 'status', label: t('ticketSales.columns.status'), render: (row) => <StatusPill status={row.status} /> },
    { key: 'created', label: t('ticketSales.columns.created'), render: (row) => formatDateTime(row.createdAt) }
  ];

  function renderTicketTypeCard(type) {
    return (
      <div className="ticket-rate-card" key={type.id}>
        <div className="ticket-rate-card__main">
          <strong>{localizeField(type.name, language)}</strong>
          <div className="muted">
            {Number(type.price).toFixed(2)} {type.currency} · {t('ticketSales.card.sold')} {type.soldCount}/{type.capacity}
            {type.isActive ? ` · ${t('ticketSales.card.onSite')}` : ` · ${t('ticketSales.card.hidden')}`}
          </div>
          {(type.salesStart || type.salesEnd) ? (
            <div className="muted small">
              {t('ticketSales.card.sales')} {type.salesStart ? formatDateTime(type.salesStart) : t('ticketSales.card.now')} - {type.salesEnd ? formatDateTime(type.salesEnd) : t('ticketSales.card.noEnd')}
            </div>
          ) : null}
        </div>
        <div className="actions compact">
          <button
            type="button"
            className="btn btn-small btn-secondary"
            disabled={state.saving}
            onClick={() => updateTicketType(type.id, { isActive: !type.isActive })}
          >
            {type.isActive ? t('ticketSales.card.hide') : t('ticketSales.card.show')}
          </button>
          <button
            type="button"
            className="btn btn-small btn-secondary"
            disabled={state.saving}
            onClick={() => editTicketType(type)}
          >
            {t('ticketSales.card.edit')}
          </button>
          <button
            type="button"
            className="btn btn-small btn-secondary"
            disabled={state.saving}
            onClick={() => duplicateTicketType(type)}
          >
            {t('ticketSales.card.duplicate')}
          </button>
          <button
            type="button"
            className="btn btn-small btn-danger"
            disabled={state.saving || type.soldCount > 0}
            onClick={() => deleteTicketType(type.id)}
          >
            {t('ticketSales.card.delete')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <AdminLayout>
      <PageContainer title={t('ticketSales.page.title')} description={t('ticketSales.page.description')}>
        <label style={{ maxWidth: 520 }}>
          {t('ticketSales.page.event')}
          <select value={eventId} onChange={(event) => setEventId(event.target.value)}>
            {!events.length ? <option value="">{t('ticketSales.page.noEvents')}</option> : null}
            {events.map((item) => <option key={item.id} value={item.id}>{localizeField(item.title, language)}</option>)}
          </select>
        </label>
        {!eventId ? <p className="muted" style={{ fontSize: 13, marginTop: 8 }}>{t('ticketSales.page.selectEvent')}</p> : null}
        {state.error ? <p className="error">{state.error}</p> : null}
        {state.message ? <p className="form-state">{state.message}</p> : null}
      </PageContainer>

      <div className="grid-two-col" style={{ alignItems: 'start' }}>
        <PanelCard title={editingSessionId ? t('ticketSales.sessionForm.editTitle') : t('ticketSales.sessionForm.listTitle')} subtitle={t('ticketSales.sessionForm.listSubtitle')}>
          <form className="event-admin-form" onSubmit={saveSession}>
            <label>{t('ticketSales.sessionForm.name')}<input value={sessionForm.name.ua} onChange={(event) => setSessionForm({ ...sessionForm, name: { ...sessionForm.name, ua: event.target.value } })} placeholder={t('ticketSales.sessionForm.namePlaceholder')} /></label>
            <div className="grid-two-col">
              <label>{t('ticketSales.sessionForm.start')}<input type="datetime-local" required value={sessionForm.startsAt} onChange={(event) => setSessionForm({ ...sessionForm, startsAt: event.target.value })} /></label>
              <label>{t('ticketSales.sessionForm.end')}<input type="datetime-local" required value={sessionForm.endsAt} onChange={(event) => setSessionForm({ ...sessionForm, endsAt: event.target.value })} /></label>
            </div>
            <label>{t('ticketSales.sessionForm.admissionMode')}
              <select value={sessionForm.admissionMode} onChange={(event) => setSessionForm({ ...sessionForm, admissionMode: event.target.value })}>
                <option value="TICKETED">{t('ticketSales.sessionForm.ticketed')}</option>
                <option value="FREE">{t('ticketSales.sessionForm.free')}</option>
              </select>
            </label>
            <label className="menu-admin-checkbox">
              <input type="checkbox" checked={sessionForm.isActive} onChange={(event) => setSessionForm({ ...sessionForm, isActive: event.target.checked })} />
              <span>{t('ticketSales.sessionForm.active')}</span>
            </label>
            <div className="actions compact">
              <button className="btn" type="submit" disabled={state.saving || !eventId}>
                {editingSessionId ? t('ticketSales.sessionForm.save') : t('ticketSales.sessionForm.add')}
              </button>
              {editingSessionId ? (
                <button className="btn btn-secondary" type="button" disabled={state.saving} onClick={resetSessionForm}>
                  {t('ticketSales.sessionForm.cancel')}
                </button>
              ) : null}
            </div>
          </form>

          <div className="ticket-session-list">
            {sessions.map((session) => (
              <section className="ticket-session-card" key={session.id}>
                <div className="ticket-session-card__head">
                  <div style={{ display: 'grid', gap: 4 }}>
                    <strong>{localizeField(session.name, language) || formatSessionLabel(session, t)}</strong>
                    <div className="muted">{formatSessionLabel(session, t)}</div>
                    <div className="muted small">{session.isActive ? t('ticketSales.sessions.active') : t('ticketSales.sessions.hidden')}</div>
                    <span className={`status-pill ${session.admissionMode === 'FREE' ? 'success' : 'warning'}`}>
                      {session.admissionMode === 'FREE' ? t('ticketSales.sessions.freeEntry') : t('ticketSales.sessions.ticketedEntry')}
                    </span>
                  </div>
                  <div className="actions compact">
                    {session.admissionMode !== 'FREE' ? (
                      <button
                        type="button"
                        className="btn btn-small"
                        disabled={state.saving}
                        onClick={() => beginTicketTypeForSession(session.id)}
                      >
                        {t('ticketSales.sessions.tariffForDate')}
                      </button>
                    ) : null}
                    <button
                      type="button"
                      className="btn btn-small btn-secondary"
                      disabled={state.saving}
                      onClick={() => {
                        setSessionForm({
                          name: {
                            ua: session.name?.ua || '',
                            ru: session.name?.ru || '',
                            en: session.name?.en || ''
                          },
                          startsAt: toDateTimeLocal(session.startsAt),
                          endsAt: toDateTimeLocal(session.endsAt),
                          isActive: Boolean(session.isActive),
                          admissionMode: session.admissionMode || 'TICKETED',
                          sortOrder: session.sortOrder || 0
                        });
                        setEditingSessionId(session.id);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                    >
                      {t('ticketSales.sessions.editDate')}
                    </button>
                    <button
                      type="button"
                      className="btn btn-small btn-danger"
                      disabled={state.saving}
                      onClick={() => deleteSession(session.id)}
                    >
                      {t('ticketSales.sessions.deleteDate')}
                    </button>
                  </div>
                </div>
                <div className="ticket-rate-list">
                  {(ticketTypesBySessionId.get(String(session.id)) || []).map(renderTicketTypeCard)}
                  {!(ticketTypesBySessionId.get(String(session.id)) || []).length ? (
                    <p className="muted small">{session.admissionMode === 'FREE' ? t('ticketSales.sessions.freeNoTariff') : t('ticketSales.sessions.noTariff')}</p>
                  ) : null}
                </div>
              </section>
            ))}
            {!sessions.length ? (
              <section className="ticket-session-card">
                <div className="ticket-session-card__head">
                  <div style={{ display: 'grid', gap: 4 }}>
                    <strong>{t('ticketSales.sessions.generalTitle')}</strong>
                    <div className="muted">{t('ticketSales.sessions.generalDesc')}</div>
                  </div>
                  <button
                    type="button"
                    className="btn btn-small"
                    disabled={state.saving}
                    onClick={() => beginTicketTypeForSession('')}
                  >
                    {t('ticketSales.sessions.createTariff')}
                  </button>
                </div>
                <div className="ticket-rate-list">
                  {(ticketTypesBySessionId.get('') || []).map(renderTicketTypeCard)}
                  {!ticketTypes.length ? <p className="muted small">{t('ticketSales.sessions.noTariffs')}</p> : null}
                </div>
              </section>
            ) : null}
            {sessions.length && unassignedTicketTypes.length ? (
              <section className="ticket-session-card warning">
                <div className="ticket-session-card__head">
                  <div style={{ display: 'grid', gap: 4 }}>
                    <strong>{t('ticketSales.sessions.unassignedTitle')}</strong>
                    <div className="muted">{t('ticketSales.sessions.unassignedDesc')}</div>
                  </div>
                </div>
                <div className="ticket-rate-list">
                  {unassignedTicketTypes.map(renderTicketTypeCard)}
                </div>
              </section>
            ) : null}
          </div>
        </PanelCard>

        <PanelCard title={editingTypeId ? t('ticketSales.typeForm.editTitle') : t('ticketSales.typeForm.newTitle')} subtitle={t('ticketSales.typeForm.subtitle')}>
          <form id="ticket-type-form" className="event-admin-form" onSubmit={saveTicketType}>
            <label className="ticket-session-field">{t('ticketSales.typeForm.session')}
              <select required={sessions.length > 0} value={typeForm.eventSessionId} onChange={(event) => setTypeForm({ ...typeForm, eventSessionId: event.target.value })}>
                {sessions.length ? <option value="" disabled>{t('ticketSales.typeForm.selectSession')}</option> : <option value="">{t('ticketSales.typeForm.generalSession')}</option>}
                {sessions.map((session) => (
                  <option key={session.id} value={session.id}>{localizeField(session.name, language) || formatSessionLabel(session, t)}</option>
                ))}
              </select>
              <span className="field-hint">{t('ticketSales.typeForm.sessionHint')}</span>
            </label>
            <label>{t('ticketSales.typeForm.name')}<input required value={typeForm.name.ua} onChange={(event) => setTypeForm({ ...typeForm, name: { ...typeForm.name, ua: event.target.value } })} /></label>
            <div className="grid-two-col">
              <label>{t('ticketSales.typeForm.price')}<input type="number" min="0" step="0.01" required value={typeForm.price} onChange={(event) => setTypeForm({ ...typeForm, price: event.target.value })} /></label>
              <label>{t('ticketSales.typeForm.capacity')}<input type="number" min="1" required value={typeForm.capacity} onChange={(event) => setTypeForm({ ...typeForm, capacity: event.target.value })} /></label>
              <label>{t('ticketSales.typeForm.salesStart')}<input type="datetime-local" value={typeForm.salesStart} onChange={(event) => setTypeForm({ ...typeForm, salesStart: event.target.value })} /></label>
              <label>{t('ticketSales.typeForm.salesEnd')}<input type="datetime-local" value={typeForm.salesEnd} onChange={(event) => setTypeForm({ ...typeForm, salesEnd: event.target.value })} /></label>
            </div>
            <label className="menu-admin-checkbox">
              <input type="checkbox" checked={typeForm.isActive} onChange={(event) => setTypeForm({ ...typeForm, isActive: event.target.checked })} />
              <span>{t('ticketSales.typeForm.visible')}</span>
            </label>
            <div className="actions compact">
              <button className="btn" type="submit" disabled={state.saving || !eventId}>
                {editingTypeId ? t('ticketSales.typeForm.save') : t('ticketSales.typeForm.add')}
              </button>
              {editingTypeId ? (
                <button className="btn btn-secondary" type="button" disabled={state.saving} onClick={resetTypeForm}>
                  {t('ticketSales.typeForm.cancel')}
                </button>
              ) : null}
            </div>
          </form>
        </PanelCard>
      </div>

      <div className="grid-two-col" style={{ alignItems: 'start' }}>
        <PanelCard title={t('ticketSales.orderForm.title')} subtitle={t('ticketSales.orderForm.subtitle')}>
          <form className="event-admin-form" onSubmit={createOrder}>
            <label>{t('ticketSales.orderForm.customer')}<input required value={orderForm.customerName} onChange={(event) => setOrderForm({ ...orderForm, customerName: event.target.value })} /></label>
            <label>{t('ticketSales.orderForm.email')}<input type="email" required value={orderForm.customerEmail} onChange={(event) => setOrderForm({ ...orderForm, customerEmail: event.target.value })} /></label>
            <label>{t('ticketSales.orderForm.phone')}<input value={orderForm.customerPhone} onChange={(event) => setOrderForm({ ...orderForm, customerPhone: event.target.value })} /></label>
            <div className="grid-two-col">
              <label>{t('ticketSales.orderForm.type')}<select required value={orderForm.ticketTypeId} onChange={(event) => setOrderForm({ ...orderForm, ticketTypeId: event.target.value })}>
                <option value="">{t('ticketSales.orderForm.selectType')}</option>
                {activeTicketTypes.map((type) => (
                  <option key={type.id} value={type.id}>
                    {localizeField(type.name, language)} · {type.eventSession ? (localizeField(type.eventSession.name, language) || formatSessionLabel(type.eventSession, t)) : t('ticketSales.orderForm.generalDate')} · {Number(type.price).toFixed(2)} {type.currency}
                  </option>
                ))}
              </select></label>
              <label>{t('ticketSales.orderForm.quantity')}<input type="number" min="1" max="100" required value={orderForm.quantity} onChange={(event) => setOrderForm({ ...orderForm, quantity: event.target.value })} /></label>
            </div>
            <label className="menu-admin-checkbox">
              <input type="checkbox" checked={orderForm.paid} onChange={(event) => setOrderForm({ ...orderForm, paid: event.target.checked })} />
              <span>{t('ticketSales.orderForm.paid')}</span>
            </label>
            <button className="btn" type="submit" disabled={state.saving || !eventId || !activeTicketTypes.length}>{t('ticketSales.orderForm.create')}</button>
          </form>
        </PanelCard>
      </div>

      <PageContainer title={t('ticketSales.orders.title')}>
        {state.loading ? <p>{t('ticketSales.orders.loading')}</p> : <DataTable columns={orderColumns} rows={orders} emptyText={t('ticketSales.orders.empty')} />}
      </PageContainer>
      <PageContainer title={t('ticketSales.tickets.title')}>
        {state.loading ? <p>{t('ticketSales.tickets.loading')}</p> : <DataTable columns={ticketColumns} rows={tickets} emptyText={t('ticketSales.tickets.empty')} />}
      </PageContainer>
    </AdminLayout>
  );
}
