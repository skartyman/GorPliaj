import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import { eventsApi } from '../lib/api';
import { formatEventDateRange } from '../lib/events';
import { localizedCopy, localizeField } from '../lib/i18n';
import { useMeta } from '../hooks/useMeta';
import { useLocale } from '../state/locale';
import { sanitizeRichText } from '../lib/richText';

function formatPhone(value) {
  const digits = value.replace(/\D/g, '').slice(0, 12);
  if (!digits) return '';
  const d = digits.startsWith('38') ? digits.slice(2) : digits;
  let out = '+38 (0';
  if (d.length > 1) out += d.slice(1, 3);
  if (d.length > 3) out += ') ' + d.slice(3, 6);
  if (d.length > 6) out += '-' + d.slice(6, 8);
  if (d.length > 8) out += '-' + d.slice(8, 10);
  return d.length > 1 ? out : '+38 (0';
}

function formatSessionRange(session, locale) {
  if (!session?.startsAt) return '';
  const formatLocale = locale === 'en' ? 'en-US' : (locale === 'ua' ? 'uk-UA' : 'ru-RU');
  const start = new Date(session.startsAt);
  const end = new Date(session.endsAt);
  const datePart = start.toLocaleDateString(formatLocale, {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });
  const startTime = start.toLocaleTimeString(formatLocale, { hour: '2-digit', minute: '2-digit' });
  const endTime = end.toLocaleTimeString(formatLocale, { hour: '2-digit', minute: '2-digit' });
  return `${datePart}, ${startTime} - ${endTime}`;
}

