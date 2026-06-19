import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { bookingsApi, eventsApi, mapApi } from '../lib/api';
import { localizedCopy, localizeField } from '../lib/i18n';
import { useLocale } from '../state/locale';
import { useMeta } from '../hooks/useMeta';

function toDateOnly(value) {
  if (!value) return '';
  return new Date(value).toISOString().slice(0, 10);
}

function money(value, currency = 'UAH') {
  return `${Number(value || 0).toFixed(0)} ${currency}`;
}

function getUnitDisplayName(unit, locale) {
  return localizeField(unit?.name, locale) || localizeField(unit?.label, locale) || unit?.code || unit?.id || '';
}

const BOOKING_KIND_OPTIONS = [
  {
    value: 'TABLE',
    copy: {
      ua: { title: 'Стіл', body: 'Ресторан, тераса, вечірні посадки та події.' },
      ru: { title: 'Стол', body: 'Ресторан, терраса, вечерние посадки и события.' },
      en: { title: 'Table', body: 'Restaurant, terrace, evening seating and events.' }
    }
  },
  {
    value: 'BEACH',
    copy: {
      ua: { title: 'Пляжний відпочинок', body: 'Бунгало, ліжка та інші пляжні послуги.' },
      ru: { title: 'Пляжный отдых', body: 'Бунгало, кровати и другие пляжные услуги.' },
      en: { title: 'Beach leisure', body: 'Bungalows, beds and other beach services.' }
    }
  }
];

