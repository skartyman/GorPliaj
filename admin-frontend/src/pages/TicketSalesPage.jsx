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
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

function toIso(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function formatSessionLabel(session) {
  if (!session) return 'Без отдельной даты';
  const start = formatDateTime(session.startsAt);
  const end = formatDateTime(session.endsAt);
  return `${start} - ${end}`;
}

export default function TicketSalesPage() {
  const { language } = useAdminI18n();
  const [searchParams, setSearchParams] = useSearchParams();
  const [events, setEvents] = useState([]);
  const [eventId, setEventId] = useState(() => searchParams.get('eventId') || '');
  const [sessions, setSessions] = useState([]);
  const [ticketTypes, setTicketTypes] = useState([]);
  const [orders, setOrders] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [sessionForm, setSessionForm] = useState(EMPTY_SESSION);
  const [editingSessionId, setEditingSessionId] = useState(null);
  const [typeForm, setTypeForm] = useState(EMPTY_TYPE);
  const [editingTypeId, setEditingTypeId] = useState(null);
  const [orderForm, setOrderForm] = useState(EMPTY_ORDER);
  const [state, setState] = useState({ loading: true, saving: false, error: '', message: '' });

  async function loadEvents() {
    const { response, body } = await apiRequest('/api/admin/events');
    if (!response.ok) throw new Error(body.message || 'Unable to load events.');
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
    if (failed) throw new Error(failed.body.message || 'Unable to load ticket sales.');

    const loadedSessions = Array.isArray(results[0].body) ? results[0].body : [];
    const loadedTypes = Array.isArray(results[1].body) ? results[1].body : [];
    setSessions(loadedSessions);
    setTicketTypes(loadedTypes);
    setOrders(Array.isArray(results[2].body) ? results[2].body : []);
    setTickets(Array.isArray(results[3].body) ? results[3].body : []);
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
    setTypeForm((current) => ({ ...EMPTY_TYPE, eventSessionId: current.eventSessionId || '' }));
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
      setState((current) => ({ ...current, saving: false, error: body.message || 'Не удалось сохранить дату события.' }));
      return;
    }
    const wasEditing = Boolean(editingSessionId);
    resetSessionForm();
    await loadSales(eventId);
    setState((current) => ({ ...current, saving: false, message: wasEditing ? 'Дата события обновлена.' : 'Дата события добавлена.' }));
  }

  async function deleteSession(id) {
    if (!window.confirm('Удалить эту дату события? Если по ней уже есть заказы или билеты, удаление будет запрещено.')) return;
    setState((current) => ({ ...current, saving: true, error: '', message: '' }));
    const { response, body } = await apiRequest(`/api/admin/event-sessions/${id}`, { method: 'DELETE' });
    if (!response.ok) {
      setState((current) => ({ ...current, saving: false, error: body.message || 'Не удалось удалить дату события.' }));
      return;
    }
    await loadSales(eventId);
    setState((current) => ({ ...current, saving: false, message: 'Дата события удалена.' }));
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
      setState((current) => ({ ...current, saving: false, error: body.message || 'Не удалось сохранить тип билета.' }));
      return;
    }
    const wasEditing = Boolean(editingTypeId);
    resetTypeForm();
    await loadSales(eventId);
    setState((current) => ({ ...current, saving: false, message: wasEditing ? 'Тип билета обновлён.' : 'Тип билета создан и доступен для продажи.' }));
  }

  async function updateTicketType(id, payload) {
    setState((current) => ({ ...current, saving: true, error: '', message: '' }));
    const { response, body } = await apiRequest(`/api/admin/ticket-types/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload)
    });
    if (!response.ok) {
      setState((current) => ({ ...current, saving: false, error: body.message || 'Не удалось обновить тип билета.' }));
      return;
    }
    await loadSales(eventId);
    setState((current) => ({ ...current, saving: false, message: 'Тип билета обновлён.' }));
  }

  async function deleteTicketType(id) {
    if (!window.confirm('Удалить этот тип билета? Если по нему уже были продажи, удаление будет запрещено.')) return;
    setState((current) => ({ ...current, saving: true, error: '', message: '' }));
    const { response, body } = await apiRequest(`/api/admin/ticket-types/${id}`, { method: 'DELETE' });
    if (!response.ok) {
      setState((current) => ({ ...current, saving: false, error: body.message || 'Не удалось удалить тип билета.' }));
      return;
    }
    await loadSales(eventId);
    setState((current) => ({ ...current, saving: false, message: 'Тип билета удалён.' }));
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
      setState((current) => ({ ...current, saving: false, error: body.message || 'Не удалось создать заказ.' }));
      return;
    }
    setOrderForm((current) => ({ ...EMPTY_ORDER, ticketTypeId: current.ticketTypeId }));
    await loadSales(eventId);
    setState((current) => ({ ...current, saving: false, message: `Заказ ${body.order?.orderNumber || ''} создан.` }));
  }

  async function updateOrderStatus(id, status) {
    setState((current) => ({ ...current, saving: true, error: '', message: '' }));
    const { response, body } = await apiRequest(`/api/admin/ticket-orders/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status })
    });
    if (!response.ok) {
      setState((current) => ({ ...current, saving: false, error: body.message || 'Не удалось обновить заказ.' }));
      return;
    }
    await loadSales(eventId);
    setState((current) => ({ ...current, saving: false, message: 'Статус заказа обновлён.' }));
  }

  const activeTicketTypes = useMemo(
    () => ticketTypes.filter((type) => type.isActive),
    [ticketTypes]
  );

  const orderColumns = [
    { key: 'number', label: 'Заказ', render: (row) => <strong>{row.orderNumber}</strong> },
    { key: 'session', label: 'Дата', render: (row) => row.eventSession ? formatSessionLabel(row.eventSession) : 'Общая дата события' },
    { key: 'customer', label: 'Покупатель', render: (row) => <div>{row.customerName}<div className="muted small">{row.customerEmail}</div></div> },
    { key: 'tickets', label: 'Билеты', render: (row) => row.tickets?.length || 0 },
    { key: 'amount', label: 'Сумма', render: (row) => `${Number(row.amount).toFixed(2)} ${row.currency}` },
    { key: 'status', label: 'Статус', render: (row) => <StatusPill status={row.status} /> },
    {
      key: 'actions',
      label: 'Действия',
      render: (row) => (
        <div className="actions compact">
          {['PENDING', 'AWAITING_PAYMENT'].includes(row.status) ? (
            <button className="btn btn-small btn-success" type="button" disabled={state.saving} onClick={() => updateOrderStatus(row.id, 'PAID')}>Оплачен</button>
          ) : null}
          {!['CANCELLED', 'EXPIRED', 'REFUNDED'].includes(row.status) ? (
            <button className="btn btn-small btn-danger" type="button" disabled={state.saving} onClick={() => updateOrderStatus(row.id, 'CANCELLED')}>Отменить</button>
          ) : null}
        </div>
      )
    }
  ];

  const ticketColumns = [
    { key: 'code', label: 'Код', render: (row) => <strong style={{ fontFamily: 'monospace' }}>{row.code}</strong> },
    { key: 'session', label: 'Дата', render: (row) => row.eventSession ? formatSessionLabel(row.eventSession) : 'Общая дата события' },
    { key: 'type', label: 'Тип билета', render: (row) => localizeField(row.ticketType?.name, language) },
    { key: 'holder', label: 'Владелец', render: (row) => row.holderName || row.order?.customerName || '—' },
    { key: 'status', label: 'Статус', render: (row) => <StatusPill status={row.status} /> },
    { key: 'created', label: 'Создан', render: (row) => formatDateTime(row.createdAt) }
  ];

  return (
    <AdminLayout>
      <PageContainer title="Продажа билетов" description="Управление датами события, тарифами, заказами и выпущенными билетами. Сначала создайте даты вечера, затем привяжите к ним тарифы билетов.">
        <label style={{ maxWidth: 520 }}>
          Мероприятие
          <select value={eventId} onChange={(event) => setEventId(event.target.value)}>
            {!events.length ? <option value="">Нет мероприятий</option> : null}
            {events.map((item) => <option key={item.id} value={item.id}>{localizeField(item.title, language)}</option>)}
          </select>
        </label>
        {state.error ? <p className="error">{state.error}</p> : null}
        {state.message ? <p className="form-state">{state.message}</p> : null}
      </PageContainer>

      <div className="grid-two-col" style={{ alignItems: 'start' }}>
        <PanelCard title={editingSessionId ? 'Редактирование даты события' : 'Даты события'} subtitle="Если событие проходит несколько вечеров подряд, создайте по одной записи на каждый день и время.">
          <form className="event-admin-form" onSubmit={saveSession}>
            <label>Название (UA)<input value={sessionForm.name.ua} onChange={(event) => setSessionForm({ ...sessionForm, name: { ...sessionForm.name, ua: event.target.value } })} placeholder="Например: Первый вечер" /></label>
            <div className="grid-two-col">
              <label>Начало<input type="datetime-local" required value={sessionForm.startsAt} onChange={(event) => setSessionForm({ ...sessionForm, startsAt: event.target.value })} /></label>
              <label>Конец<input type="datetime-local" required value={sessionForm.endsAt} onChange={(event) => setSessionForm({ ...sessionForm, endsAt: event.target.value })} /></label>
            </div>
            <label className="menu-admin-checkbox">
              <input type="checkbox" checked={sessionForm.isActive} onChange={(event) => setSessionForm({ ...sessionForm, isActive: event.target.checked })} />
              <span>Активна для продажи</span>
            </label>
            <div className="actions compact">
              <button className="btn" type="submit" disabled={state.saving || !eventId}>
                {editingSessionId ? 'Сохранить дату' : 'Добавить дату'}
              </button>
              {editingSessionId ? (
                <button className="btn btn-secondary" type="button" disabled={state.saving} onClick={resetSessionForm}>
                  Отмена
                </button>
              ) : null}
            </div>
          </form>

          <div className="rich-list" style={{ marginTop: 16 }}>
            {sessions.map((session) => (
              <div className="compact-row" key={session.id}>
                <div style={{ display: 'grid', gap: 4 }}>
                  <strong>{localizeField(session.name, language) || formatSessionLabel(session)}</strong>
                  <div className="muted">{formatSessionLabel(session)}</div>
                  <div className="muted small">{session.isActive ? 'Активна' : 'Скрыта с сайта'}</div>
                </div>
                <div className="actions compact">
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
                        sortOrder: session.sortOrder || 0
                      });
                      setEditingSessionId(session.id);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                  >
                    Редактировать
                  </button>
                  <button
                    type="button"
                    className="btn btn-small btn-danger"
                    disabled={state.saving}
                    onClick={() => deleteSession(session.id)}
                  >
                    Удалить
                  </button>
                </div>
              </div>
            ))}
            {!sessions.length ? <p className="muted">Для этого события пока не создано отдельных дат. Если событие идёт в два вечера, добавьте здесь оба дня.</p> : null}
          </div>
        </PanelCard>

        <PanelCard title={editingTypeId ? 'Редактирование типа билета' : 'Новый тип билета'} subtitle="Тариф билета теперь можно привязать к конкретной дате события.">
          <form className="event-admin-form" onSubmit={saveTicketType}>
            <label>Название (UA)<input required value={typeForm.name.ua} onChange={(event) => setTypeForm({ ...typeForm, name: { ...typeForm.name, ua: event.target.value } })} /></label>
            <label>Дата события
              <select value={typeForm.eventSessionId} onChange={(event) => setTypeForm({ ...typeForm, eventSessionId: event.target.value })}>
                <option value="">Без отдельной даты</option>
                {sessions.map((session) => (
                  <option key={session.id} value={session.id}>{localizeField(session.name, language) || formatSessionLabel(session)}</option>
                ))}
              </select>
            </label>
            <div className="grid-two-col">
              <label>Цена<input type="number" min="0" step="0.01" required value={typeForm.price} onChange={(event) => setTypeForm({ ...typeForm, price: event.target.value })} /></label>
              <label>Количество билетов<input type="number" min="1" required value={typeForm.capacity} onChange={(event) => setTypeForm({ ...typeForm, capacity: event.target.value })} /></label>
              <label>Начало продаж<input type="datetime-local" value={typeForm.salesStart} onChange={(event) => setTypeForm({ ...typeForm, salesStart: event.target.value })} /></label>
              <label>Конец продаж<input type="datetime-local" value={typeForm.salesEnd} onChange={(event) => setTypeForm({ ...typeForm, salesEnd: event.target.value })} /></label>
            </div>
            <label className="menu-admin-checkbox">
              <input type="checkbox" checked={typeForm.isActive} onChange={(event) => setTypeForm({ ...typeForm, isActive: event.target.checked })} />
              <span>Показывать на сайте</span>
            </label>
            <div className="actions compact">
              <button className="btn" type="submit" disabled={state.saving || !eventId}>
                {editingTypeId ? 'Сохранить изменения' : 'Создать тип билета'}
              </button>
              {editingTypeId ? (
                <button className="btn btn-secondary" type="button" disabled={state.saving} onClick={resetTypeForm}>
                  Отмена
                </button>
              ) : null}
            </div>
          </form>
          <div className="rich-list" style={{ marginTop: 16 }}>
            {ticketTypes.map((type) => (
              <div className="compact-row" key={type.id}>
                <div style={{ display: 'grid', gap: 4 }}>
                  <strong>{localizeField(type.name, language)}</strong>
                  <div className="muted">
                    {Number(type.price).toFixed(2)} {type.currency} · продано {type.soldCount}/{type.capacity}
                    {type.isActive ? ' · на сайте' : ' · скрыт'}
                  </div>
                  <div className="muted small">
                    {type.eventSession ? `Дата: ${localizeField(type.eventSession.name, language) || formatSessionLabel(type.eventSession)}` : 'Дата: общая для события'}
                  </div>
                  {(type.salesStart || type.salesEnd) ? (
                    <div className="muted small">
                      Продажи: {type.salesStart ? formatDateTime(type.salesStart) : 'сейчас'} - {type.salesEnd ? formatDateTime(type.salesEnd) : 'без окончания'}
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
                    {type.isActive ? 'Скрыть' : 'Показать'}
                  </button>
                  <button
                    type="button"
                    className="btn btn-small btn-secondary"
                    disabled={state.saving}
                    onClick={() => {
                      setTypeForm({
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
                      });
                      setEditingTypeId(type.id);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                  >
                    Редактировать
                  </button>
                  <button
                    type="button"
                    className="btn btn-small btn-danger"
                    disabled={state.saving || type.soldCount > 0}
                    onClick={() => deleteTicketType(type.id)}
                  >
                    Удалить
                  </button>
                </div>
              </div>
            ))}
            {!ticketTypes.length ? <p className="muted">Для выбранного события ещё нет типов билетов. После создания дат добавьте хотя бы один тариф.</p> : null}
          </div>
        </PanelCard>
      </div>

      <div className="grid-two-col" style={{ alignItems: 'start' }}>
        <PanelCard title="Ручной заказ" subtitle="Создание заказа менеджером или кассиром. Дата события определяется выбранным типом билета.">
          <form className="event-admin-form" onSubmit={createOrder}>
            <label>Покупатель<input required value={orderForm.customerName} onChange={(event) => setOrderForm({ ...orderForm, customerName: event.target.value })} /></label>
            <label>Email<input type="email" required value={orderForm.customerEmail} onChange={(event) => setOrderForm({ ...orderForm, customerEmail: event.target.value })} /></label>
            <label>Телефон<input value={orderForm.customerPhone} onChange={(event) => setOrderForm({ ...orderForm, customerPhone: event.target.value })} /></label>
            <div className="grid-two-col">
              <label>Тип билета<select required value={orderForm.ticketTypeId} onChange={(event) => setOrderForm({ ...orderForm, ticketTypeId: event.target.value })}>
                <option value="">Выберите тип билета</option>
                {activeTicketTypes.map((type) => (
                  <option key={type.id} value={type.id}>
                    {localizeField(type.name, language)} · {type.eventSession ? (localizeField(type.eventSession.name, language) || formatSessionLabel(type.eventSession)) : 'общая дата'} · {Number(type.price).toFixed(2)} {type.currency}
                  </option>
                ))}
              </select></label>
              <label>Количество<input type="number" min="1" max="100" required value={orderForm.quantity} onChange={(event) => setOrderForm({ ...orderForm, quantity: event.target.value })} /></label>
            </div>
            <label className="menu-admin-checkbox">
              <input type="checkbox" checked={orderForm.paid} onChange={(event) => setOrderForm({ ...orderForm, paid: event.target.checked })} />
              <span>Оплата уже получена</span>
            </label>
            <button className="btn" type="submit" disabled={state.saving || !eventId || !activeTicketTypes.length}>Создать заказ</button>
          </form>
        </PanelCard>
      </div>

      <PageContainer title="Заказы">
        {state.loading ? <p>Загрузка...</p> : <DataTable columns={orderColumns} rows={orders} emptyText="Заказов пока нет." />}
      </PageContainer>
      <PageContainer title="Выпущенные билеты">
        {state.loading ? <p>Загрузка...</p> : <DataTable columns={ticketColumns} rows={tickets} emptyText="Билетов пока нет." />}
      </PageContainer>
    </AdminLayout>
  );
}
