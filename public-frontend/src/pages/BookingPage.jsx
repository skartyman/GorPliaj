import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { bookingsApi, eventsApi, mapApi } from '../lib/api';
import { localizedCopy, localizeField } from '../lib/i18n';
import { useMeta } from '../hooks/useMeta';
import { useLocale } from '../state/locale';

function toDateOnly(value) {
  if (!value) return '';
  return new Date(value).toISOString().slice(0, 10);
}

function toTimeOnly(value) {
  if (!value) return '';
  return new Date(value).toISOString().slice(11, 16);
}

function money(value, currency = 'UAH') {
  return `${Number(value || 0).toFixed(0)} ${currency}`;
}

function getUnitDisplayName(unit, locale) {
  return localizeField(unit?.name, locale) || localizeField(unit?.label, locale) || unit?.code || unit?.id || '';
}

const BOOKING_FLOW_OPTIONS = [
  {
    value: 'STANDARD',
    copy: {
      ua: { title: 'Просто бронювання', body: 'Окремо бронюємо стіл або пляжний відпочинок без привʼязки до події.' },
      ru: { title: 'Обычная бронь', body: 'Отдельно бронируем стол или пляжный отдых без привязки к событию.' },
      en: { title: 'Regular booking', body: 'Book a table or beach leisure without linking it to an event.' }
    }
  },
  {
    value: 'EVENT',
    copy: {
      ua: { title: 'Бронь на подію', body: 'Спочатку обираємо подію, а далі бронюємо тільки вечірні столи.' },
      ru: { title: 'Бронь на событие', body: 'Сначала выбираем событие, а дальше бронируем только вечерние столы.' },
      en: { title: 'Event booking', body: 'Choose an event first, then book evening tables only.' }
    }
  }
];

const BOOKING_KIND_OPTIONS = [
  {
    value: 'TABLE',
    copy: {
      ua: { title: 'Стіл', body: 'Ресторан, тераса, пірс та вечірні посадки.' },
      ru: { title: 'Стол', body: 'Ресторан, терраса, пирс и вечерние посадки.' },
      en: { title: 'Table', body: 'Restaurant, terrace, pier, and evening seating.' }
    }
  },
  {
    value: 'BEACH',
    copy: {
      ua: { title: 'Пляж', body: 'Бунгало, ліжка та інші пляжні послуги.' },
      ru: { title: 'Пляж', body: 'Бунгало, кровати и другие пляжные услуги.' },
      en: { title: 'Beach', body: 'Bungalows, daybeds, and other beach services.' }
    }
  }
];