export default function BookingPage() {
  const { locale } = useLocale();
  const [searchParams] = useSearchParams();
  const today = new Date().toISOString().slice(0, 10);
  const eventSlug = searchParams.get('event') || '';
  const returnedReservationCode = searchParams.get('reservation') || '';
  const returnedReservationToken = searchParams.get('t') || '';
  const c = (values) => localizedCopy(values, locale);

  const [bookingKind, setBookingKind] = useState(searchParams.get('kind') === 'BEACH' ? 'BEACH' : 'TABLE');
  const [mapsState, setMapsState] = useState({ loading: true, error: '', maps: [] });
  const [unitsState, setUnitsState] = useState({ loading: false, error: '', map: null, zones: [], units: [] });
  const [selected, setSelected] = useState({
    mapId: Number(searchParams.get('mapId') || '0'),
    zoneId: Number(searchParams.get('zoneId') || '0'),
    bookableUnitId: searchParams.get('bookableUnitId') || ''
  });
  const [form, setForm] = useState({
    date: searchParams.get('date') || today,
    guests: Number(searchParams.get('guests') || '2'),
    timeFrom: searchParams.get('timeFrom') || '12:00',
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    commentCustomer: '',
    agreeRules: false,
    agreePrivacy: false
  });
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [paymentUrl, setPaymentUrl] = useState('');
  const [reservationAccess, setReservationAccess] = useState(null);
  const [reservationStatus, setReservationStatus] = useState(null);
  const [eventInfo, setEventInfo] = useState(null);
  const [ticketTypes, setTicketTypes] = useState([]);

  const usageMode = eventSlug ? 'EVENING' : 'DAY';

  useMeta(
    bookingKind === 'BEACH'
      ? `${c({ ua: 'Бронювання пляжного відпочинку', ru: 'Бронирование пляжного отдыха', en: 'Book beach leisure' })} · GorPliaj`
      : `${c({ ua: 'Бронювання столу', ru: 'Бронирование стола', en: 'Book a table' })} · GorPliaj`,
    c({
      ua: 'Оберіть формат відпочинку, зону, вільну позицію та перейдіть до оплати.',
      ru: 'Выберите формат отдыха, зону, свободную позицию и перейдите к оплате.',
      en: 'Choose a booking type, zone, free position and continue to payment.'
    })
  );

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
  }, [eventSlug, searchParams]);

  useEffect(() => {
    let cancelled = false;
    setMapsState({ loading: true, error: '', maps: [] });

    mapApi.list({ usageMode, bookingKind, guests: form.guests })
      .then((result) => {
        if (cancelled) return;
        const maps = Array.isArray(result?.maps) ? result.maps : [];
        setMapsState({ loading: false, error: '', maps });
        setSelected((current) => {
          const preferred = maps.find((item) => item.id === current.mapId) || maps.find((item) => item.isDefault) || maps[0];
          return {
            mapId: preferred?.id || 0,
            zoneId: current.zoneId,
            bookableUnitId: current.bookableUnitId
          };
        });
      })
      .catch((error) => {
        if (cancelled) return;
        setMapsState({ loading: false, error: error.message, maps: [] });
      });

    return () => {
      cancelled = true;
    };
  }, [usageMode, bookingKind, form.guests]);

  useEffect(() => {
    if (!selected.mapId) {
      setUnitsState({ loading: false, error: '', map: null, zones: [], units: [] });
      return;
    }

    let cancelled = false;
    setUnitsState((current) => ({ ...current, loading: true, error: '' }));

    mapApi.bookableUnits(selected.mapId, {
      date: form.date,
      timeFrom: form.timeFrom,
      guests: form.guests,
      bookingKind
    })
      .then((result) => {
        if (cancelled) return;
        const zones = Array.isArray(result?.zones) ? result.zones : [];
        const units = Array.isArray(result?.units) ? result.units : [];
        setUnitsState({ loading: false, error: '', map: result.map || null, zones, units });
        setSelected((current) => {
          const activeZone = zones.find((zone) => zone.id === current.zoneId && zone.totalCount > 0)
            || zones.find((zone) => zone.availableCount > 0)
            || zones.find((zone) => zone.totalCount > 0);
          const scopedUnits = units.filter((unit) => unit.zoneId === (activeZone?.id || current.zoneId));
          const activeUnit = scopedUnits.find((unit) => unit.id === current.bookableUnitId)
            || scopedUnits.find((unit) => unit.status === 'free')
            || scopedUnits[0];
          return {
            ...current,
            zoneId: activeZone?.id || 0,
            bookableUnitId: activeUnit?.id || ''
          };
        });
      })
      .catch((error) => {
        if (cancelled) return;
        setUnitsState({ loading: false, error: error.message, map: null, zones: [], units: [] });
      });

    return () => {
      cancelled = true;
    };
  }, [selected.mapId, form.date, form.timeFrom, form.guests, bookingKind]);

  useEffect(() => {
    if (!returnedReservationCode || !returnedReservationToken) return;

    setReservationAccess({ ticketCode: returnedReservationCode, token: returnedReservationToken });
    bookingsApi.status(returnedReservationCode, returnedReservationToken)
      .then((result) => {
        setReservationStatus(result);
        if (result.downloadUrl) {
          setSuccessMessage(c({
            ua: 'Оплату підтверджено. PDF бронювання готовий.',
            ru: 'Оплата подтверждена. PDF бронирования готов.',
            en: 'Payment confirmed. Booking PDF is ready.'
          }));
        } else {
          setSuccessMessage(c({
            ua: 'Повернулися з оплати. Очікуємо підтвердження платежу.',
            ru: 'Вернулись из оплаты. Ожидаем подтверждение платежа.',
            en: 'Returned from payment. Waiting for payment confirmation.'
          }));
        }
      })
      .catch((error) => setErrorMessage(error.message));
  }, [returnedReservationCode, returnedReservationToken, locale]);

  const selectedMap = useMemo(
    () => mapsState.maps.find((item) => item.id === selected.mapId) || null,
    [mapsState.maps, selected.mapId]
  );

  const filteredUnits = useMemo(
    () => unitsState.units.filter((unit) => !selected.zoneId || unit.zoneId === selected.zoneId),
    [unitsState.units, selected.zoneId]
  );

  const selectedUnit = useMemo(
    () => filteredUnits.find((unit) => unit.id === selected.bookableUnitId) || null,
    [filteredUnits, selected.bookableUnitId]
  );

  const entryTicketType = useMemo(() => {
    if (!eventInfo?.startAt || toDateOnly(eventInfo.startAt) !== form.date) return null;
    return ticketTypes[0] || null;
  }, [eventInfo, form.date, ticketTypes]);

  const paymentPreview = useMemo(() => {
    const depositAmount = Number(selectedUnit?.depositAmount || 0);
    const entryTicketPrice = Number(entryTicketType?.price || 0);
    const entryTicketsAmount = entryTicketPrice > 0 ? entryTicketPrice * Number(form.guests || 0) : 0;
    return {
      depositAmount,
      entryTicketPrice,
      entryTicketsAmount,
      totalAmount: depositAmount + entryTicketsAmount,
      currency: entryTicketType?.currency || 'UAH'
    };
  }, [selectedUnit, entryTicketType, form.guests]);

  const selectedZone = useMemo(
    () => unitsState.zones.find((zone) => zone.id === selected.zoneId) || null,
    [unitsState.zones, selected.zoneId]
  );

  function bookingKindTitle(value) {
    return value === 'BEACH'
      ? c({ ua: 'Пляжний відпочинок', ru: 'Пляжный отдых', en: 'Beach leisure' })
      : c({ ua: 'Стіл', ru: 'Стол', en: 'Table' });
  }

  function unitStatusLabel(status) {
    if (status === 'free') return c({ ua: 'Вільно', ru: 'Свободно', en: 'Free' });
    if (status === 'held') return c({ ua: 'Утримується', ru: 'Удерживается', en: 'Held' });
    if (status === 'busy') return c({ ua: 'Зайнято', ru: 'Занято', en: 'Busy' });
    return c({ ua: 'Недоступно', ru: 'Недоступно', en: 'Unavailable' });
  }

  function positionTypeLabel(value) {
    const type = String(value || '').toUpperCase();
    if (type === 'BUNGALOW') return c({ ua: 'Бунгало', ru: 'Бунгало', en: 'Bungalow' });
    if (type === 'KROVAT') return c({ ua: 'Ліжко', ru: 'Кровать', en: 'Daybed' });
    if (type === 'PIER') return c({ ua: 'Пірс', ru: 'Пирс', en: 'Pier' });
    if (type === 'SUNBED') return c({ ua: 'Шезлонг', ru: 'Шезлонг', en: 'Sunbed' });
    return bookingKindTitle(bookingKind);
  }

  async function submitBooking(event) {
    event.preventDefault();
    if (!selectedUnit) {
      setErrorMessage(c({
        ua: 'Спочатку оберіть вільну позицію.',
        ru: 'Сначала выберите свободную позицию.',
        en: 'Please choose an available position first.'
      }));
      return;
    }
    if (!form.agreeRules || !form.agreePrivacy) {
      setErrorMessage(c({
        ua: 'Потрібно погодитися з правилами та політикою.',
        ru: 'Нужно согласиться с правилами и политикой.',
        en: 'You need to accept the rules and policy.'
      }));
      return;
    }

    setSubmitting(true);
    setErrorMessage('');
    setSuccessMessage('');
    setPaymentUrl('');
    setReservationStatus(null);

    try {
      const result = await bookingsApi.create({
        mapId: selected.mapId,
        bookableUnitId: selectedUnit.id,
        bookingKind,
        customerName: form.customerName,
        customerPhone: form.customerPhone,
        customerEmail: form.customerEmail,
        guests: form.guests,
        reservationDate: form.date,
        timeFrom: form.timeFrom,
        commentCustomer: form.commentCustomer,
        eventSlug: eventSlug || undefined
      });

      setPaymentUrl(result.paymentUrl || '');
      setReservationAccess(result.access || null);
      setSuccessMessage(result.paymentUrl
        ? c({
          ua: 'Бронювання створено. Завершіть оплату, щоб закріпити позицію.',
          ru: 'Бронирование создано. Завершите оплату, чтобы закрепить позицию.',
          en: 'Booking created. Complete the payment to secure the position.'
        })
        : c({
          ua: 'Заявку на бронювання створено. Оплата не потрібна.',
          ru: 'Заявка на бронирование создана. Оплата не требуется.',
          en: 'Booking request created. No payment is required.'
        }));

      if (result.paymentUrl) {
        window.location.assign(result.paymentUrl);
        return;
      }
    } catch (error) {
      setErrorMessage(error.message || c({
        ua: 'Не вдалося створити бронювання.',
        ru: 'Не удалось создать бронирование.',
        en: 'Failed to create booking.'
      }));
    } finally {
      setSubmitting(false);
    }
  }

  const pageTitle = bookingKind === 'BEACH'
    ? c({ ua: 'Пляжний відпочинок', ru: 'Пляжный отдых', en: 'Beach leisure' })
    : c({ ua: 'Бронювання столу', ru: 'Бронирование стола', en: 'Table booking' });

  return (
    <>
      <div className="section-header">
        <div>
          <h1>{pageTitle}</h1>
          <p className="muted">
            {c({
              ua: 'Оберіть формат, зону та конкретну позицію. Якщо для неї передбачено депозит або квитки на подію, оплата відкриється на фінальному кроці.',
              ru: 'Выберите формат, зону и конкретную позицию. Если для нее предусмотрен депозит или билеты на событие, оплата откроется на финальном шаге.',
              en: 'Choose a format, zone and a specific position. If a deposit or event tickets apply, payment will open on the final step.'
            })}
          </p>
        </div>
      </div>

      {eventSlug ? (
        <div className="booking-summary-panel">
          <p className="muted" style={{ margin: 0 }}>
            {c({ ua: 'Бронювання для події', ru: 'Бронирование для события', en: 'Booking for event' })}: <strong>{localizeField(eventInfo?.title, locale) || eventSlug}</strong>
          </p>
        </div>
      ) : null}

      <form onSubmit={submitBooking} className="form-grid booking-flow-grid">
        <div className="form-group" style={{ gridColumn: '1 / -1' }}>
          <label>{c({ ua: '1. Формат відпочинку', ru: '1. Формат отдыха', en: '1. Booking type' })}</label>
          <div className="booking-kind-grid">
            {BOOKING_KIND_OPTIONS.map((option) => {
              const localized = option.copy[locale === 'ua' ? 'ua' : locale === 'ru' ? 'ru' : 'en'];
              return (
                <button
                  key={option.value}
                  type="button"
                  className={`booking-kind-card${bookingKind === option.value ? ' active' : ''}`}
                  onClick={() => {
                    setBookingKind(option.value);
                    setSelected({ mapId: 0, zoneId: 0, bookableUnitId: '' });
                  }}
                >
                  <strong>{localized.title}</strong>
                  <span>{localized.body}</span>
                </button>
              );
            })}
          </div>
        </div>

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
          <label>{c({ ua: '2. Карта розміщення', ru: '2. Карта размещения', en: '2. Venue map' })}</label>
          <div className="booking-map-grid">
            {mapsState.maps.map((map) => (
              <button
                key={map.id}
                type="button"
                className={`booking-map-card${selected.mapId === map.id ? ' active' : ''}`}
                onClick={() => setSelected((current) => ({ ...current, mapId: map.id, zoneId: 0, bookableUnitId: '' }))}
              >
                <strong>{localizeField(map.name, locale)}</strong>
                <span>{localizeField(map.description, locale) || (map.usageMode === 'EVENING' ? c({ ua: 'Вечірня карта', ru: 'Вечерняя карта', en: 'Evening map' }) : c({ ua: 'Денна карта', ru: 'Дневная карта', en: 'Day map' }))}</span>
                <span>{c({ ua: 'Доступно позицій', ru: 'Доступно позиций', en: 'Available positions' })}: {map.unitCounts?.total || 0}</span>
              </button>
            ))}
          </div>
          {mapsState.loading ? <div className="state-msg">{c({ ua: 'Завантажуємо карти...', ru: 'Загружаем карты...', en: 'Loading maps...' })}</div> : null}
          {mapsState.error ? <div className="state-msg state-error">{mapsState.error}</div> : null}
          {!mapsState.loading && !mapsState.error && !mapsState.maps.length ? (
            <div className="state-msg">
              {c({
                ua: 'Для цього формату та кількості гостей зараз немає доступних карт.',
                ru: 'Для этого формата и количества гостей сейчас нет доступных карт.',
                en: 'No venue maps are available for this booking type and guest count right now.'
              })}
            </div>
          ) : null}
        </div>

        <div className="form-group" style={{ gridColumn: '1 / -1' }}>
          <label>{c({ ua: '3. Оберіть зону', ru: '3. Выберите зону', en: '3. Choose a zone' })}</label>
          <div className="booking-zone-tabs">
            {unitsState.zones.map((zone) => (
              <button
                key={zone.id}
                type="button"
                className={`booking-zone-tab${selected.zoneId === zone.id ? ' active' : ''}`}
                disabled={!zone.totalCount}
                onClick={() => setSelected((current) => ({
                  ...current,
                  zoneId: zone.id,
                  bookableUnitId: unitsState.units.find((unit) => unit.zoneId === zone.id && unit.status === 'free')?.id || ''
                }))}
              >
                {localizeField(zone.name, locale)} <span>{zone.availableCount}</span>
              </button>
            ))}
          </div>
          {unitsState.loading ? <div className="state-msg">{c({ ua: 'Оновлюємо доступні позиції...', ru: 'Обновляем доступные позиции...', en: 'Refreshing available positions...' })}</div> : null}
          {unitsState.error ? <div className="state-msg state-error">{unitsState.error}</div> : null}
          {!unitsState.loading && !unitsState.error && !!selected.mapId && !unitsState.zones.length ? (
            <div className="state-msg">
              {c({
                ua: 'На цій карті ще немає зон для обраного формату.',
                ru: 'На этой карте еще нет зон для выбранного формата.',
                en: 'This map does not yet have zones for the selected booking type.'
              })}
            </div>
          ) : null}
        </div>

        <div className="form-group" style={{ gridColumn: '1 / -1' }}>
          <label>{c({ ua: '4. Вільні варіанти', ru: '4. Свободные варианты', en: '4. Available options' })}</label>
          <div className="booking-unit-grid">
            {filteredUnits.map((unit) => {
              const localizedName = getUnitDisplayName(unit, locale);
              return (
                <button
                  key={unit.id}
                  type="button"
                  className={`booking-unit-card${selected.bookableUnitId === unit.id ? ' active' : ''}`}
                  disabled={unit.status !== 'free'}
                  onClick={() => setSelected((current) => ({ ...current, bookableUnitId: unit.id }))}
                >
                  <div className="booking-unit-card-media">
                    {unit.photoUrl ? (
                      <img src={unit.photoUrl} alt={localizedName} />
                    ) : (
                      <div className="booking-unit-card-fallback">{localizedName}</div>
                    )}
                    <span className={`booking-unit-status status-${unit.status}`}>{unitStatusLabel(unit.status)}</span>
                  </div>
                  <div className="booking-unit-card-body">
                    <strong>{localizedName}</strong>
                    <span>{unit.code || positionTypeLabel(unit.positionType)}</span>
                    <span>{Number(unit.seatsMin)}-{Number(unit.seatsMax)} {c({ ua: 'гостей', ru: 'гостей', en: 'guests' })}</span>
                    <span>{unit.depositAmount > 0 ? `${c({ ua: 'Депозит', ru: 'Депозит', en: 'Deposit' })}: ${money(unit.depositAmount)}` : c({ ua: 'Без депозиту', ru: 'Без депозита', en: 'No deposit' })}</span>
                  </div>
                </button>
              );
            })}
            {!unitsState.loading && !filteredUnits.length ? (
              <div className="state-msg">
                {c({
                  ua: 'У цій зоні немає доступних позицій під обрані параметри.',
                  ru: 'В этой зоне нет доступных позиций под выбранные параметры.',
                  en: 'There are no available options in this zone for the selected parameters.'
                })}
              </div>
            ) : null}
          </div>
        </div>

        <div className="form-group" style={{ gridColumn: '1 / -1' }}>
          {selectedUnit ? (
            <div className="booking-selected-panel">
              <div className="booking-selected-copy">
                <span className="eyebrow">{c({ ua: 'Обрано', ru: 'Выбрано', en: 'Selected' })}</span>
                <strong>{getUnitDisplayName(selectedUnit, locale)}</strong>
                <span>
                  {[bookingKindTitle(bookingKind), selectedZone ? localizeField(selectedZone.name, locale) : '', selectedMap ? localizeField(selectedMap.name, locale) : '']
                    .filter(Boolean)
                    .join(' • ')}
                </span>
              </div>
              <div className="booking-selected-meta">
                <span>{positionTypeLabel(selectedUnit.positionType)}</span>
                <span>{Number(selectedUnit.seatsMin)}-{Number(selectedUnit.seatsMax)} {c({ ua: 'гостей', ru: 'гостей', en: 'guests' })}</span>
                <span>{selectedUnit.depositAmount > 0 ? `${c({ ua: 'Депозит', ru: 'Депозит', en: 'Deposit' })}: ${money(selectedUnit.depositAmount, paymentPreview.currency)}` : c({ ua: 'Без депозиту', ru: 'Без депозита', en: 'No deposit' })}</span>
              </div>
            </div>
          ) : null}
          <div className="booking-summary-panel">
            <p className="muted" style={{ margin: 0 }}>
              <strong>{c({ ua: 'До оплати зараз', ru: 'К оплате сейчас', en: 'Due now' })}: {money(paymentPreview.totalAmount, paymentPreview.currency)}</strong>
            </p>
            <p className="muted" style={{ margin: 0 }}>
              {c({ ua: 'Депозит позиції', ru: 'Депозит позиции', en: 'Position deposit' })}: {paymentPreview.depositAmount > 0 ? money(paymentPreview.depositAmount, paymentPreview.currency) : c({ ua: 'не задано', ru: 'не задан', en: 'not configured' })}
            </p>
            <p className="muted" style={{ margin: 0 }}>
              {c({ ua: 'Тип бронювання', ru: 'Тип бронирования', en: 'Booking type' })}: {bookingKindTitle(bookingKind)}
            </p>
            {paymentPreview.entryTicketsAmount > 0 ? (
              <p className="muted" style={{ margin: 0 }}>
                {c({ ua: 'Квитки на подію', ru: 'Билеты на событие', en: 'Event tickets' })}: {form.guests} x {money(paymentPreview.entryTicketPrice, paymentPreview.currency)} = {money(paymentPreview.entryTicketsAmount, paymentPreview.currency)}
              </p>
            ) : null}
          </div>
        </div>

        <div className="form-group">
          <label>{c({ ua: '5. Ім’я', ru: '5. Имя', en: '5. Name' })}</label>
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
          <label>{c({ ua: 'Коментар', ru: 'Комментарий', en: 'Comment' })}</label>
          <textarea className="form-input" rows="3" value={form.commentCustomer} onChange={(event) => setForm((current) => ({ ...current, commentCustomer: event.target.value }))} />
        </div>

        <div className="form-group" style={{ gridColumn: '1 / -1' }}>
          <label>{c({ ua: '6. Підтвердження', ru: '6. Подтверждение', en: '6. Confirmation' })}</label>
          <div className="booking-agreements">
            <label className="booking-check">
              <input type="checkbox" checked={form.agreeRules} onChange={(event) => setForm((current) => ({ ...current, agreeRules: event.target.checked }))} />
              <span>{c({ ua: 'Я погоджуюся з умовами оплати та повернення', ru: 'Я соглашаюсь с условиями оплаты и возврата', en: 'I agree to the payment and return terms' })} <Link to="/payment-returns">{c({ ua: 'читати', ru: 'читать', en: 'read' })}</Link></span>
            </label>
            <label className="booking-check">
              <input type="checkbox" checked={form.agreePrivacy} onChange={(event) => setForm((current) => ({ ...current, agreePrivacy: event.target.checked }))} />
              <span>{c({ ua: 'Я погоджуюся з політикою конфіденційності', ru: 'Я соглашаюсь с политикой конфиденциальности', en: 'I agree to the privacy policy' })} <Link to="/privacy">{c({ ua: 'читати', ru: 'читать', en: 'read' })}</Link></span>
            </label>
          </div>
        </div>

        <div className="btn-group">
          <button type="submit" className="btn btn-primary" disabled={mapsState.loading || unitsState.loading || submitting || !selectedUnit}>
            {submitting
              ? c({ ua: 'Створюємо бронювання...', ru: 'Создаем бронирование...', en: 'Creating booking...' })
              : paymentPreview.totalAmount > 0
                ? c({ ua: 'Перейти до оплати', ru: 'Перейти к оплате', en: 'Continue to payment' })
                : c({ ua: 'Підтвердити бронювання', ru: 'Подтвердить бронирование', en: 'Confirm booking' })}
          </button>
          {paymentUrl ? (
            <a className="btn btn-primary" href={paymentUrl}>
              {c({ ua: 'Відкрити оплату', ru: 'Открыть оплату', en: 'Open payment' })}
            </a>
          ) : null}
          {reservationStatus?.downloadUrl ? (
            <a className="btn btn-secondary" href={reservationStatus.downloadUrl}>
              {c({ ua: 'Завантажити PDF', ru: 'Скачать PDF', en: 'Download PDF' })}
            </a>
          ) : null}
        </div>

        {errorMessage && <div className="state-msg state-error">{errorMessage}</div>}
        {successMessage && <div className="state-msg state-success">{successMessage}</div>}
      </form>

      {selectedMap && unitsState.map ? (
        <div className="booking-summary-panel booking-map-note">
          <p className="muted" style={{ margin: 0 }}>
            {c({ ua: 'Активна карта', ru: 'Активная карта', en: 'Active map' })}: <strong>{localizeField(selectedMap.name, locale)}</strong>
          </p>
          <p className="muted" style={{ margin: 0 }}>
            {unitsState.map.usageMode === 'EVENING'
              ? c({ ua: 'Вечірній режим: насамперед для подій та вечірніх посадок.', ru: 'Вечерний режим: прежде всего для событий и вечерних посадок.', en: 'Evening mode: primarily for events and evening seating.' })
              : c({ ua: 'Денний режим: підходить і для столів, і для пляжного відпочинку.', ru: 'Дневной режим: подходит и для столов, и для пляжного отдыха.', en: 'Day mode: suitable for both tables and beach leisure.' })}
          </p>
        </div>
      ) : null}
    </>
  );
}
