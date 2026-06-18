import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { bookingsApi, eventsApi, mapApi } from '../lib/api';
import { getPublicMapData } from '../lib/map';
import { localizedCopy, localizeField } from '../lib/i18n';
import { useLocale } from '../state/locale';
import { useMeta } from '../hooks/useMeta';

function parseObjectMeta(metaJson) {
  try {
    const parsed = typeof metaJson === 'string' ? JSON.parse(metaJson) : metaJson;
    if (!parsed || typeof parsed !== 'object') return {};
    return {
      price: parsed.price ?? parsed.objectPrice ?? '',
      priceUnit: typeof parsed.priceUnit === 'string' ? parsed.priceUnit : 'UAH',
      depositRequired: Boolean(parsed.depositRequired),
      depositAmount: parsed.depositAmount ?? parsed.deposit ?? ''
    };
  } catch {
    return {};
  }
}

function toDateOnly(value) {
  if (!value) return '';
  return new Date(value).toISOString().slice(0, 10);
}

function money(value, currency = 'UAH') {
  return `${Number(value || 0).toFixed(0)} ${currency}`;
}

export default function BookingPage() {
  const { t, locale } = useLocale();
  const [searchParams] = useSearchParams();
  const today = new Date().toISOString().slice(0, 10);
  const eventSlug = searchParams.get('event') || '';
  const returnedReservationCode = searchParams.get('reservation') || '';
  const returnedReservationToken = searchParams.get('t') || '';

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [mapName, setMapName] = useState('');
  const [tableOptions, setTableOptions] = useState([]);
  const [selectedObjectName, setSelectedObjectName] = useState('');
  const [selectedObjectMeta, setSelectedObjectMeta] = useState({});
  const [paymentUrl, setPaymentUrl] = useState('');
  const [reservationAccess, setReservationAccess] = useState(null);
  const [reservationStatus, setReservationStatus] = useState(null);
  const [eventInfo, setEventInfo] = useState(null);
  const [ticketTypes, setTicketTypes] = useState([]);
  const [selected, setSelected] = useState({
    mapId: Number(searchParams.get('mapId') || '0'),
    zoneId: Number(searchParams.get('zoneId') || '0'),
    tableId: Number(searchParams.get('tableId') || '0'),
    objectId: Number(searchParams.get('objectId') || '0')
  });
  const [form, setForm] = useState({
    date: searchParams.get('date') || today,
    guests: Number(searchParams.get('guests') || '2'),
    timeFrom: searchParams.get('timeFrom') || '12:00',
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    commentCustomer: ''
  });
  const c = (values) => localizedCopy(values, locale);

  useMeta(`${t('bookingTitle')} · GorPliaj`, c({
    ua: 'Онлайн-бронювання столу.',
    ru: 'Онлайн-бронирование стола.',
    en: 'Online table booking.'
  }));

  useEffect(() => {
    if (!eventSlug) return;

    let ignore = false;
    Promise.all([
      eventsApi.bySlug(eventSlug).catch(() => null),
      eventsApi.ticketTypes(eventSlug).catch(() => ({ ticketTypes: [] }))
    ]).then(([event, tickets]) => {
      if (ignore) return;
      setEventInfo(event);
      setTicketTypes(Array.isArray(tickets?.ticketTypes) ? tickets.ticketTypes : []);
      if (event?.startAt && !searchParams.get('date')) {
        setForm((current) => ({ ...current, date: toDateOnly(event.startAt) }));
      }
    });

    return () => {
      ignore = true;
    };
  }, [eventSlug]);

  useEffect(() => {
    async function loadMap() {
      setLoading(true);
      setErrorMessage('');

      try {
        const requestedMapId = Number(searchParams.get('mapId') || '0');
        const requestedObjectId = Number(searchParams.get('objectId') || '0');
        const result = await getPublicMapData(mapApi, { date: form.date, timeFrom: form.timeFrom, mapId: requestedMapId || '' });
        const options = result.map.zones.flatMap((zone) =>
          zone.tables
            .filter((table) => table.status === 'free' && form.guests >= table.seatsMin && form.guests <= table.seatsMax)
            .map((table) => ({ ...table, zoneId: zone.id }))
        );

        setMapName(localizeField(result.map.name, locale));
        setTableOptions(options);
        const linkedObject = requestedObjectId ? result.map.objects.find((object) => Number(object.id) === requestedObjectId) : null;
        const linkedTableId = Number(linkedObject?.tableId) || 0;
        setSelectedObjectName(linkedObject ? localizeField(linkedObject.label, locale) || linkedObject.type || '' : '');
        setSelectedObjectMeta(linkedObject ? parseObjectMeta(linkedObject.metaJson) : {});
        setSelected((current) => {
          const selectedTable = linkedTableId
            ? options.find((table) => table.id === linkedTableId)
            : options.find((table) => table.id === current.tableId) || options[0];
          return {
            mapId: current.mapId || result.map.id,
            zoneId: selectedTable?.zoneId || current.zoneId,
            tableId: selectedTable?.id || 0,
            objectId: current.objectId || requestedObjectId
          };
        });
      } catch {
        setErrorMessage(c({ ua: 'Не вдалося завантажити доступні столи.', ru: 'Не удалось загрузить доступные столы.', en: 'Failed to load available tables.' }));
      } finally {
        setLoading(false);
      }
    }

    loadMap();
  }, [form.date, form.guests, form.timeFrom]);

  useEffect(() => {
    if (!returnedReservationCode || !returnedReservationToken) return;

    setReservationAccess({ ticketCode: returnedReservationCode, token: returnedReservationToken });
    bookingsApi.status(returnedReservationCode, returnedReservationToken)
      .then((result) => {
        setReservationStatus(result);
        if (result.downloadUrl) {
          setSuccessMessage(c({ ua: 'Оплату підтверджено. PDF бронювання готовий.', ru: 'Оплата подтверждена. PDF бронирования готов.', en: 'Payment confirmed. Booking PDF is ready.' }));
        } else {
          setSuccessMessage(c({ ua: 'Повернулися з оплати. Очікуємо підтвердження платежу.', ru: 'Вернулись из оплаты. Ожидаем подтверждение платежа.', en: 'Returned from payment. Waiting for payment confirmation.' }));
        }
      })
      .catch((error) => setErrorMessage(error.message));
  }, [returnedReservationCode, returnedReservationToken]);

  const selectedTable = useMemo(
    () => tableOptions.find((table) => table.id === Number(selected.tableId)),
    [selected.tableId, tableOptions]
  );

  const entryTicketType = useMemo(() => {
    if (!eventInfo?.startAt || toDateOnly(eventInfo.startAt) !== form.date) return null;
    return ticketTypes[0] || null;
  }, [eventInfo, form.date, ticketTypes]);

  const paymentPreview = useMemo(() => {
    const tableDeposit = Number(selectedTable?.deposit || 0);
    const objectDeposit = Number(selectedObjectMeta.depositAmount || 0);
    const depositAmount = tableDeposit > 0 ? tableDeposit : objectDeposit;
    const entryTicketPrice = Number(entryTicketType?.price || 0);
    const entryTicketsAmount = entryTicketPrice > 0 ? entryTicketPrice * Number(form.guests || 0) : 0;
    return {
      depositAmount,
      entryTicketPrice,
      entryTicketsAmount,
      totalAmount: depositAmount + entryTicketsAmount,
      currency: entryTicketType?.currency || 'UAH'
    };
  }, [selectedObjectMeta.depositAmount, selectedTable, entryTicketType, form.guests]);

  async function submitBooking(event) {
    event.preventDefault();
    if (!selected.tableId || !selected.mapId || !selected.zoneId) {
      setErrorMessage(c({ ua: 'Перед відправленням оберіть стіл.', ru: 'Перед отправкой выберите стол.', en: 'Please select a table before submitting.' }));
      return;
    }

    setSubmitting(true);
    setErrorMessage('');
    setSuccessMessage('');
    setPaymentUrl('');
    setReservationStatus(null);

    try {
      const objectNote = selected.objectId && selectedObjectName ? `Object: ${selectedObjectName} (#${selected.objectId})` : '';
      const commentCustomer = [objectNote, form.commentCustomer].filter(Boolean).join('\n\n');
      const result = await bookingsApi.create({
        tableId: selected.tableId,
        mapId: selected.mapId,
        zoneId: selected.zoneId,
        customerName: form.customerName,
        customerPhone: form.customerPhone,
        customerEmail: form.customerEmail,
        guests: form.guests,
        reservationDate: form.date,
        timeFrom: form.timeFrom,
        timeTo: '23:00',
        objectId: selected.objectId || undefined,
        eventSlug: eventSlug || undefined,
        commentCustomer
      });

      setPaymentUrl(result.paymentUrl || '');
      setReservationAccess(result.access || null);
      setSuccessMessage(result.paymentUrl
        ? c({
          ua: 'Бронювання створено. Завершіть оплату, щоб закріпити позицію.',
          ru: 'Бронирование создано. Завершите оплату, чтобы закрепить позицию.',
          en: 'Booking created. Complete the payment to secure it.'
        })
        : c({
          ua: 'Заявку на бронювання створено. Оплата не потрібна.',
          ru: 'Заявка на бронирование создана. Оплата не требуется.',
          en: 'Booking request created. No payment is required.'
        }));
    } catch (error) {
      setErrorMessage(error.message || c({ ua: 'Не вдалося створити бронювання.', ru: 'Не удалось создать бронирование.', en: 'Failed to create booking.' }));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <div className="section-header">
        <div>
          <h1>{c({ ua: 'Бронювання столу', ru: 'Бронирование стола', en: 'Book a table' })}</h1>
          <p className="muted">
            {c({
              ua: 'Бронювання столу безкоштовне. Якщо для позиції задано депозит, він оплачується онлайн і враховується у фінальному чеку в закладі.',
              ru: 'Бронь стола бесплатная. Если для позиции задан депозит, он оплачивается онлайн и учитывается в финальном чеке в заведении.',
              en: 'Table booking is free. If a deposit is configured for the position, it is paid online and credited toward your final venue bill.'
            })}
          </p>
        </div>
      </div>

      {eventSlug ? (
        <div className="booking-object-summary" style={{ marginBottom: 24 }}>
          <p className="muted" style={{ margin: 0 }}>
            {c({ ua: 'Бронювання для події', ru: 'Бронирование для события', en: 'Booking for event' })}: <strong>{localizeField(eventInfo?.title, locale) || eventSlug}</strong>
          </p>
          {entryTicketType ? (
            <p className="muted" style={{ margin: 0 }}>
              {c({ ua: 'У день події до депозиту додаються вхідні квитки', ru: 'В день события к депозиту добавляются входные билеты', en: 'On the event day, entry tickets are added to the deposit' })}: {form.guests} x {money(entryTicketType.price, entryTicketType.currency)}
            </p>
          ) : null}
        </div>
      ) : null}

      <form onSubmit={submitBooking} className="form-grid">
        <div className="form-group">
          <label>{c({ ua: 'Дата', ru: 'Дата', en: 'Date' })}</label>
          <input type="date" className="form-input" value={form.date} min={today} required onChange={(event) => setForm((current) => ({ ...current, date: event.target.value }))} />
        </div>

        <div className="form-group">
          <label>{c({ ua: 'Гостей', ru: 'Гостей', en: 'Guests' })}</label>
          <input type="number" className="form-input" value={form.guests} min="1" max="20" required onChange={(event) => setForm((current) => ({ ...current, guests: Number(event.target.value) }))} />
        </div>

        <div className="form-group">
          <label>{c({ ua: 'Час початку', ru: 'Время начала', en: 'Start time' })}</label>
          <input type="time" className="form-input" value={form.timeFrom} required onChange={(event) => setForm((current) => ({ ...current, timeFrom: event.target.value }))} />
        </div>

        <div className="form-group" style={{ gridColumn: '1 / -1' }}>
          {selected.objectId && selectedObjectName ? (
            <div className="booking-object-summary">
              <p className="muted" style={{ margin: 0 }}>
                {c({ ua: 'Обраний обʼєкт', ru: 'Выбранный объект', en: 'Selected object' })}: <strong>{selectedObjectName}</strong>
              </p>
              {selectedObjectMeta.price !== '' && selectedObjectMeta.price !== null && selectedObjectMeta.price !== undefined ? (
                <p className="muted" style={{ margin: 0 }}>{c({ ua: 'Ціна', ru: 'Цена', en: 'Price' })}: {selectedObjectMeta.price} {selectedObjectMeta.priceUnit || 'UAH'}</p>
              ) : null}
            </div>
          ) : null}
          <label>{c({ ua: 'Доступні столи', ru: 'Доступные столы', en: 'Available tables' })} ({mapName || c({ ua: 'карта', ru: 'карта', en: 'map' })})</label>
          <select
            className="form-input"
            value={selected.tableId}
            onChange={(event) => {
              const nextTable = tableOptions.find((table) => table.id === Number(event.target.value));
              setSelected((current) => ({
                ...current,
                tableId: Number(event.target.value),
                zoneId: nextTable?.zoneId || current.zoneId
              }));
            }}
          >
            {!tableOptions.length ? <option value="">{c({ ua: 'Немає вільних столів під ці параметри', ru: 'Нет свободных столов под эти параметры', en: 'No free tables for these parameters' })}</option> : null}
            {tableOptions.map((table) => (
              <option key={table.id} value={table.id}>
                {localizeField(table.name, locale) || table.code} ({table.seatsMin}-{table.seatsMax} {c({ ua: 'місць', ru: 'мест', en: 'seats' })}) · {Number(table.deposit || 0) > 0 ? money(table.deposit) : c({ ua: 'без депозиту', ru: 'без депозита', en: 'no deposit' })}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>{c({ ua: 'Імʼя', ru: 'Имя', en: 'Name' })}</label>
          <input type="text" className="form-input" value={form.customerName} required minLength="2" onChange={(event) => setForm((current) => ({ ...current, customerName: event.target.value }))} />
        </div>

        <div className="form-group">
          <label>{c({ ua: 'Телефон', ru: 'Телефон', en: 'Phone' })}</label>
          <input type="tel" className="form-input" value={form.customerPhone} required minLength="7" onChange={(event) => setForm((current) => ({ ...current, customerPhone: event.target.value }))} />
        </div>

        <div className="form-group" style={{ gridColumn: '1 / -1' }}>
          <label>Email</label>
          <input type="email" className="form-input" value={form.customerEmail} required={paymentPreview.totalAmount > 0} onChange={(event) => setForm((current) => ({ ...current, customerEmail: event.target.value }))} />
        </div>

        <div className="form-group" style={{ gridColumn: '1 / -1' }}>
          <div className="booking-object-summary">
            <p className="muted" style={{ margin: 0 }}>
              <strong>{c({ ua: 'До оплати зараз', ru: 'К оплате сейчас', en: 'Due now' })}: {money(paymentPreview.totalAmount, paymentPreview.currency)}</strong>
            </p>
            <p className="muted" style={{ margin: 0 }}>
              {c({ ua: 'Депозит позиції', ru: 'Депозит позиции', en: 'Position deposit' })}: {paymentPreview.depositAmount > 0 ? money(paymentPreview.depositAmount, paymentPreview.currency) : c({ ua: 'не задано', ru: 'не задан', en: 'not configured' })}
            </p>
            {paymentPreview.entryTicketsAmount > 0 ? (
              <p className="muted" style={{ margin: 0 }}>
                {c({ ua: 'Вхідні квитки', ru: 'Входные билеты', en: 'Entry tickets' })}: {form.guests} x {money(paymentPreview.entryTicketPrice, paymentPreview.currency)} = {money(paymentPreview.entryTicketsAmount, paymentPreview.currency)}
              </p>
            ) : null}
            {paymentPreview.depositAmount > 0 ? (
              <p className="muted" style={{ margin: 0 }}>
                {c({
                  ua: 'Депозит не є окремою платою: його буде враховано у фінальному чеку в закладі.',
                  ru: 'Депозит не является отдельной платой: он будет учтен в финальном чеке в заведении.',
                  en: 'The deposit is not a separate fee: it is credited toward your final venue bill.'
                })}
              </p>
            ) : (
              <p className="muted" style={{ margin: 0 }}>
                {c({
                  ua: 'Для цієї позиції депозит не встановлено, тому бронювання столу безкоштовне.',
                  ru: 'Для этой позиции депозит не установлен, поэтому бронь бесплатная.',
                  en: 'No deposit is configured for this position, so the booking is free.'
                })}
              </p>
            )}
          </div>
        </div>

        <div className="form-group" style={{ gridColumn: '1 / -1' }}>
          <label>{c({ ua: 'Коментар', ru: 'Комментарий', en: 'Comment' })}</label>
          <textarea className="form-input" rows="3" value={form.commentCustomer} onChange={(event) => setForm((current) => ({ ...current, commentCustomer: event.target.value }))} />
        </div>

        <div className="btn-group">
          <button type="submit" className="btn btn-primary" disabled={loading || submitting || !tableOptions.length}>
            {submitting
              ? c({ ua: 'Створюємо бронювання...', ru: 'Создаем бронирование...', en: 'Creating booking...' })
              : paymentPreview.totalAmount > 0
                ? c({ ua: 'Оформити та оплатити', ru: 'Оформить и оплатить', en: 'Book and pay' })
                : c({ ua: 'Забронювати без оплати', ru: 'Забронировать без оплаты', en: 'Book without payment' })}
          </button>
          {paymentUrl ? (
            <a className="btn btn-primary" href={paymentUrl}>
              {c({ ua: 'Перейти до оплати', ru: 'Перейти к оплате', en: 'Go to payment' })}
            </a>
          ) : null}
          {reservationStatus?.downloadUrl ? (
            <a className="btn btn-secondary" href={reservationStatus.downloadUrl}>
              {c({ ua: 'Завантажити PDF', ru: 'Скачать PDF', en: 'Download PDF' })}
            </a>
          ) : null}
          {!reservationStatus?.downloadUrl && reservationAccess?.ticketCode && reservationAccess?.token ? (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => bookingsApi.status(reservationAccess.ticketCode, reservationAccess.token).then(setReservationStatus).catch((error) => setErrorMessage(error.message))}
            >
              {c({ ua: 'Перевірити оплату', ru: 'Проверить оплату', en: 'Check payment' })}
            </button>
          ) : null}
        </div>

        {loading && <div className="state-msg">{c({ ua: 'Оновлюємо дані...', ru: 'Обновляем данные...', en: 'Updating data...' })}</div>}
        {errorMessage && <div className="state-msg state-error">{errorMessage}</div>}
        {successMessage && <div className="state-msg state-success">{successMessage}</div>}
      </form>
    </>
  );
}