export default function BookingPage() {
  const { locale } = useLocale();
  const [searchParams] = useSearchParams();
  const c = (values) => localizedCopy(values, locale);
  const today = new Date().toISOString().slice(0, 10);

  const lockedEventSlug = searchParams.get('event') || '';
  const returnedReservationCode = searchParams.get('reservation') || '';
  const returnedReservationToken = searchParams.get('t') || '';
  const flowFromQuery = searchParams.get('flow') === 'EVENT' ? 'EVENT' : 'STANDARD';
  const lockedToEvent = Boolean(lockedEventSlug);

  const [bookingFlow, setBookingFlow] = useState(lockedToEvent ? 'EVENT' : flowFromQuery);
  const [selectedEventSlug, setSelectedEventSlug] = useState(lockedEventSlug);
  const [bookingKind, setBookingKind] = useState(searchParams.get('kind') === 'BEACH' && !lockedToEvent ? 'BEACH' : 'TABLE');
  const [mapsState, setMapsState] = useState({ loading: true, error: '', maps: [] });
  const [unitsState, setUnitsState] = useState({ loading: false, error: '', map: null, zones: [], units: [] });
  const [eventOptionsState, setEventOptionsState] = useState({ loading: false, error: '', events: [] });
  const [selected, setSelected] = useState({
    mapId: Number(searchParams.get('mapId') || '0'),
    zoneId: Number(searchParams.get('zoneId') || '0'),
    bookableUnitId: searchParams.get('bookableUnitId') || ''
  });
  const [selectedTypeKey, setSelectedTypeKey] = useState('');
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
  const [bookingMenuPromptOpen, setBookingMenuPromptOpen] = useState(false);
  const [eventInfo, setEventInfo] = useState(null);
  const [ticketTypes, setTicketTypes] = useState([]);

  const activeEventSlug = bookingFlow === 'EVENT' ? (lockedEventSlug || selectedEventSlug) : '';
  const resolvedBookingKind = bookingFlow === 'EVENT' ? 'TABLE' : bookingKind;
  const usageMode = activeEventSlug ? 'EVENING' : 'DAY';
  const canLoadMaps = bookingFlow === 'STANDARD' || Boolean(activeEventSlug);

  useMeta(
    resolvedBookingKind === 'BEACH'
      ? `${c({ ua: 'Бронювання пляжу', ru: 'Бронирование пляжа', en: 'Book beach leisure' })} · GorPliaj`
      : `${c({ ua: 'Бронювання столу', ru: 'Бронирование стола', en: 'Book a table' })} · GorPliaj`,
    c({
      ua: 'Оберіть сценарій, зону, вільну позицію та перейдіть до оплати.',
      ru: 'Выберите сценарий, зону, свободную позицию и перейдите к оплате.',
      en: 'Choose a booking flow, zone, available position, and continue to payment.'
    })
  );

  useEffect(() => {
    if (lockedToEvent || bookingFlow !== 'EVENT') {
      return;
    }

    let cancelled = false;
    setEventOptionsState((current) => ({ ...current, loading: true, error: '' }));

    eventsApi.list(false)
      .then((events) => {
        if (cancelled) return;
        const availableEvents = Array.isArray(events)
          ? events.filter((event) => ['BOOKING', 'BOTH'].includes(event.ctaType))
          : [];
        setEventOptionsState({ loading: false, error: '', events: availableEvents });
        if (!selectedEventSlug && availableEvents[0]?.slug) {
          setSelectedEventSlug(availableEvents[0].slug);
        }
      })
      .catch((error) => {
        if (cancelled) return;
        setEventOptionsState({ loading: false, error: error.message, events: [] });
      });

    return () => {
      cancelled = true;
    };
  }, [bookingFlow, lockedToEvent, selectedEventSlug]);

  useEffect(() => {
    if (bookingFlow !== 'EVENT') return;
    if (bookingKind !== 'TABLE') {
      setBookingKind('TABLE');
    }
  }, [bookingFlow, bookingKind]);

  useEffect(() => {
    if (!activeEventSlug) {
      setEventInfo(null);
      setTicketTypes([]);
      return;
    }

    let ignore = false;
    Promise.all([
      eventsApi.bySlug(activeEventSlug).catch(() => null),
      eventsApi.ticketTypes(activeEventSlug).catch(() => ({ ticketTypes: [] }))
    ]).then(([event, tickets]) => {
      if (ignore) return;
      setEventInfo(event);
      setTicketTypes(Array.isArray(tickets?.ticketTypes) ? tickets.ticketTypes : []);
      if (event?.startAt && !searchParams.get('date')) {
        setForm((current) => ({
          ...current,
          date: toDateOnly(event.startAt),
          timeFrom: current.timeFrom === '12:00' ? toTimeOnly(event.startAt) || current.timeFrom : current.timeFrom
        }));
      }
    });

    return () => {
      ignore = true;
    };
  }, [activeEventSlug, searchParams]);

  useEffect(() => {
    if (!canLoadMaps) {
      setMapsState({ loading: false, error: '', maps: [] });
      setSelected((current) => ({ ...current, mapId: 0, zoneId: 0, bookableUnitId: '' }));
      return;
    }

    let cancelled = false;
    setMapsState({ loading: true, error: '', maps: [] });

    mapApi.list({ usageMode, bookingKind: resolvedBookingKind, guests: form.guests })
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
  }, [canLoadMaps, usageMode, resolvedBookingKind, form.guests]);

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
      bookingKind: resolvedBookingKind
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
  }, [selected.mapId, form.date, form.timeFrom, form.guests, resolvedBookingKind]);

  useEffect(() => {
    if (!returnedReservationCode || !returnedReservationToken) return;

    setReservationAccess({ ticketCode: returnedReservationCode, token: returnedReservationToken });
    bookingsApi.status(returnedReservationCode, returnedReservationToken)
      .then((result) => {
        setReservationStatus(result);
        setSuccessMessage('');
        if (result.reservation?.paymentStatus === 'PAID') {
          setBookingMenuPromptOpen(true);
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
    return bookingKindTitle(resolvedBookingKind);
  }

  const unitTypeGroups = useMemo(() => {
    const groups = new Map();

    filteredUnits.forEach((unit) => {
      const key = [
        unit.bookingKind || '',
        String(unit.positionType || '').toUpperCase(),
        Number(unit.seatsMin || 0),
        Number(unit.seatsMax || 0)
      ].join('::');
      const existing = groups.get(key);

      if (existing) {
        existing.units.push(unit);
        if (!existing.representative.photoUrl && unit.photoUrl) {
          existing.representative = unit;
        }
        return;
      }

      const seatsMin = Number(unit.seatsMin || 0);
      const seatsMax = Number(unit.seatsMax || 0);
      const seatsLabel = seatsMin > 0 && seatsMax > 0
        ? (seatsMin === seatsMax ? `${seatsMax}` : `${seatsMin}-${seatsMax}`)
        : '';
      const baseLabel = positionTypeLabel(unit.positionType);

      groups.set(key, {
        key,
        label: seatsLabel ? `${baseLabel} · ${seatsLabel}` : baseLabel,
        representative: unit,
        units: [unit]
      });
    });

    return Array.from(groups.values()).sort((left, right) => left.label.localeCompare(right.label, locale));
  }, [filteredUnits, locale, resolvedBookingKind]);

  const selectedType = useMemo(
    () => unitTypeGroups.find((group) => group.key === selectedTypeKey) || null,
    [selectedTypeKey, unitTypeGroups]
  );

  useEffect(() => {
    if (!unitTypeGroups.length) {
      setSelectedTypeKey('');
      return;
    }

    setSelectedTypeKey((current) => {
      if (current && unitTypeGroups.some((group) => group.key === current)) {
        return current;
      }
      return unitTypeGroups[0].key;
    });
  }, [unitTypeGroups]);

  useEffect(() => {
    if (!selectedType) return;

    setSelected((current) => {
      if (current.bookableUnitId && selectedType.units.some((unit) => unit.id === current.bookableUnitId)) {
        return current;
      }

      const preferredUnit = selectedType.units.find((unit) => unit.status === 'free') || selectedType.units[0];
      return {
        ...current,
        bookableUnitId: preferredUnit?.id || ''
      };
    });
  }, [selectedType]);

  function buildMapPreviewHref(unit) {
    const params = new URLSearchParams({
      date: form.date,
      timeFrom: form.timeFrom,
      guests: String(form.guests),
      mapId: String(selected.mapId)
    });

    if (unit?.tableId) params.set('tableId', String(unit.tableId));
    if (unit?.objectId) params.set('objectId', String(unit.objectId));

    return `/map-preview?${params.toString()}`;
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
        bookingKind: resolvedBookingKind,
        customerName: form.customerName,
        customerPhone: form.customerPhone,
        customerEmail: form.customerEmail,
        guests: form.guests,
        reservationDate: form.date,
        timeFrom: form.timeFrom,
        commentCustomer: form.commentCustomer,
        eventSlug: activeEventSlug || undefined
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

  const pageTitle = bookingFlow === 'EVENT'
    ? c({ ua: 'Бронювання на подію', ru: 'Бронь на событие', en: 'Event booking' })
    : resolvedBookingKind === 'BEACH'
      ? c({ ua: 'Пляжний відпочинок', ru: 'Пляжный отдых', en: 'Beach leisure' })
      : c({ ua: 'Бронювання столу', ru: 'Бронирование стола', en: 'Table booking' });

  const formIntro = bookingFlow === 'EVENT'
    ? c({
      ua: 'Оберіть подію, вечірню карту та конкретний стіл. Пляжні позиції тут приховані, щоб сценарій лишався простим.',
      ru: 'Выберите событие, вечернюю карту и конкретный стол. Пляжные позиции здесь скрыты, чтобы сценарий оставался простым.',
      en: 'Choose an event, an evening map, and a specific table. Beach positions are hidden here to keep the flow simple.'
    })
    : c({
      ua: 'Оберіть формат відпочинку, зону та конкретну позицію. Якщо для неї передбачено депозит, оплата відкриється на фінальному кроці.',
      ru: 'Выберите формат отдыха, зону и конкретную позицию. Если для нее предусмотрен депозит, оплата откроется на финальном шаге.',
      en: 'Choose a format, zone, and specific position. If a deposit applies, payment will open on the final step.'
    });

  const selectedMetaLine = [
    bookingKindTitle(resolvedBookingKind),
    selectedZone ? localizeField(selectedZone.name, locale) : '',
    selectedMap ? localizeField(selectedMap.name, locale) : ''
  ].filter(Boolean).join(' · ');

  return (
    <>
      <div className="section-header">
        <div>
          <h1>{pageTitle}</h1>
          <p className="muted">{formIntro}</p>
        </div>
      </div>

      {activeEventSlug ? (
        <div className="booking-summary-panel booking-event-panel">
          <p className="muted" style={{ margin: 0 }}>
            {c({ ua: 'Бронювання для події', ru: 'Бронирование для события', en: 'Booking for event' })}: <strong>{localizeField(eventInfo?.title, locale) || activeEventSlug}</strong>
          </p>
          <p className="muted" style={{ margin: 0 }}>
            {c({
              ua: 'У цьому сценарії доступні тільки столи для вечірньої події.',
              ru: 'В этом сценарии доступны только столы для вечернего события.',
              en: 'Only evening event tables are available in this flow.'
            })}
          </p>
        </div>
      ) : null}

      <form onSubmit={submitBooking} className="form-grid booking-flow-grid">
        <div className="form-group" style={{ gridColumn: '1 / -1' }}>
          <label>{c({ ua: '1. Сценарій бронювання', ru: '1. Сценарий брони', en: '1. Booking flow' })}</label>
          <div className="booking-kind-grid">
            {BOOKING_FLOW_OPTIONS.map((option) => {
              const localized = option.copy[locale === 'ua' ? 'ua' : locale === 'ru' ? 'ru' : 'en'];
              return (
                <button
                  key={option.value}
                  type="button"
                  className={`booking-kind-card${bookingFlow === option.value ? ' active' : ''}`}
                  disabled={lockedToEvent}
                  onClick={() => {
                    setBookingFlow(option.value);
                    setSelected({ mapId: 0, zoneId: 0, bookableUnitId: '' });
                    if (option.value === 'STANDARD') {
                      setSelectedEventSlug('');
                    }
                  }}
                >
                  <strong>{localized.title}</strong>
                  <span>{localized.body}</span>
                </button>
              );
            })}
          </div>
          {bookingFlow === 'EVENT' ? (
            <div className="booking-flow-note">
              <strong>{c({ ua: 'Для подій бронюємо тільки столи', ru: 'Для событий бронируем только столы', en: 'Events use table-only booking' })}</strong>
              <span>{c({ ua: 'Пляжні послуги приховані, щоб не змішувати денний і вечірній сценарії.', ru: 'Пляжные услуги скрыты, чтобы не смешивать дневной и вечерний сценарии.', en: 'Beach services are hidden so day and evening flows do not get mixed.' })}</span>
            </div>
          ) : (
            <>
              <label>{c({ ua: '2. Формат відпочинку', ru: '2. Формат отдыха', en: '2. Booking type' })}</label>
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
            </>
          )}
        </div>

        {bookingFlow === 'EVENT' && !lockedToEvent ? (
          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <label>{c({ ua: '2. Оберіть подію', ru: '2. Выберите событие', en: '2. Choose an event' })}</label>
            <select
              className="form-input"
              value={selectedEventSlug}
              onChange={(event) => {
                setSelectedEventSlug(event.target.value);
                setSelected({ mapId: 0, zoneId: 0, bookableUnitId: '' });
              }}
            >
              <option value="">{c({ ua: 'Оберіть подію', ru: 'Выберите событие', en: 'Choose an event' })}</option>
              {eventOptionsState.events.map((item) => (
                <option key={item.id} value={item.slug}>
                  {localizeField(item.title, locale)}
                </option>
              ))}
            </select>
            {eventOptionsState.loading ? <div className="state-msg">{c({ ua: 'Завантажуємо події...', ru: 'Загружаем события...', en: 'Loading events...' })}</div> : null}
            {eventOptionsState.error ? <div className="state-msg state-error">{eventOptionsState.error}</div> : null}
          </div>
        ) : null}

        {bookingFlow === 'EVENT' && !activeEventSlug && !eventOptionsState.loading ? (
          <div className="state-msg" style={{ gridColumn: '1 / -1' }}>
            {c({
              ua: 'Спочатку оберіть подію, після цього відкриються вечірні карти та вільні столи.',
              ru: 'Сначала выберите событие, после этого откроются вечерние карты и свободные столы.',
              en: 'Choose an event first to load evening maps and available tables.'
            })}
          </div>
        ) : null}

        <div className="form-group">
          <label>{c({ ua: bookingFlow === 'EVENT' ? '3. Дата події' : '3. Дата', ru: bookingFlow === 'EVENT' ? '3. Дата события' : '3. Дата', en: bookingFlow === 'EVENT' ? '3. Event date' : '3. Date' })}</label>
          <input
            type="date"
            className="form-input"
            value={form.date}
            min={today}
            required
            onChange={(event) => setForm((current) => ({ ...current, date: event.target.value }))}
          />
        </div>

        <div className="form-group">
          <label>{c({ ua: 'Гостей', ru: 'Гостей', en: 'Guests' })}</label>
          <input
            type="number"
            className="form-input"
            value={form.guests}
            min="1"
            max="20"
            required
            onChange={(event) => setForm((current) => ({ ...current, guests: Number(event.target.value) }))}
          />
        </div>

        <div className="form-group">
          <label>{c({ ua: 'Час початку', ru: 'Время начала', en: 'Start time' })}</label>
          <input
            type="time"
            className="form-input"
            value={form.timeFrom}
            required
            onChange={(event) => setForm((current) => ({ ...current, timeFrom: event.target.value }))}
          />
        </div>

        <div className="form-group" style={{ gridColumn: '1 / -1' }}>
          <label>{c({ ua: bookingFlow === 'EVENT' ? '4. Карта події' : '4. Карта розміщення', ru: bookingFlow === 'EVENT' ? '4. Карта события' : '4. Карта размещения', en: bookingFlow === 'EVENT' ? '4. Event map' : '4. Venue map' })}</label>
          <div className="booking-map-grid">
            {mapsState.maps.map((map) => (
              <button
                key={map.id}
                type="button"
                className={`booking-map-card${selected.mapId === map.id ? ' active' : ''}`}
                onClick={() => setSelected((current) => ({ ...current, mapId: map.id, zoneId: 0, bookableUnitId: '' }))}
              >
                <strong>{localizeField(map.name, locale)}</strong>
                <span>
                  {localizeField(map.description, locale) || (
                    map.usageMode === 'EVENING'
                      ? c({ ua: 'Вечірня карта', ru: 'Вечерняя карта', en: 'Evening map' })
                      : c({ ua: 'Денна карта', ru: 'Дневная карта', en: 'Day map' })
                  )}
                </span>
                <span>{c({ ua: 'Доступно позицій', ru: 'Доступно позиций', en: 'Available positions' })}: {map.unitCounts?.total || 0}</span>
              </button>
            ))}
          </div>
          {mapsState.loading ? <div className="state-msg">{c({ ua: 'Завантажуємо карти...', ru: 'Загружаем карты...', en: 'Loading maps...' })}</div> : null}
          {mapsState.error ? <div className="state-msg state-error">{mapsState.error}</div> : null}
          {!mapsState.loading && !mapsState.error && !mapsState.maps.length ? (
            <div className="state-msg">
              {c({
                ua: 'Для цього сценарію та кількості гостей зараз немає доступних карт.',
                ru: 'Для этого сценария и количества гостей сейчас нет доступных карт.',
                en: 'No venue maps are available for this flow and guest count right now.'
              })}
            </div>
          ) : null}
        </div>

        <div className="form-group" style={{ gridColumn: '1 / -1' }}>
          <label>{c({ ua: '5. Оберіть зону', ru: '5. Выберите зону', en: '5. Choose a zone' })}</label>
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
                ua: 'На цій карті ще немає зон для обраного сценарію.',
                ru: 'На этой карте еще нет зон для выбранного сценария.',
                en: 'This map does not yet have zones for the selected flow.'
              })}
            </div>
          ) : null}
        </div>

        <div className="form-group" style={{ gridColumn: '1 / -1' }}>
          <label>{c({ ua: '6. Вільні типи позицій', ru: '6. Свободные типы позиций', en: '6. Available position types' })}</label>
          <div className="booking-unit-grid">
            {unitTypeGroups.map((group) => {
              const localizedName = group.label;
              const representative = group.representative;
              return (
                <button
                  key={group.key}
                  type="button"
                  className={`booking-unit-card${selectedTypeKey === group.key ? ' active' : ''}`}
                  onClick={() => setSelectedTypeKey(group.key)}
                >
                  <div className="booking-unit-card-media">
                    {representative.photoUrl ? (
                      <img src={representative.photoUrl} alt={localizedName} />
                    ) : (
                      <div className="booking-unit-card-fallback">{localizedName}</div>
                    )}
                    <span className="booking-unit-status status-free">
                      {group.units.filter((unit) => unit.status === 'free').length} {c({ ua: 'варіантів', ru: 'вариантов', en: 'options' })}
                    </span>
                  </div>
                  <div className="booking-unit-card-body">
                    <strong>{localizedName}</strong>
                    <span>{group.units.slice(0, 3).map((item) => item.code).filter(Boolean).join(', ')}{group.units.length > 3 ? '...' : ''}</span>
                    <span>{Number(representative.seatsMin)}-{Number(representative.seatsMax)} {c({ ua: 'гостей', ru: 'гостей', en: 'guests' })}</span>
                    <span>
                      {representative.depositAmount > 0
                        ? `${c({ ua: 'Депозит', ru: 'Депозит', en: 'Deposit' })}: ${money(representative.depositAmount)}`
                        : c({ ua: 'Без депозиту', ru: 'Без депозита', en: 'No deposit' })}
                    </span>
                  </div>
                </button>
              );
            })}
            {!unitsState.loading && !unitTypeGroups.length ? (
              <div className="state-msg">
                {c({
                  ua: 'У цій зоні немає доступних варіантів під обрані параметри.',
                  ru: 'В этой зоне нет доступных вариантов под выбранные параметры.',
                  en: 'There are no available options in this zone for the selected parameters.'
                })}
              </div>
            ) : null}
          </div>

          {selectedType ? (
            <div className="booking-variants-panel">
              <div className="booking-variants-head">
                <div>
                  <span className="eyebrow">{c({ ua: '7. Варіанти типу', ru: '7. Варианты типа', en: '7. Type variants' })}</span>
                  <strong>{selectedType.label}</strong>
                </div>
                <span className="booking-variants-count">
                  {selectedType.units.length} {c({ ua: 'позицій', ru: 'позиций', en: 'positions' })}
                </span>
              </div>
              <div className="booking-variants-list">
                {selectedType.units.map((unit) => {
                  const localizedName = getUnitDisplayName(unit, locale);
                  const isActive = selected.bookableUnitId === unit.id;
                  return (
                    <article key={unit.id} className={`booking-variant-row${isActive ? ' active' : ''}`}>
                      <div className="booking-variant-copy">
                        <strong>{unit.code || localizedName}</strong>
                        <span>{localizedName}</span>
                        <span>{unitStatusLabel(unit.status)} · {Number(unit.seatsMin)}-{Number(unit.seatsMax)} {c({ ua: 'гостей', ru: 'гостей', en: 'guests' })}</span>
                      </div>
                      <div className="booking-variant-actions">
                        <Link className="btn btn-secondary btn-small" to={buildMapPreviewHref(unit)}>
                          {c({ ua: 'На карті', ru: 'На карте', en: 'On map' })}
                        </Link>
                        <button
                          type="button"
                          className={`btn btn-small ${isActive ? 'btn-primary' : 'btn-secondary'}`}
                          disabled={unit.status !== 'free'}
                          onClick={() => setSelected((current) => ({ ...current, bookableUnitId: unit.id }))}
                        >
                          {isActive
                            ? c({ ua: 'Обрано', ru: 'Выбрано', en: 'Selected' })
                            : c({ ua: 'Обрати', ru: 'Выбрать', en: 'Select' })}
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          ) : null}
        </div>

        <div className="form-group" style={{ gridColumn: '1 / -1' }}>
          {selectedUnit ? (
            <div className="booking-selected-panel">
              <div className="booking-selected-copy">
                <span className="eyebrow">{c({ ua: 'Обрано', ru: 'Выбрано', en: 'Selected' })}</span>
                <strong>{getUnitDisplayName(selectedUnit, locale)}</strong>
                <span>{selectedMetaLine}</span>
              </div>
              <div className="booking-selected-meta">
                <span>{positionTypeLabel(selectedUnit.positionType)}</span>
                <span>{Number(selectedUnit.seatsMin)}-{Number(selectedUnit.seatsMax)} {c({ ua: 'гостей', ru: 'гостей', en: 'guests' })}</span>
                <span>
                  {selectedUnit.depositAmount > 0
                    ? `${c({ ua: 'Депозит', ru: 'Депозит', en: 'Deposit' })}: ${money(selectedUnit.depositAmount, paymentPreview.currency)}`
                    : c({ ua: 'Без депозиту', ru: 'Без депозита', en: 'No deposit' })}
                </span>
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
              {c({ ua: 'Тип бронювання', ru: 'Тип бронирования', en: 'Booking type' })}: {bookingKindTitle(resolvedBookingKind)}
            </p>
            {paymentPreview.entryTicketsAmount > 0 ? (
              <p className="muted" style={{ margin: 0 }}>
                {c({ ua: 'Квитки на подію', ru: 'Билеты на событие', en: 'Event tickets' })}: {form.guests} x {money(paymentPreview.entryTicketPrice, paymentPreview.currency)} = {money(paymentPreview.entryTicketsAmount, paymentPreview.currency)}
              </p>
            ) : null}
          </div>
        </div>

        <div className="form-group">
          <label>{c({ ua: '8. Імʼя', ru: '8. Имя', en: '8. Name' })}</label>
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
          <label>{c({ ua: '9. Підтвердження', ru: '9. Подтверждение', en: '9. Confirmation' })}</label>
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
          {reservationAccess?.ticketCode ? (
            <p className="muted" style={{ margin: 0 }}>
              {c({ ua: 'Код бронювання', ru: 'Код бронирования', en: 'Booking code' })}: <strong>{reservationAccess.ticketCode}</strong>
            </p>
          ) : null}
        </div>
      ) : null}

      {bookingMenuPromptOpen && reservationStatus?.reservation?.paymentStatus === 'PAID' ? (
        <div className="guest-modal-backdrop" role="presentation" onClick={() => setBookingMenuPromptOpen(false)}>
          <div className="guest-modal" role="dialog" aria-modal="true" aria-labelledby="booking-menu-title" onClick={(event) => event.stopPropagation()}>
            <button type="button" className="guest-modal-close" onClick={() => setBookingMenuPromptOpen(false)} aria-label={c({ ua: 'Закрити', ru: 'Закрыть', en: 'Close' })}>
              ×
            </button>
            <span className="guest-modal-kicker">{c({ ua: 'Бронювання готове', ru: 'Бронирование готово', en: 'Booking is ready' })}</span>
            <h2 id="booking-menu-title">
              {c({
                ua: 'Стіл заброньовано. Можна спокійно перейти до меню.',
                ru: 'Стол забронирован. Теперь можно спокойно перейти к меню.',
                en: 'Your table is booked. You can move on to the menu.'
              })}
            </h2>
            <p>
              {c({
                ua: 'Перегляньте страви та напої заздалегідь, щоб швидше визначитися на місці.',
                ru: 'Посмотрите блюда и напитки заранее, чтобы быстрее определиться на месте.',
                en: 'Browse the food and drinks in advance so it is easier to decide on site.'
              })}
            </p>
            <div className="guest-modal-actions">
              <Link className="btn btn-primary" to="/menu" onClick={() => setBookingMenuPromptOpen(false)}>
                {c({ ua: 'Переглянути меню', ru: 'Посмотреть меню', en: 'View menu' })}
              </Link>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
