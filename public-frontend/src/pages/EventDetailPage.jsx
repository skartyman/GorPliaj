import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import { eventsApi } from '../lib/api';
import { formatEventDateRange } from '../lib/events';
import { localizedCopy, localizeField } from '../lib/i18n';
import { useMeta } from '../hooks/useMeta';
import { useLocale } from '../state/locale';
import { sanitizeRichText } from '../lib/richText';

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
  const c = (values) => localizedCopy(values, locale);
  const metaTitle = localizeField(state.event?.title, locale);
  const metaDescription = localizeField(state.event?.shortDescription, locale);
  useMeta(state.event ? `${metaTitle} · GorPliaj` : 'Event · GorPliaj', metaDescription || 'Event details.');

  useEffect(() => {
    if (!slug) return;
    eventsApi
      .bySlug(slug)
      .then((event) => setState({ loading: false, error: '', event }))
      .catch(() => setState({ loading: false, error: c({ ua: 'Не вдалося завантажити подію.', ru: 'Не удалось загрузить событие.', en: 'Failed to load event.' }), event: null }));
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
    setOrderResult((current) => current || {
      orderNumber,
      downloadToken,
      amount: null,
      currency: 'UAH',
      paymentUrl: null
    });
  }, [searchParams]);

  const visibleTicketTypes = useMemo(() => {
    if (!sales.sessions.length) return sales.ticketTypes;
    return sales.ticketTypes.filter((type) => String(type.eventSessionId || '') === String(orderForm.eventSessionId || ''));
  }, [sales.sessions, sales.ticketTypes, orderForm.eventSessionId]);

  useEffect(() => {
    if (!visibleTicketTypes.length) return;
    if (visibleTicketTypes.some((type) => String(type.id) === String(orderForm.ticketTypeId))) return;
    setOrderForm((current) => ({ ...current, ticketTypeId: String(visibleTicketTypes[0].id) }));
  }, [visibleTicketTypes, orderForm.ticketTypeId]);

  async function submitTicketOrder(event) {
    event.preventDefault();
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
          ticketTypeId: Number(orderForm.ticketTypeId),
          quantity: Number(orderForm.quantity)
        }]
      });
      setOrderResult(result.order);
      setSales((current) => ({ ...current, loading: false }));
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
              <Link className="btn btn-primary" to={`/booking?event=${event.slug}`}>
                {c({ ua: 'Забронювати стіл', ru: 'Забронировать стол', en: 'Book a table' })}
              </Link>
            ) : null}
            {(event.ctaType === 'TICKETS' || event.ctaType === 'BOTH') && event.ticketUrl ? (
              <a className="btn btn-secondary" href={event.ticketUrl} target="_blank" rel="noreferrer">
                {c({ ua: 'Купити квиток', ru: 'Купить билет', en: 'Buy ticket' })}
              </a>
            ) : null}
            {(event.ctaType === 'TICKETS' || event.ctaType === 'BOTH') && !event.ticketUrl ? (
              <a className="btn btn-secondary" href="#tickets">
                {c({ ua: 'Купити квиток', ru: 'Купить билет', en: 'Buy ticket' })}
              </a>
            ) : null}
          </div>

          {(event.ctaType === 'TICKETS' || event.ctaType === 'BOTH') ? (
            <div id="tickets" className="ticket-purchase-panel">
              {sales.loading && !sales.ticketTypes.length ? (
                <div className="state-msg">
                  {c({ ua: 'Завантажуємо квитки...', ru: 'Загружаем билеты...', en: 'Loading tickets...' })}
                </div>
              ) : null}
              {!sales.loading && !sales.ticketTypes.length && !sales.error ? (
                <div className="state-msg">
                  {c({
                    ua: 'Продаж квитків для цієї події ще не відкритий.',
                    ru: 'Продажа билетов для этого события ещё не открыта.',
                    en: 'Ticket sales for this event are not open yet.'
                  })}
                </div>
              ) : null}
              {sales.ticketTypes.length ? (
                <form onSubmit={submitTicketOrder} className="form-grid ticket-order-form">
                  <div className="form-group ticket-form-head">
                    <h2>{c({ ua: 'Купити квиток', ru: 'Купить билет', en: 'Buy a ticket' })}</h2>
                  </div>
                  {sales.sessions.length ? (
                    <div className="form-group">
                      <label>{c({ ua: 'Дата події', ru: 'Дата события', en: 'Event date' })}</label>
                      <select
                        className="form-input"
                        value={orderForm.eventSessionId}
                        onChange={(event) => setOrderForm({ ...orderForm, eventSessionId: event.target.value, ticketTypeId: '' })}
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
                    <label>{c({ ua: 'Тариф', ru: 'Тариф', en: 'Ticket type' })}</label>
                    <select className="form-input" value={orderForm.ticketTypeId} onChange={(event) => setOrderForm({ ...orderForm, ticketTypeId: event.target.value })} required>
                      {visibleTicketTypes.map((type) => (
                        <option key={type.id} value={type.id}>
                          {localizeField(type.name, locale)} · {type.price} {type.currency} ({type.available})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>{c({ ua: 'Кількість', ru: 'Количество', en: 'Quantity' })}</label>
                    <input className="form-input" type="number" min="1" max="20" required value={orderForm.quantity} onChange={(event) => setOrderForm({ ...orderForm, quantity: event.target.value })} />
                  </div>
                  <div className="form-group">
                    <label>{c({ ua: 'Імʼя', ru: 'Имя', en: 'Name' })}</label>
                    <input className="form-input" required value={orderForm.customerName} onChange={(event) => setOrderForm({ ...orderForm, customerName: event.target.value })} />
                  </div>
                  <div className="form-group">
                    <label>Email</label>
                    <input className="form-input" type="email" required value={orderForm.customerEmail} onChange={(event) => setOrderForm({ ...orderForm, customerEmail: event.target.value })} />
                  </div>
                  <div className="form-group ticket-form-full">
                    <label>{c({ ua: 'Телефон', ru: 'Телефон', en: 'Phone' })}</label>
                    <input className="form-input" value={orderForm.customerPhone} onChange={(event) => setOrderForm({ ...orderForm, customerPhone: event.target.value })} />
                  </div>
                  <button className="btn btn-primary ticket-submit-btn" type="submit" disabled={sales.loading || !visibleTicketTypes.length}>
                    {sales.loading ? c({ ua: 'Створюємо...', ru: 'Создаём...', en: 'Creating...' }) : c({ ua: 'Оформити замовлення', ru: 'Оформить заказ', en: 'Place order' })}
                  </button>
                </form>
              ) : null}
            </div>
          ) : null}
          {sales.error ? <div className="state-msg state-error event-inline-state">{sales.error}</div> : null}
          {orderResult ? (
            <div className="state-msg state-success event-inline-state ticket-result-panel">
              <p>
                {orderStatus?.status === 'PAID'
                  ? c({
                    ua: `Замовлення ${orderResult.orderNumber} оплачено. Квитки надіслані на email.`,
                    ru: `Заказ ${orderResult.orderNumber} оплачен. Билеты отправлены на email.`,
                    en: `Order ${orderResult.orderNumber} is paid. Tickets were sent by email.`
                  })
                  : c({
                    ua: `Замовлення ${orderResult.orderNumber} створено. Очікуємо підтвердження оплати.`,
                    ru: `Заказ ${orderResult.orderNumber} создан. Ожидаем подтверждения оплаты.`,
                    en: `Order ${orderResult.orderNumber} was created. Waiting for payment confirmation.`
                  })}
              </p>
              {orderStatus?.downloadUrl ? (
                <a className="btn btn-primary" href={orderStatus.downloadUrl}>
                  {c({ ua: 'Завантажити квитки PDF', ru: 'Скачать билеты PDF', en: 'Download tickets PDF' })}
                </a>
              ) : null}
              {orderStatus?.status !== 'PAID' && paymentUrl ? (
                <a className="btn btn-primary" href={paymentUrl} target="_blank" rel="noreferrer">
                  {c({ ua: 'Оплатити квитки', ru: 'Оплатить билеты', en: 'Pay for tickets' })}
                </a>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </>
  );
}
