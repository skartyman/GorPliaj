import { useCallback, useEffect, useMemo, useState } from 'react';
import AdminLayout from '../components/AdminLayout';
import PageContainer from '../components/PageContainer';
import { apiRequest, localizeField } from '../lib/api';
import { useAdminI18n } from '../lib/i18n';

function money(value, currency = 'UAH') {
  return `${Number(value || 0).toLocaleString('uk-UA', { maximumFractionDigits: 2 })} ${currency}`;
}

function dateTime(value) {
  return value ? new Date(value).toLocaleString('uk-UA', { dateStyle: 'short', timeStyle: 'short' }) : '—';
}

function TimelineSection({ title, count, children, empty }) {
  return (
    <section className="guest-history-section">
      <div className="guest-history-heading"><h3>{title}</h3><span>{count}</span></div>
      {count ? children : <p className="muted guest-history-empty">{empty}</p>}
    </section>
  );
}

export default function GuestsPage() {
  const { language } = useAdminI18n();
  const ru = language === 'ru';
  const copy = useMemo(() => ru ? {
    title: 'Гости', description: 'Контакты гостей и история всех взаимодействий с заведением.',
    search: 'Имя, email или телефон', found: 'Найдено гостей', empty: 'Гости не найдены.',
    loadError: 'Не удалось загрузить гостей.', detailsError: 'Не удалось загрузить историю гостя.',
    registered: 'Регистрация', lastLogin: 'Последний вход', balance: 'Ракушки', bookings: 'Бронирования',
    restaurant: 'Заказы в ресторане', tickets: 'Покупки билетов', payments: 'Платежи', shells: 'История ракушек',
    savedOrders: 'Сохранённые заказы', noHistory: 'Истории пока нет', close: 'Закрыть', open: 'Открыть',
    guest: 'Гость без имени', orders: 'заказов', purchases: 'покупок', page: 'Страница'
  } : {
    title: 'Гості', description: 'Контакти гостей та історія всіх взаємодій із закладом.',
    search: 'Ім’я, email або телефон', found: 'Знайдено гостей', empty: 'Гостей не знайдено.',
    loadError: 'Не вдалося завантажити гостей.', detailsError: 'Не вдалося завантажити історію гостя.',
    registered: 'Реєстрація', lastLogin: 'Останній вхід', balance: 'Мушлі', bookings: 'Бронювання',
    restaurant: 'Замовлення в ресторані', tickets: 'Купівлі квитків', payments: 'Платежі', shells: 'Історія мушель',
    savedOrders: 'Збережені замовлення', noHistory: 'Історії поки немає', close: 'Закрити', open: 'Відкрити',
    guest: 'Гість без імені', orders: 'замовлень', purchases: 'покупок', page: 'Сторінка'
  }, [ru]);

  const [query, setQuery] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [state, setState] = useState({ loading: true, error: '', guests: [], total: 0, totalPages: 1 });
  const [selected, setSelected] = useState(null);
  const [detailState, setDetailState] = useState({ loading: false, error: '' });

  const loadGuests = useCallback(async () => {
    setState((current) => ({ ...current, loading: true, error: '' }));
    const params = new URLSearchParams({ page: String(page), limit: '30' });
    if (search) params.set('search', search);
    try {
      const { response, body } = await apiRequest(`/api/admin/guests?${params}`);
      if (!response.ok) throw new Error(body.message);
      setState({ loading: false, error: '', guests: body.guests || [], total: body.total || 0, totalPages: body.totalPages || 1 });
    } catch {
      setState((current) => ({ ...current, loading: false, error: copy.loadError }));
    }
  }, [page, search, copy.loadError]);

  useEffect(() => { loadGuests(); }, [loadGuests]);

  async function openGuest(id) {
    setSelected(null);
    setDetailState({ loading: true, error: '' });
    try {
      const { response, body } = await apiRequest(`/api/admin/guests/${id}`);
      if (!response.ok) throw new Error(body.message);
      setSelected(body.guest);
      setDetailState({ loading: false, error: '' });
    } catch {
      setDetailState({ loading: false, error: copy.detailsError });
    }
  }

  function submitSearch(event) {
    event.preventDefault();
    setPage(1);
    setSearch(query.trim());
  }

  return (
    <AdminLayout>
      <PageContainer title={copy.title} description={copy.description}>
        <section className="guest-admin-toolbar">
          <form onSubmit={submitSearch} className="guest-admin-search">
            <input className="input" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={copy.search} />
            <button className="btn btn-primary" type="submit">{ru ? 'Найти' : 'Знайти'}</button>
          </form>
          <strong>{copy.found}: {state.total}</strong>
        </section>

        {state.error ? <p className="error">{state.error}</p> : null}
        {state.loading ? <p className="muted">{ru ? 'Загружаем…' : 'Завантажуємо…'}</p> : null}
        {!state.loading && !state.guests.length ? <p className="muted">{copy.empty}</p> : null}

        <div className="guest-admin-grid">
          {state.guests.map((guest) => (
            <article className="guest-admin-card" key={guest.id}>
              <div className="guest-admin-avatar">{(guest.name || guest.email || '?').slice(0, 1).toUpperCase()}</div>
              <div className="guest-admin-card-main">
                <h3>{guest.name || copy.guest}</h3>
                <a href={`mailto:${guest.email}`}>{guest.email}</a>
                {guest.phone ? <a href={`tel:${guest.phone}`}>{guest.phone}</a> : <span className="muted">—</span>}
                <div className="guest-admin-meta">
                  <span>{copy.balance}: <b>{guest.shellBalance}</b></span>
                  <span>{guest._count?.reservations || 0} {copy.orders}</span>
                  <span>{guest._count?.payments || 0} {copy.purchases}</span>
                </div>
              </div>
              <button type="button" className="btn btn-small" onClick={() => openGuest(guest.id)}>{copy.open}</button>
            </article>
          ))}
        </div>

        {state.totalPages > 1 ? (
          <div className="guest-admin-pagination">
            <button className="btn" disabled={page === 1} onClick={() => setPage((value) => value - 1)}>←</button>
            <span>{copy.page} {page} / {state.totalPages}</span>
            <button className="btn" disabled={page === state.totalPages} onClick={() => setPage((value) => value + 1)}>→</button>
          </div>
        ) : null}

        {(detailState.loading || detailState.error || selected) ? (
          <div className="admin-modal-overlay guest-detail-overlay" role="presentation" onMouseDown={(event) => {
            if (event.target === event.currentTarget) { setSelected(null); setDetailState({ loading: false, error: '' }); }
          }}>
            <div className="admin-modal-card guest-detail-modal">
              {detailState.loading ? <p className="muted">{ru ? 'Загружаем историю…' : 'Завантажуємо історію…'}</p> : null}
              {detailState.error ? <p className="error">{detailState.error}</p> : null}
              {selected ? <>
                <header className="guest-detail-header">
                  <div>
                    <span className="eyebrow">ID {selected.id}</span>
                    <h2>{selected.name || copy.guest}</h2>
                    <div className="guest-detail-contacts"><a href={`mailto:${selected.email}`}>{selected.email}</a>{selected.phone ? <a href={`tel:${selected.phone}`}>{selected.phone}</a> : null}</div>
                  </div>
                  <button className="icon-btn" onClick={() => setSelected(null)} aria-label={copy.close}>×</button>
                </header>
                <div className="guest-detail-summary">
                  <div><span>{copy.registered}</span><strong>{dateTime(selected.createdAt)}</strong></div>
                  <div><span>{copy.lastLogin}</span><strong>{dateTime(selected.lastLoginAt)}</strong></div>
                  <div><span>{copy.balance}</span><strong>{selected.shellBalance}</strong></div>
                </div>

                <TimelineSection title={copy.bookings} count={selected.reservations?.length || 0} empty={copy.noHistory}>
                  {selected.reservations.map((item) => <div className="guest-history-row" key={`r-${item.id}`}><div><strong>#{item.id} · {localizeField(item.table?.name, language) || item.table?.code || '—'}</strong><span>{dateTime(item.reservationDate)} · {item.guests} {ru ? 'гостей' : 'гостей'}</span></div><span className="status-pill">{item.status}</span></div>)}
                </TimelineSection>
                <TimelineSection title={copy.restaurant} count={selected.tableOrders?.length || 0} empty={copy.noHistory}>
                  {selected.tableOrders.map((item) => <div className="guest-history-row" key={`o-${item.id}`}><div><strong>#{item.id} · {localizeField(item.table?.name, language) || item.table?.code || '—'}</strong><span>{dateTime(item.createdAt)} · {item.items.map((line) => `${localizeField(line.menuItem?.name, language) || 'Позиція'} ×${line.quantity}`).join(', ')}</span></div><b>{money(item.total)}</b></div>)}
                </TimelineSection>
                <TimelineSection title={copy.tickets} count={selected.ticketOrders?.length || 0} empty={copy.noHistory}>
                  {selected.ticketOrders.map((item) => <div className="guest-history-row" key={`t-${item.id}`}><div><strong>{item.orderNumber} · {localizeField(item.event?.title, language)}</strong><span>{dateTime(item.createdAt)} · {item.tickets?.length || 0} {ru ? 'билетов' : 'квитків'}</span></div><b>{money(item.amount, item.currency)}</b></div>)}
                </TimelineSection>
                <TimelineSection title={copy.payments} count={selected.payments?.length || 0} empty={copy.noHistory}>
                  {selected.payments.map((item) => <div className="guest-history-row" key={`p-${item.id}`}><div><strong>#{item.id} · {item.provider}</strong><span>{dateTime(item.createdAt)}</span></div><div><b>{money(item.amount, item.currency)}</b><span className="status-pill">{item.status}</span></div></div>)}
                </TimelineSection>
                <TimelineSection title={copy.shells} count={selected.shellTransactions?.length || 0} empty={copy.noHistory}>
                  {selected.shellTransactions.map((item) => <div className="guest-history-row" key={`s-${item.id}`}><div><strong>{item.description || item.source}</strong><span>{dateTime(item.createdAt)}</span></div><b className={item.type === 'SPEND' ? 'negative' : 'positive'}>{item.type === 'SPEND' ? '−' : '+'}{item.amount}</b></div>)}
                </TimelineSection>
                <TimelineSection title={copy.savedOrders} count={selected.favoriteOrders?.length || 0} empty={copy.noHistory}>
                  {selected.favoriteOrders.map((item) => <div className="guest-history-row" key={`f-${item.id}`}><div><strong>{item.name}</strong><span>{dateTime(item.createdAt)}</span></div></div>)}
                </TimelineSection>
              </> : null}
            </div>
          </div>
        ) : null}
      </PageContainer>
    </AdminLayout>
  );
}
