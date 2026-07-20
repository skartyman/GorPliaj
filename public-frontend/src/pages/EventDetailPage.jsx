import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { eventsApi } from '../lib/api';
import { formatEventDateRange } from '../lib/events';
import { localizedCopy, localizeField } from '../lib/i18n';
import { useMeta } from '../hooks/useMeta';
import { useLocale } from '../state/locale';
import { sanitizeRichText } from '../lib/richText';
import { captureAnalytics, captureException } from '../lib/analytics';
import PhoneInput from '../components/PhoneInput';

function formatSessionRange(session, locale) {
  if (!session?.startsAt) return '';
  const formatLocale = locale === 'en' ? 'en-US' : (locale === 'ua' ? 'uk-UA' : 'ru-RU');
  const start = new Date(session.startsAt);
  const end = new Date(session.endsAt);
  const datePart = start.toLocaleDateString(formatLocale, {
    timeZone: 'Europe/Kyiv',
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });
  const startTime = start.toLocaleTimeString(formatLocale, { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Kyiv' });
  const endTime = end.toLocaleTimeString(formatLocale, { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Kyiv' });
  return `${datePart}, ${startTime} - ${endTime}`;
}

function getSessionDateKey(session) {
  if (!session?.startsAt) return '';
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Kyiv',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(new Date(session.startsAt));
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
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
  const [ticketFormOpen, setTicketFormOpen] = useState(false);
  const c = (values) => localizedCopy(values, locale);
  const metaTitle = localizeField(state.event?.title, locale);
  const metaDescription = localizeField(state.event?.shortDescription, locale);
  useMeta(state.event ? `${metaTitle} · GorPliaj` : 'Event · GorPliaj', metaDescription || 'Event details.');

  const isDisco80s = useMemo(() => {
    if (!state.event) return false;
    const slugLower = (state.event.slug || '').toLowerCase();
    
    if (slugLower.includes('disco') || slugLower.includes('disko')) {
      if (slugLower.includes('80')) {
        return true;
      }
    }
    
    const titleObj = state.event.title || {};
    const titlesToCheck = typeof titleObj === 'string' 
      ? [titleObj] 
      : [titleObj.ua, titleObj.ru, titleObj.en].filter(Boolean);
      
    return titlesToCheck.some(t => {
      const tLower = t.toLowerCase();
      return (tLower.includes('диско') || tLower.includes('disco') || tLower.includes('дискотека')) && 
             (tLower.includes('80') || tLower.includes('восьмидесят'));
    });
  }, [state.event]);

  useEffect(() => {
    if (isDisco80s) {
      if (!window.fbq) {
        !(function (f, b, e, v, n, t, s) {
          if (f.fbq) return;
          n = f.fbq = function () {
            n.callMethod
              ? n.callMethod.apply(n, arguments)
              : n.queue.push(arguments);
          };
          if (!f._fbq) f._fbq = n;
          n.push = n;
          n.loaded = !0;
          n.version = '2.0';
          n.queue = [];
          t = b.createElement(e);
          t.async = !0;
          t.src = v;
          s = b.getElementsByTagName(e)[0];
          s.parentNode.insertBefore(t, s);
        })(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
        window.fbq('init', '1374599834512979');
      }
      window.fbq('track', 'PageView');
    }
  }, [isDisco80s]);

  useEffect(() => {
    if (!slug) return;
    eventsApi
      .bySlug(slug)
      .then((event) => {
        setState({ loading: false, error: '', event });
        captureAnalytics('event_viewed', { event_slug: slug, cta_type: event.ctaType });
      })
      .catch((err) => {
        setState({
          loading: false,
          error: c({
            ua: 'Не вдалося завантажити подію.',
            ru: 'Не удалось загрузить событие.',
            en: 'Failed to load event.'
          }),
          event: null
        });
        captureException(err, { event_slug: slug });
      });
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
          eventSessionId: sessions.some((session) => String(session.id) === String(current.eventSessionId))
            ? current.eventSessionId
            : defaultSessionId,
          ticketTypeId: defaultTypes.some((type) => String(type.id) === String(current.ticketTypeId))
            ? current.ticketTypeId
            : String(defaultTypes[0]?.id || ticketTypes[0]?.id || '')
        }));
      })
      .catch((error) => setSales({ loading: false, error: error.message, ticketTypes: [], sessions: [] }));
  }, [slug, state.event]);

  useEffect(() => {
    if (orderStatus?.status === 'PAID') {
      captureAnalytics('ticket_payment_completed', { event_slug: slug, order_number: orderResult?.orderNumber });
    }
  }, [orderStatus?.status]);

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
    setOrderStatus({
      status: 'PAID',
      amount: null,
      currency: 'UAH',
      downloadUrl: `/api/ticket-orders/${encodeURIComponent(orderNumber)}/pdf?token=${encodeURIComponent(downloadToken)}`,
      pdfReady: false
    });
    setTicketFormOpen(true);
  }, [searchParams]);

  useEffect(() => {
    if (searchParams.get('focus') !== 'tickets') return;
    if (!state.event || !['TICKETS', 'BOTH'].includes(state.event.ctaType)) return;
    setTicketFormOpen(true);
  }, [searchParams, state.event]);

  useEffect(() => {
    if (!ticketFormOpen) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [ticketFormOpen]);

  const visibleTicketTypes = useMemo(() => {
    if (!sales.sessions.length) return sales.ticketTypes;
    return sales.ticketTypes.filter((type) => String(type.eventSessionId || '') === String(orderForm.eventSessionId || ''));
  }, [sales.sessions, sales.ticketTypes, orderForm.eventSessionId]);

  const selectedTicketType = useMemo(() => {
    if (!visibleTicketTypes.length) return null;
    return visibleTicketTypes.find((type) => String(type.id) === String(orderForm.ticketTypeId)) || visibleTicketTypes[0];
  }, [visibleTicketTypes, orderForm.ticketTypeId]);

  const selectedEventSession = useMemo(
    () => sales.sessions.find((session) => String(session.id) === String(orderForm.eventSessionId)) || null,
    [sales.sessions, orderForm.eventSessionId]
  );
  const selectedSessionIsFree = selectedEventSession?.admissionMode === 'FREE';
  const hasFreeSession = sales.sessions.some((session) => session.admissionMode === 'FREE')
    || state.event?.sessions?.some((session) => session.admissionMode === 'FREE');

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

    captureAnalytics('ticket_order_submitted', {
      event_slug: slug,
      ticket_type_id: selectedTicketType.id,
      quantity: orderForm.quantity,
      session_id: orderForm.eventSessionId || undefined
    });

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
      setOrderResult(result.order);
      setSales((current) => ({ ...current, loading: false }));
      if (result.order?.paymentUrl) {
        window.location.assign(result.order.paymentUrl);
      }
    } catch (error) {
      captureException(error, { event_slug: slug });
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
  const selectedSessionBookingUrl = `${bookingUrl}${selectedEventSession ? `&date=${encodeURIComponent(getSessionDateKey(selectedEventSession))}` : ''}`;

  return (
    <>
      {isDisco80s && (
        <noscript>
          <img
            height="1"
            width="1"
            style={{ display: 'none' }}
            src="https://www.facebook.com/tr?id=1374599834512979&ev=PageView&noscript=1"
            alt=""
          />
        </noscript>
      )}
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
            {(event.ctaType === 'TICKETS' || event.ctaType === 'BOTH') && event.ticketUrl && !hasFreeSession ? (
              <a className="btn btn-secondary" href={event.ticketUrl} target="_blank" rel="noreferrer">
                {c({ ua: 'Купити квиток', ru: 'Купить билет', en: 'Buy ticket' })}
              </a>
            ) : null}
            {(event.ctaType === 'TICKETS' || event.ctaType === 'BOTH') && (!event.ticketUrl || hasFreeSession) ? (
              <button type="button" className="btn btn-secondary" onClick={() => { setTicketFormOpen(true); captureAnalytics('ticket_form_opened', { event_slug: slug }); }}>
                {hasFreeSession
                  ? c({ ua: 'Обрати дату', ru: 'Выбрать дату', en: 'Choose a date' })
                  : c({ ua: 'Купити квиток', ru: 'Купить билет', en: 'Buy ticket' })}
              </button>
            ) : null}
          </div>

          {(event.ctaType === 'TICKETS' || event.ctaType === 'BOTH') && ticketFormOpen ? createPortal(
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
                    {!sales.loading && !sales.ticketTypes.length && !hasFreeSession && !sales.error ? (
                      <div className="state-msg">
                        {c({
                          ua: 'Продаж квитків для цієї події ще не відкритий.',
                          ru: 'Продажа билетов для этого события еще не открыта.',
                          en: 'Ticket sales for this event are not open yet.'
                        })}
                      </div>
                    ) : null}
                    {sales.sessions.length ? (
                      <div className="form-grid ticket-order-form">
                        <div className="form-group ticket-form-head">
                          <h2>{c({ ua: 'Оберіть дату події', ru: 'Выберите дату события', en: 'Choose an event date' })}</h2>
                        </div>
                        <div className="form-group">
                          <label>{c({ ua: 'Дата події', ru: 'Дата события', en: 'Event date' })}</label>
                          <select
                            className="form-input"
                            value={orderForm.eventSessionId}
                            onChange={(eventValue) => {
                              const nextSessionId = eventValue.target.value;
                              const nextTypes = sales.ticketTypes.filter((type) => String(type.eventSessionId || '') === String(nextSessionId || ''));
                              setOrderForm((current) => ({
                                ...current,
                                eventSessionId: nextSessionId,
                                ticketTypeId: String(nextTypes[0]?.id || '')
                              }));
                            }}
                            required
                          >
                            {sales.sessions.map((session) => (
                              <option key={session.id} value={session.id}>
                                {localizeField(session.name, locale) || formatSessionRange(session, locale)} · {session.admissionMode === 'FREE'
                                  ? c({ ua: 'вхід вільний', ru: 'вход свободный', en: 'free entry' })
                                  : c({ ua: 'за квитком', ru: 'по билету', en: 'ticket required' })}
                              </option>
                            ))}
                          </select>
                        </div>
                        {selectedSessionIsFree ? (
                          <div className="ticket-type-summary">
                            <div>
                              <strong>{c({ ua: 'Вхід вільний', ru: 'Вход свободный', en: 'Free entry' })}</strong>
                              <p className="muted">{c({
                                ua: 'Купувати вхідний квиток не потрібно. Оберіть столик на мапі та оформіть бронювання.',
                                ru: 'Покупать входной билет не нужно. Выберите стол на карте и оформите бронирование.',
                                en: 'No entry ticket is needed. Choose a table on the map and complete your booking.'
                              })}</p>
                            </div>
                            <Link className="btn btn-primary" to={selectedSessionBookingUrl} onClick={() => setTicketFormOpen(false)}>
                              {c({ ua: 'Обрати столик', ru: 'Выбрать стол', en: 'Choose a table' })}
                            </Link>
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                    {!sales.loading && sales.sessions.length > 0 && orderForm.eventSessionId && !visibleTicketTypes.length && !selectedSessionIsFree && !sales.error ? (
                      <div className="state-msg">
                        {c({
                          ua: 'Для обраної дати квитки ще не налаштовані. Оберіть іншу дату або зверніться до адміністратора.',
                          ru: 'Для выбранной даты билеты еще не настроены. Выберите другую дату или обратитесь к администратору.',
                          en: 'Tickets have not been configured for the selected date yet. Choose another date or contact the venue.'
                        })}
                      </div>
                    ) : null}
                    {!selectedSessionIsFree && sales.ticketTypes.length ? (
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
                        <div className="form-group">
                          <label>{c({ ua: 'Кількість', ru: 'Количество', en: 'Quantity' })}</label>
                          <div className="guest-stepper-row">
                            <div className="guest-stepper">
                              <button type="button" className="guest-stepper-btn" onClick={() => setOrderForm((current) => ({ ...current, quantity: Math.max(1, Number(current.quantity) - 1) }))}>−</button>
                              <span className="guest-stepper-value">{orderForm.quantity}</span>
                              <button type="button" className="guest-stepper-btn" onClick={() => setOrderForm((current) => ({ ...current, quantity: Math.min(20, Number(current.quantity) + 1) }))}>+</button>
                            </div>
                            {selectedTicketType && (
                              <span className="ticket-total-price">
                                {Number(selectedTicketType.price) * Number(orderForm.quantity)} {selectedTicketType.currency}
                              </span>
                            )}
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
                        <div className="form-group ticket-email-field">
                          <label>Email</label>
                          <input
                            className="form-input"
                            type="email"
                            required
                            aria-describedby="ticket-email-note"
                            value={orderForm.customerEmail}
                            onChange={(eventValue) => setOrderForm({ ...orderForm, customerEmail: eventValue.target.value })}
                          />
                          <p className="ticket-email-note" id="ticket-email-note">
                            <span aria-hidden="true">i</span>
                            {c({
                              ua: 'Вкажіть правильний email - на нього надійдуть лист і квитки.',
                              ru: 'Укажите правильный email - на него придут письмо и билеты.',
                              en: 'Use a valid email address - your confirmation and tickets will be sent there.'
                            })}
                          </p>
                        </div>
                        <div className="form-group">
                          <label>{c({ ua: 'Телефон', ru: 'Телефон', en: 'Phone' })}</label>
                          <PhoneInput
                            value={orderForm.customerPhone}
                            onChange={(v) => setOrderForm({ ...orderForm, customerPhone: v })}
                            required
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
                    {orderStatus?.downloadUrl && orderStatus?.pdfReady ? (
                      <div className="guest-modal-actions" style={{ marginBottom: 16 }}>
                        <a className="btn btn-primary" href={orderStatus.downloadUrl}>
                          {c({ ua: 'Завантажити квитки PDF', ru: 'Скачать билеты PDF', en: 'Download tickets PDF' })}
                        </a>
                      </div>
                    ) : null}
                    {orderStatus?.status === 'PAID' && !orderStatus?.pdfReady ? (
                      <div className="guest-modal-actions" style={{ marginBottom: 16 }}>
                        <p className="state-msg">
                          {c({ ua: 'Формуємо файл для завантаження...', ru: 'Формируем файл для загрузки...', en: 'Preparing your download...' })}
                        </p>
                      </div>
                    ) : null}
                    {orderStatus?.status !== 'PAID' && paymentUrl ? (
                      <a className="btn btn-primary" href={paymentUrl}>
                        {c({ ua: 'Перейти до оплати', ru: 'Перейти к оплате', en: 'Continue to payment' })}
                      </a>
                    ) : null}
                    {orderStatus?.status === 'PAID' ? (
                      <>
                        <span className="guest-modal-kicker">{c({ ua: 'Оплата успішна', ru: 'Оплата прошла', en: 'Payment successful' })}</span>
                        <h2>{c({ ua: 'Дякуємо! Ваші квитки готові.', ru: 'Спасибо! Ваши билеты готовы.', en: 'Thank you! Your tickets are ready.' })}</h2>
                        <p>{c({ ua: 'Завантажте квитки у PDF, перегляньте меню або забронюйте стіл на вечір.', ru: 'Скачайте билеты в PDF, посмотрите меню или забронируйте стол на вечер.', en: 'Download your PDF tickets, browse the menu, or book a table for the evening.' })}</p>
                        <div className="guest-modal-actions">
                          {(event.ctaType === 'BOOKING' || event.ctaType === 'BOTH') ? (
                            <Link className="btn btn-primary" to={bookingUrl} onClick={() => setTicketFormOpen(false)}>
                              {c({ ua: 'Забронювати стіл', ru: 'Забронировать стол', en: 'Book a table' })}
                            </Link>
                          ) : null}
                          <Link className="btn btn-secondary" to="/menu" onClick={() => setTicketFormOpen(false)}>
                            {c({ ua: 'Переглянути меню', ru: 'Посмотреть меню', en: 'View menu' })}
                          </Link>
                          {orderStatus?.downloadUrl && orderStatus?.pdfReady ? (
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
            </div>,
            document.body
          ) : null}
        </div>
      </div>

    </>
  );
}
