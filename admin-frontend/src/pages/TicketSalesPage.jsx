import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import AdminLayout from '../components/AdminLayout';
import PageContainer from '../components/PageContainer';
import PanelCard from '../components/PanelCard';
import DataTable from '../components/DataTable';
import StatusPill from '../components/StatusPill';
import { apiRequest, formatDateTime, localizeField } from '../lib/api';
import { useAdminI18n } from '../lib/i18n';

const EMPTY_TYPE = {
  name: { ua: '', ru: '', en: '' },
  price: '',
  currency: 'UAH',
  capacity: '',
  salesStart: '',
  salesEnd: '',
  isActive: true
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

export default function TicketSalesPage() {
  const { language } = useAdminI18n();
  const [searchParams, setSearchParams] = useSearchParams();
  const [events, setEvents] = useState([]);
  const [eventId, setEventId] = useState(() => searchParams.get('eventId') || '');
  const [ticketTypes, setTicketTypes] = useState([]);
  const [orders, setOrders] = useState([]);
  const [tickets, setTickets] = useState([]);
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
      apiRequest(`/api/admin/events/${selectedEventId}/ticket-types`),
      apiRequest(`/api/admin/ticket-orders?${query}`),
      apiRequest(`/api/admin/tickets?${query}`)
    ]);
    const failed = results.find((item) => !item.response.ok);
    if (failed) throw new Error(failed.body.message || 'Unable to load ticket sales.');

    const types = Array.isArray(results[0].body) ? results[0].body : [];
    setTicketTypes(types);
    setOrders(Array.isArray(results[1].body) ? results[1].body : []);
    setTickets(Array.isArray(results[2].body) ? results[2].body : []);
    setOrderForm((current) => ({
      ...current,
      ticketTypeId: types.some((type) => String(type.id) === current.ticketTypeId)
        ? current.ticketTypeId
        : String(types[0]?.id || '')
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

  function resetTypeForm() {
    setTypeForm(EMPTY_TYPE);
    setEditingTypeId(null);
  }

  async function saveTicketType(event) {
    event.preventDefault();
    setState((current) => ({ ...current, saving: true, error: '', message: '' }));
    const payload = {
      ...typeForm,
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
      setState((current) => ({ ...current, saving: false, error: body.message || 'Unable to save ticket type.' }));
      return;
    }
    resetTypeForm();
    await loadSales(eventId);
    setState((current) => ({ ...current, saving: false, message: editingTypeId ? 'Тип билета обновлён.' : 'Тип билета создан и доступен для продажи.' }));
  }

  async function updateTicketType(id, payload) {
    setState((current) => ({ ...current, saving: true, error: '', message: '' }));
    const { response, body } = await apiRequest(`/api/admin/ticket-types/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload)
    });
    if (!response.ok) {
      setState((current) => ({ ...current, saving: false, error: body.message || 'Unable to update ticket type.' }));
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
      setState((current) => ({ ...current, saving: false, error: body.message || 'Unable to delete ticket type.' }));
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
      setState((current) => ({ ...current, saving: false, error: body.message || 'Unable to create order.' }));
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
      setState((current) => ({ ...current, saving: false, error: body.message || 'Unable to update order.' }));
      return;
    }
    await loadSales(eventId);
    setState((current) => ({ ...current, saving: false, message: 'Статус заказа обновлён.' }));
  }

  const orderColumns = [
    { key: 'number', label: 'Заказ', render: (row) => <strong>{row.orderNumber}</strong> },
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
    { key: 'type', label: 'Тип билета', render: (row) => localizeField(row.ticketType?.name, language) },
    { key: 'holder', label: 'Владелец', render: (row) => row.holderName || row.order?.customerName || '—' },
    { key: 'status', label: 'Статус', render: (row) => <StatusPill status={row.status} /> },
    { key: 'created', label: 'Создан', render: (row) => formatDateTime(row.createdAt) }
  ];

  return (
    <AdminLayout>
      <PageContainer title="Продажа билетов" description="Типы билетов, заказы, выпущенные билеты и контроль входа. Тип билета - это вариант покупки на публичной странице события.">
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
        <PanelCard title={editingTypeId ? 'Редактирование типа билета' : 'Новый тип билета'} subtitle="Например: Standard, VIP, Early bird. Активные типы автоматически появляются на странице покупки события.">
          <form className="event-admin-form" onSubmit={saveTicketType}>
            <label>Название (UA)<input required value={typeForm.name.ua} onChange={(event) => setTypeForm({ ...typeForm, name: { ...typeForm.name, ua: event.target.value } })} /></label>
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
                        isActive: Boolean(type.isActive)
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
            {!ticketTypes.length ? (
              <p className="muted">Для выбранного события ещё нет типов билетов. Создайте хотя бы один, чтобы покупка появилась на сайте.</p>
            ) : null}
          </div>
        </PanelCard>

        <PanelCard title="Ручной заказ" subtitle="Создание заказа менеджером или кассиром.">
          <form className="event-admin-form" onSubmit={createOrder}>
            <label>Покупатель<input required value={orderForm.customerName} onChange={(event) => setOrderForm({ ...orderForm, customerName: event.target.value })} /></label>
            <label>Email<input type="email" required value={orderForm.customerEmail} onChange={(event) => setOrderForm({ ...orderForm, customerEmail: event.target.value })} /></label>
            <label>Телефон<input value={orderForm.customerPhone} onChange={(event) => setOrderForm({ ...orderForm, customerPhone: event.target.value })} /></label>
            <div className="grid-two-col">
              <label>Тип билета<select required value={orderForm.ticketTypeId} onChange={(event) => setOrderForm({ ...orderForm, ticketTypeId: event.target.value })}>
                <option value="">Выберите тип билета</option>
                {ticketTypes.filter((type) => type.isActive).map((type) => (
                  <option key={type.id} value={type.id}>
                    {localizeField(type.name, language)} · {Number(type.price).toFixed(2)} {type.currency}
                  </option>
                ))}
              </select></label>
              <label>Количество<input type="number" min="1" max="100" required value={orderForm.quantity} onChange={(event) => setOrderForm({ ...orderForm, quantity: event.target.value })} /></label>
            </div>
            <label className="menu-admin-checkbox">
              <input type="checkbox" checked={orderForm.paid} onChange={(event) => setOrderForm({ ...orderForm, paid: event.target.checked })} />
              <span>Оплата уже получена</span>
            </label>
            <button className="btn" type="submit" disabled={state.saving || !eventId || !ticketTypes.length}>Создать заказ</button>
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