export default function EventDetailPage() {
  const { locale } = useLocale();
  const { slug } = useParams();
  const [searchParams] = useSearchParams();
  const [state, setState] = useState({ loading: true, error: '', event: null });
  const [sales, setSales] = useState({ loading: false, error: '', ticketTypes: [], sessions: [] });
  const [orderForm, setOrderForm] = useState({
    eventSessionId: '',
    ticketTypeId: '',
    quantity: 1,
    customerName: '',
    customerEmail: '',
    customerPhone: ''
  });
  const [orderResult, setOrderResult] = useState(null);
  const [orderStatus, setOrderStatus] = useState(null);
  const [justCreatedOrder, setJustCreatedOrder] = useState(false);
  const [ticketFormOpen, setTicketFormOpen] = useState(false);
  const c = (values) => localizedCopy(values, locale);
  const metaTitle = localizeField(state.event?.title, locale);
  const metaDescription = localizeField(state.event?.shortDescription, locale);
  useMeta(state.event ? `${metaTitle} · GorPliaj` : 'Event · GorPliaj', metaDescription || 'Event details.');

  useEffect(() => {
    if (!slug) return;
    eventsApi
      .bySlug(slug)
      .then((event) => setState({ loading: false, error: '', event }))
      .catch(() => setState({
        loading: false,
        error: c({
          ua: 'Не вдалося завантажити подію.',
          ru: 'Не удалось загрузить событие.',
          en: 'Failed to load event.'
        }),
        event: null
      }));
  }, [slug, locale]);

  useEffect(() => {
    if (!slug || !state.event || !['TICKETS', 'BOTH'].includes(state.event.ctaType)) return;
    setSales((current) => ({ ...current, loading: true, error: '' }));
    eventsApi.ticketTypes(slug)
      .then((result) => {
        const ticketTypes = Array.isArray(result.ticketTypes) ? result.ticketTypes : [];
        const sessions = Array.isArray(result.sessions) ? result.sessions : [];
        const defaultSessionId = sessions[0] ? String(sessions[0].id) : '';
        const defaultTypes = ticketTypes.filter((type) => String(type.eventSessionId || '') === defaultSessionId);

        setSales({ loading: false, error: '', ticketTypes, sessions });
        setOrderForm((current) => ({
          ...current,
          eventSessionId: current.eventSessionId || defaultSessionId,
          ticketTypeId: current.ticketTypeId || String(defaultTypes[0]?.id || ticketTypes[0]?.id || '')
        }));
      })
      .catch((error) => setSales({ loading: false, error: error.message, ticketTypes: [], sessions: [] }));
  }, [slug, state.event]);

  useEffect(() => {
    if (!orderResult?.orderNumber || !orderResult?.downloadToken) return undefined;

    let cancelled = false;
    async function refreshStatus() {
      try {
        const result = await eventsApi.ticketOrderStatus(orderResult.orderNumber, orderResult.downloadToken);
        if (!cancelled) setOrderStatus(result);
      } catch {}
    }

    refreshStatus();
    const interval = window.setInterval(refreshStatus, 5000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [orderResult]);

  useEffect(() => {
    const orderNumber = searchParams.get('ticket_order');
    const downloadToken = searchParams.get('token');
    if (!orderNumber || !downloadToken) return;

    setJustCreatedOrder(false);
    setOrderResult((current) => current || {
      orderNumber,
      downloadToken,
      amount: null,
      currency: 'UAH',
      paymentUrl: null
    });
    setTicketFormOpen(true);
  }, [searchParams]);

  useEffect(() => {
    if (searchParams.get('focus') !== 'tickets') return;
    if (!state.event || !['TICKETS', 'BOTH'].includes(state.event.ctaType)) return;
    setTicketFormOpen(true);
  }, [searchParams, state.event]);

  const visibleTicketTypes = useMemo(() => {
    if (!sales.sessions.length) return sales.ticketTypes;
    return sales.ticketTypes.filter((type) => String(type.eventSessionId || '') === String(orderForm.eventSessionId || ''));
  }, [sales.sessions, sales.ticketTypes, orderForm.eventSessionId]);

  const selectedTicketType = useMemo(() => {
    if (!visibleTicketTypes.length) return null;
    return visibleTicketTypes.find((type) => String(type.id) === String(orderForm.ticketTypeId)) || visibleTicketTypes[0];
  }, [visibleTicketTypes, orderForm.ticketTypeId]);

  const hasTicketTypeChoice = visibleTicketTypes.length > 1;

  useEffect(() => {
    if (!visibleTicketTypes.length) return;
    if (visibleTicketTypes.some((type) => String(type.id) === String(orderForm.ticketTypeId))) return;
    setOrderForm((current) => ({ ...current, ticketTypeId: String(visibleTicketTypes[0].id) }));
  }, [visibleTicketTypes, orderForm.ticketTypeId]);

  async function submitTicketOrder(event) {
    event.preventDefault();
    if (!selectedTicketType) return;

    setSales((current) => ({ ...current, loading: true, error: '' }));
    setOrderResult(null);
    setOrderStatus(null);

    try {
      const result = await eventsApi.createTicketOrder(slug, {
        eventSessionId: orderForm.eventSessionId ? Number(orderForm.eventSessionId) : null,
        customerName: orderForm.customerName,
        customerEmail: orderForm.customerEmail,
        customerPhone: orderForm.customerPhone,
        items: [{
          ticketTypeId: Number(selectedTicketType.id),
          quantity: Number(orderForm.quantity)
        }]
      });
      setJustCreatedOrder(true);
      setOrderResult(result.order);
      setSales((current) => ({ ...current, loading: false }));
      if (result.order?.paymentUrl) {
        window.location.assign(result.order.paymentUrl);
        return;
      }
    } catch (error) {
      setSales((current) => ({ ...current, loading: false, error: error.message }));
    }
  }

  if (state.loading) {
    return <div className="state-msg">{c({ ua: 'Завантаження події...', ru: 'Загрузка события...', en: 'Loading event...' })}</div>;
  }

  if (state.error || !state.event) {
    return <div className="state-msg state-error">{state.error || c({ ua: 'Подію не знайдено.', ru: 'Событие не найдено.', en: 'Event not found.' })}</div>;
  }

  const event = state.event;
  const title = localizeField(event.title, locale);
  const shortDescription = localizeField(event.shortDescription, locale);
  const fullDescription = localizeField(event.fullDescription, locale);
  const fullDescriptionHtml = sanitizeRichText(fullDescription);
  const paymentUrl = orderStatus?.paymentUrl || orderResult?.paymentUrl;
  const bookingUrl = `/booking?event=${encodeURIComponent(event.slug)}`;

  return (
    <>
      <Link to="/events" className="text-link event-back-link">
        ← {c({ ua: 'Назад до афіші', ru: 'Назад к афише', en: 'Back to events' })}
      </Link>

      <div className="event-detail-layout">
        <div className="event-detail-poster">
          <img src={event.posterImage || '/icons/lebedi.jpg'} alt={title} />
        </div>
        <div className="event-detail-content">
          <p className="event-date">{formatEventDateRange(event.startAt, event.endAt, locale === 'en' ? 'en-US' : (locale === 'ua' ? 'uk-UA' : 'ru-RU'))}</p>
          <h1>{title}</h1>
          <p className="muted event-detail-lead">{shortDescription}</p>
          {fullDescriptionHtml ? (
            <div className="event-rich-text" dangerouslySetInnerHTML={{ __html: fullDescriptionHtml }} />
          ) : null}
          <div className="btn-group event-detail-actions">
            {(event.ctaType === 'BOOKING' || event.ctaType === 'BOTH') ? (
              <Link className="btn btn-primary" to={bookingUrl}>
                {c({ ua: 'Забронювати стіл', ru: 'Забронировать стол', en: 'Book a table' })}
              </Link>
            ) : null}
            {(event.ctaType === 'TICKETS' || event.ctaType === 'BOTH') && event.ticketUrl ? (
              <a className="btn btn-secondary" href={event.ticketUrl} target="_blank" rel="noreferrer">
                {c({ ua: 'Купити квиток', ru: 'Купить билет', en: 'Buy ticket' })}
              </a>
            ) : null}
            {(event.ctaType === 'TICKETS' || event.ctaType === 'BOTH') && !event.ticketUrl ? (
              <button type="button" className="btn btn-secondary" onClick={() => setTicketFormOpen(true)}>
                {c({ ua: 'Купити квиток', ru: 'Купить билет', en: 'Buy ticket' })}
              </button>
            ) : null}
          </div>

          {(event.ctaType === 'TICKETS' || event.ctaType === 'BOTH') && ticketFormOpen ? (
            <div className="guest-modal-backdrop" role="presentation" onClick={() => setTicketFormOpen(false)}>
              <div className="guest-modal" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
                <button type="button" className="guest-modal-close" onClick={() => setTicketFormOpen(false)} aria-label={c({ ua: 'Закрити', ru: 'Закрыть', en: 'Close' })}>
                  ×
                </button>
                {!orderResult ? (
                  <>
                    {sales.loading && !sales.ticketTypes.length ? (
                      <div className="state-msg">
                        {c({ ua: 'Завантажуємо квитки...', ru: 'Загружаем билеты...', en: 'Loading tickets...' })}
                      </div>
                    ) : null}
                    {!sales.loading && !sales.ticketTypes.length && !sales.error ? (
                      <div className="state-msg">
                        {c({
                          ua: 'Продаж квитків для цієї події ще не відкритий.',
                          ru: 'Продажа билетов для этого события еще не открыта.',
                          en: 'Ticket sales for this event are not open yet.'
                        })}
                      </div>
                    ) : null}
                    {!sales.loading && sales.sessions.length > 0 && orderForm.eventSessionId && !visibleTicketTypes.length && !sales.error ? (
                      <div className="state-msg">
                        {c({
                          ua: 'Для обраної дати квитки ще не налаштовані. Оберіть іншу дату або зверніться до адміністратора.',
                          ru: 'Для выбранной даты билеты еще не настроены. Выберите другую дату или обратитесь к администратору.',
                          en: 'Tickets have not been configured for the selected date yet. Choose another date or contact the venue.'
                        })}
                      </div>
                    ) : null}
                    {sales.ticketTypes.length ? (
                      <form onSubmit={submitTicketOrder} className="form-grid ticket-order-form">
                        <div className="form-group ticket-form-head">
                          <h2>{c({ ua: 'Купити квиток', ru: 'Купить билет', en: 'Buy a ticket' })}</h2>
                        </div>
                        {hasTicketTypeChoice ? (
                          <div className="form-group">
                            <label>{c({ ua: 'Варіант квитка', ru: 'Вариант билета', en: 'Ticket option' })}</label>
                            <select
                              className="form-input"
                              value={orderForm.ticketTypeId}
                              onChange={(eventValue) => setOrderForm({ ...orderForm, ticketTypeId: eventValue.target.value })}
                              required
                            >
                              {visibleTicketTypes.map((type) => (
                                <option key={type.id} value={type.id}>
                                  {localizeField(type.name, locale)} - {type.price} {type.currency}
                                </option>
                              ))}
                            </select>
                          </div>
                        ) : selectedTicketType ? (
                          <div className="form-group">
                            <label>{c({ ua: 'Квиток', ru: 'Билет', en: 'Ticket' })}</label>
                            <div className="ticket-type-summary">
                              <strong>{localizeField(selectedTicketType.name, locale)}</strong>
                              <span>{selectedTicketType.price} {selectedTicketType.currency}</span>
                            </div>
                          </div>
                        ) : null}
                        {sales.sessions.length ? (
                          <div className="form-group">
                            <label>{c({ ua: 'Дата події', ru: 'Дата события', en: 'Event date' })}</label>
                            <select
                              className="form-input"
                              value={orderForm.eventSessionId}
                              onChange={(eventValue) => {
                                const nextSessionId = eventValue.target.value;
                                const nextTypes = sales.ticketTypes.filter((type) => String(type.eventSessionId || '') === String(nextSessionId || ''));
                                setOrderForm({
                                  ...orderForm,
                                  eventSessionId: nextSessionId,
                                  ticketTypeId: String(nextTypes[0]?.id || '')
                                });
                              }}
                              required
                            >
                              {sales.sessions.map((session) => (
                                <option key={session.id} value={session.id}>
                                  {localizeField(session.name, locale) || formatSessionRange(session, locale)}
                                </option>
                              ))}
                            </select>
                          </div>
                        ) : null}
                        <div className="form-group">
                          <label>{c({ ua: 'Кількість', ru: 'Количество', en: 'Quantity' })}</label>
                          <div className="guest-stepper">
                            <button type="button" className="guest-stepper-btn" onClick={() => setOrderForm((current) => ({ ...current, quantity: Math.max(1, Number(current.quantity) - 1) }))}>−</button>
                            <span className="guest-stepper-value">{orderForm.quantity}</span>
                            <button type="button" className="guest-stepper-btn" onClick={() => setOrderForm((current) => ({ ...current, quantity: Math.min(20, Number(current.quantity) + 1) }))}>+</button>
                          </div>
                        </div>
                        <div className="form-group">
                          <label>{c({ ua: "Ім'я", ru: 'Имя', en: 'Name' })}</label>
                          <input
                            className="form-input"
                            required
                            value={orderForm.customerName}
                            onChange={(eventValue) => setOrderForm({ ...orderForm, customerName: eventValue.target.value })}
                          />
                        </div>
                        <div className="form-group">
                          <label>Email</label>
                          <input
                            className="form-input"
                            type="email"
                            required
                            value={orderForm.customerEmail}
                            onChange={(eventValue) => setOrderForm({ ...orderForm, customerEmail: eventValue.target.value })}
                          />
                        </div>
                        <div className="form-group">
                          <label>{c({ ua: 'Телефон', ru: 'Телефон', en: 'Phone' })}</label>
                          <input
                            type="tel"
                            className="form-input"
                            placeholder="+38 (0XX) XXX-XX-XX"
                            value={orderForm.customerPhone}
                            onChange={(eventValue) => setOrderForm({ ...orderForm, customerPhone: formatPhone(eventValue.target.value) })}
                          />
                        </div>
                        <button className="btn btn-primary ticket-submit-btn" type="submit" disabled={sales.loading || !selectedTicketType}>
                          {sales.loading ? c({ ua: 'Створюємо...', ru: 'Создаем...', en: 'Creating...' }) : c({ ua: 'Оформити замовлення', ru: 'Оформить заказ', en: 'Place order' })}
                        </button>
                      </form>
                    ) : null}
                    {sales.error ? <div className="state-msg state-error" style={{ marginTop: 12 }}>{sales.error}</div> : null}
                  </>
                ) : (
                  <>
                    {orderStatus?.downloadUrl ? (
                      <div className="guest-modal-actions" style={{ marginBottom: 16 }}>
                        <a className="btn btn-primary" href={orderStatus.downloadUrl}>
                          {c({ ua: 'Завантажити квитки PDF', ru: 'Скачать билеты PDF', en: 'Download tickets PDF' })}
                        </a>
                      </div>
                    ) : null}
                    {orderStatus?.status !== 'PAID' && paymentUrl && !justCreatedOrder ? (
                      <div className="guest-modal-actions" style={{ marginBottom: 16 }}>
                        <a className="btn btn-primary" href={paymentUrl} target="_blank" rel="noreferrer">
                          {c({ ua: 'Оплатити квитки', ru: 'Оплатить билеты', en: 'Pay for tickets' })}
                        </a>
                      </div>
                    ) : null}
                    {orderStatus?.status === 'PAID' ? (
                      <>
                        <span className="guest-modal-kicker">{c({ ua: 'Квитки готові', ru: 'Билеты готовы', en: 'Tickets are ready' })}</span>
                        <h2>{c({ ua: 'Хочете одразу забронювати стіл на цей вечір?', ru: 'Хотите сразу забронировать стол на этот вечер?', en: 'Would you like to book a table for the evening?' })}</h2>
                        <p>{c({ ua: 'Можна одразу перейти до бронювання або спочатку переглянути меню.', ru: 'Можно сразу перейти к бронированию или сначала посмотреть меню.', en: 'You can jump straight to event booking or browse the menu first.' })}</p>
                        <div className="guest-modal-actions">
                          {(event.ctaType === 'BOOKING' || event.ctaType === 'BOTH') ? (
                            <Link className="btn btn-primary" to={bookingUrl} onClick={() => setTicketFormOpen(false)}>
                              {c({ ua: 'Забронювати стіл', ru: 'Забронировать стол', en: 'Book a table' })}
                            </Link>
                          ) : null}
                          <Link className="btn btn-secondary" to="/menu" onClick={() => setTicketFormOpen(false)}>
                            {c({ ua: 'Переглянути меню', ru: 'Посмотреть меню', en: 'View menu' })}
                          </Link>
                          {orderStatus?.downloadUrl ? (
                            <a className="btn btn-secondary" href={orderStatus.downloadUrl}>
                              {c({ ua: 'Завантажити квитки PDF', ru: 'Скачать билеты PDF', en: 'Download tickets PDF' })}
                            </a>
                          ) : null}
                        </div>
                      </>
                    ) : null}
                  </>
                )}
              </div>
            </div>
          ) : null}
        </div>
      </div>

    </>
  );
}
