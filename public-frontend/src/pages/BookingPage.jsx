import { useEffect, useMemo, useRef, useState } from 'react';
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

function toDateKeyFromLocalDate(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function money(value, currency = 'UAH') {
  return `${Number(value || 0).toFixed(0)} ${currency}`;
}

function formatPhone(value) {
  const digits = value.replace(/\D/g, '').slice(0, 12);
  if (!digits) return '';
  const d = digits.startsWith('38') ? digits.slice(2) : digits;
  let out = '+38 (0';
  if (d.length > 1) out += d.slice(1, 4);
  if (d.length > 3) out += ') ' + d.slice(3, 6);
  if (d.length > 6) out += '-' + d.slice(6, 8);
  if (d.length > 8) out += '-' + d.slice(8, 10);
  return d.length > 1 ? out : '+38 (0';
}

function getUnitDisplayName(unit, locale) {
  return localizeField(unit?.name, locale) || localizeField(unit?.label, locale) || unit?.code || unit?.id || '';
}

function formatUkrainianDate(value, { weekday = false } = {}) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('uk-UA', {
    weekday: weekday ? 'long' : undefined,
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
}

function toLocalDateKey(value) {
  const date = value instanceof Date ? value : new Date(value);
  return toDateKeyFromLocalDate(date);
}

function formatEventButtonLabel(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const weekday = date.toLocaleDateString('uk-UA', { weekday: 'long' });
  const dayMonth = date.toLocaleDateString('uk-UA', { day: 'numeric', month: 'long' });
  return `${weekday.charAt(0).toUpperCase()}${weekday.slice(1)}, ${dayMonth}`;
}

function buildEventDateOptions(event) {
  const sessions = Array.isArray(event?.sessions)
    ? event.sessions.filter((session) => session?.isActive !== false && session?.startsAt)
    : [];

  if (sessions.length) {
    const grouped = new Map();
    sessions.forEach((session) => {
      const sessionDate = new Date(session.startsAt);
      const dateKey = toDateKeyFromLocalDate(sessionDate);
      if (!dateKey) return;
      const current = grouped.get(dateKey);
      if (!current) {
        grouped.set(dateKey, {
          key: dateKey,
          date: dateKey,
          startsAt: session.startsAt,
          timeFrom: toTimeOnly(session.startsAt) || '12:00',
          label: formatEventButtonLabel(session.startsAt),
          fullLabel: formatUkrainianDate(session.startsAt)
        });
        return;
      }
      if (new Date(session.startsAt) < new Date(current.startsAt)) {
        current.startsAt = session.startsAt;
        current.timeFrom = toTimeOnly(session.startsAt) || current.timeFrom;
        current.label = formatEventButtonLabel(session.startsAt);
        current.fullLabel = formatUkrainianDate(session.startsAt);
      }
    });
    return Array.from(grouped.values()).sort((a, b) => new Date(a.startsAt) - new Date(b.startsAt));
  }

  if (!event?.startAt) return [];

  const start = new Date(event.startAt);
  const end = event?.endAt ? new Date(event.endAt) : start;
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return [];

  const options = [];
  const cursor = new Date(start);
  cursor.setHours(0, 0, 0, 0);
  const last = new Date(end);
  last.setHours(0, 0, 0, 0);

  while (cursor <= last) {
    const cursorKey = toDateKeyFromLocalDate(cursor);
    options.push({
      key: cursorKey,
      date: cursorKey,
      startsAt: event.startAt,
      timeFrom: toTimeOnly(event.startAt) || '12:00',
      label: formatEventButtonLabel(cursor),
      fullLabel: formatUkrainianDate(cursor)
    });
    cursor.setDate(cursor.getDate() + 1);
  }

  return options;
}

function formatEventRangeLabel(event) {
  const start = toLocalDateKey(event?.startAt);
  if (!start) return '';
  const end = toLocalDateKey(event?.endAt);
  if (!end || end === start) {
    return formatUkrainianDate(event.startAt, { weekday: true });
  }
  return `${formatUkrainianDate(event.startAt, { weekday: true })} · ${formatUkrainianDate(event.endAt, { weekday: true })}`;
}

function getEventDateRange(event) {
  const start = toLocalDateKey(event?.startAt);
  if (!start) return [];
  const end = toLocalDateKey(event?.endAt);
  if (!end || end === start) {
    return [start];
  }
  return [start, end].filter(Boolean);
}

function findEventForDate(events, date) {
  const selectedDate = toLocalDateKey(date);
  if (!selectedDate || !Array.isArray(events)) return null;

  return events.find((event) => {
    const range = getEventDateRange(event);
    if (!range.length) return false;
    return selectedDate >= range[0] && selectedDate <= range[range.length - 1];
  }) || null;
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
    agreeAll: false
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
  const [selectedEventDateKey, setSelectedEventDateKey] = useState('');
  const [eventDateAvailability, setEventDateAvailability] = useState({});
  const [eventBookingPrompt, setEventBookingPrompt] = useState(null);
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 4;

  function canProceedFromStep() {
    if (currentStep === 1) {
      if (bookingFlow === 'EVENT') return Boolean(activeEventDateOption);
      return true;
    }
    if (currentStep === 2) {
      if (!form.date || !form.guests || form.guests < 1) return false;
      if (bookingFlow !== 'EVENT' && !form.timeFrom) return false;
      return true;
    }
    if (currentStep === 3) {
      return Boolean(selectedUnit);
    }
    return true;
  }

  function goToNextStep() {
    if (!canProceedFromStep()) return;
    setCurrentStep((s) => Math.min(s + 1, totalSteps));
  }

  const [stepChanging, setStepChanging] = useState(false);
  const [showStickyBar, setShowStickyBar] = useState(false);
  const [holdTimeLeft, setHoldTimeLeft] = useState(0);
  const formNavRef = useRef(null);

  useEffect(() => {
    const el = document.querySelector('.booking-steps');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setStepChanging(true);
    const timer = setTimeout(() => setStepChanging(false), 320);
    return () => clearTimeout(timer);
  }, [currentStep]);

  const activeEventSlug = bookingFlow === 'EVENT' ? (lockedEventSlug || selectedEventSlug) : '';
  const resolvedBookingKind = bookingFlow === 'EVENT' ? 'TABLE' : bookingKind;
  const usageMode = activeEventSlug ? 'EVENING' : 'DAY';
  const canLoadMaps = bookingFlow === 'STANDARD' || Boolean(activeEventSlug);
  const eventDateOptions = useMemo(() => buildEventDateOptions(eventInfo), [eventInfo]);
  const selectedEventDateOption = useMemo(
    () => eventDateOptions.find((option) => option.key === selectedEventDateKey || option.date === form.date) || null,
    [eventDateOptions, selectedEventDateKey, form.date]
  );
  const eventHasMultipleDates = eventDateOptions.length > 1;
  const activeEventDateOption = selectedEventDateOption || (eventDateOptions.length === 1 ? eventDateOptions[0] : null);
  const upcomingEvents = useMemo(
    () => eventOptionsState.events.slice(0, 3),
    [eventOptionsState.events]
  );
  const matchedEventForStandardDate = useMemo(
    () => findEventForDate(eventOptionsState.events, form.date),
    [eventOptionsState.events, form.date]
  );
  const standardBeachAlertEvent = useMemo(() => {
    if (bookingFlow === 'EVENT' || bookingKind !== 'BEACH') {
      return null;
    }

    return matchedEventForStandardDate;
  }, [bookingFlow, bookingKind, matchedEventForStandardDate]);

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
    let cancelled = false;
    setEventOptionsState((current) => ({ ...current, loading: true, error: '' }));

    eventsApi.list(false)
      .then((events) => {
        if (cancelled) return;
        const availableEvents = Array.isArray(events)
          ? events.filter((event) => ['BOOKING', 'BOTH'].includes(event.ctaType))
          : [];
        setEventOptionsState({ loading: false, error: '', events: availableEvents });
        if (bookingFlow === 'EVENT' && !selectedEventSlug && availableEvents[0]?.slug) {
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
  }, [bookingFlow, selectedEventSlug]);

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
      const dates = buildEventDateOptions(event);
      if (dates.length === 1) {
        const onlyDate = dates[0];
        setSelectedEventDateKey(onlyDate.key);
        setForm((current) => ({
          ...current,
          date: onlyDate.date,
          timeFrom: current.timeFrom === '12:00' ? onlyDate.timeFrom || current.timeFrom : current.timeFrom
        }));
      } else {
        const queryDate = searchParams.get('date') || '';
        const matchedDate = queryDate && dates.find((item) => item.date === queryDate);
        setSelectedEventDateKey(matchedDate?.key || '');
        if (matchedDate) {
          setForm((current) => ({
            ...current,
            date: matchedDate.date,
            timeFrom: current.timeFrom === '12:00' ? matchedDate.timeFrom || current.timeFrom : current.timeFrom
          }));
        } else {
          setSelectedEventDateKey('');
        }
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
    if (bookingFlow !== 'EVENT' || !eventInfo?.id || !eventDateOptions.length || mapsState.loading || !mapsState.maps.length) {
      setEventDateAvailability({});
      return;
    }

    let cancelled = false;

    Promise.all(eventDateOptions.map(async (option) => {
      const checks = await Promise.allSettled(
        mapsState.maps.map((map) => mapApi.bookableUnits(map.id, {
          date: option.date,
          timeFrom: option.timeFrom,
          guests: form.guests,
          bookingKind: 'TABLE',
          eventId: eventInfo.id
        }))
      );

      const hasFree = checks.some((result) =>
        result.status === 'fulfilled'
        && Array.isArray(result.value?.units)
        && result.value.units.some((unit) => unit.status === 'free')
      );

      return [option.key, hasFree];
    }))
      .then((entries) => {
        if (cancelled) return;
        setEventDateAvailability(Object.fromEntries(entries));
      })
      .catch(() => {
        if (cancelled) return;
        setEventDateAvailability({});
      });

    return () => {
      cancelled = true;
    };
  }, [bookingFlow, eventInfo?.id, eventDateOptions, mapsState.loading, mapsState.maps, form.guests]);

  useEffect(() => {
    if (!selected.mapId || (bookingFlow === 'EVENT' && !activeEventDateOption)) {
      setUnitsState({ loading: false, error: '', map: null, zones: [], units: [] });
      return;
    }

    let cancelled = false;
    setUnitsState((current) => ({ ...current, loading: true, error: '' }));

    mapApi.bookableUnits(selected.mapId, {
      date: form.date,
      timeFrom: form.timeFrom,
      guests: form.guests,
      bookingKind: resolvedBookingKind,
      eventId: eventInfo?.id || undefined
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
  }, [selected.mapId, form.date, form.timeFrom, form.guests, resolvedBookingKind, eventInfo?.id, bookingFlow, activeEventDateOption]);

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

  useEffect(() => {
    if (!formNavRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => setShowStickyBar(!!selectedUnit && !entry.isIntersecting),
      { threshold: 0, rootMargin: '0px 0px -80px 0px' }
    );
    observer.observe(formNavRef.current);
    return () => observer.disconnect();
  }, [selectedUnit]);

  useEffect(() => {
    if (!selectedUnit) { setHoldTimeLeft(0); return; }
    setHoldTimeLeft(15 * 60);
    const interval = setInterval(() => {
      setHoldTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [selectedUnit]);

  const holdTimerDisplay = holdTimeLeft > 0
    ? `${String(Math.floor(holdTimeLeft / 60)).padStart(2, '0')}:${String(holdTimeLeft % 60).padStart(2, '0')}`
    : selectedUnit ? c({ ua: 'Час вийшов', ru: 'Время вышло', en: 'Time expired' }) : '';

  const entryTicketType = useMemo(() => {
    if (!eventInfo?.startAt || toLocalDateKey(eventInfo.startAt) !== form.date) return null;
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

  function openEventBooking(event, date) {
    if (!event?.slug) return;
    const targetDate = date || toLocalDateKey(event.startAt);
    const params = new URLSearchParams();
    params.set('event', event.slug);
    if (targetDate) params.set('date', targetDate);
    window.location.assign(`/booking?${params.toString()}`);
  }

  function handleStandardDateChange(nextDate) {
    setForm((current) => ({ ...current, date: nextDate }));
    const matchedEvent = findEventForDate(eventOptionsState.events, nextDate);
    if (matchedEvent) {
      setEventBookingPrompt({ event: matchedEvent, date: nextDate });
    } else {
      setEventBookingPrompt(null);
    }
  }

  function selectEventDate(option) {
    if (!option) return;
    setSelectedEventDateKey(option.key);
    setForm((current) => ({
      ...current,
      date: option.date,
      timeFrom: option.timeFrom || current.timeFrom
    }));
    setSelected((current) => ({ ...current, zoneId: 0, bookableUnitId: '' }));
  }

  function resetEventDateSelection() {
    setSelectedEventDateKey('');
    setForm((current) => ({ ...current, date: '', timeFrom: '12:00' }));
    setSelected((current) => ({ ...current, zoneId: 0, bookableUnitId: '' }));
  }

  function confirmEventBookingPrompt() {
    if (!eventBookingPrompt?.event?.slug) return;
    openEventBooking(eventBookingPrompt.event, eventBookingPrompt.date);
  }

  function returnToStandardBooking() {
    setBookingFlow('STANDARD');
    setSelectedEventSlug('');
    setEventInfo(null);
    setTicketTypes([]);
    setSelectedEventDateKey('');
    setEventBookingPrompt(null);
    setSelected((current) => ({ ...current, zoneId: 0, bookableUnitId: '' }));
    setForm((current) => ({
      ...current,
      date: today,
      timeFrom: '12:00'
    }));
  }

  function dismissEventBookingPrompt() {
    setEventBookingPrompt(null);
    setForm((current) => ({
      ...current,
      date: today
    }));
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

    if (!form.agreeAll) {
      setErrorMessage(c({
        ua: 'Потрібно погодитися з умовами.',
        ru: 'Нужно согласиться с условиями.',
        en: 'You need to accept the terms.'
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
    ? c({ ua: 'Бронювання столу на подію', ru: 'Бронь стола на событие', en: 'Table booking for event' })
    : resolvedBookingKind === 'BEACH'
      ? c({ ua: 'Пляжний відпочинок', ru: 'Пляжный отдых', en: 'Beach leisure' })
      : c({ ua: 'Бронювання столу', ru: 'Бронирование стола', en: 'Table booking' });

  const formIntro = bookingFlow === 'EVENT'
    ? c({
      ua: 'Оберіть дату події та вільний вечірній стіл. Пляжні позиції тут приховані.',
      ru: 'Выберите дату события и свободный вечерний стол. Пляжные позиции здесь скрыты.',
      en: 'Choose an event date and an available evening table. Beach positions are hidden here.'
    })
    : c({
      ua: 'Оберіть, що бажаєте забронювати, а далі ми покажемо доступні зони та позиції.',
      ru: 'Выберите, что хотите забронировать, а дальше мы покажем доступные зоны и позиции.',
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

      {upcomingEvents.length ? (
        <section className="booking-event-strip">
          <div className="booking-event-strip-head">
            <div>
              <span className="eyebrow">{c({ ua: 'Найближчі події', ru: 'Ближайшие события', en: 'Upcoming events' })}</span>
              <h2>{c({ ua: 'Оберіть подію', ru: 'Выберите событие', en: 'Choose an event' })}</h2>
            </div>
            <p className="muted">
              {c({
                ua: 'Клік по картці відкриває бронювання події.',
                ru: 'Клик по карточке откроет бронирование события.',
                en: 'Click a card to open event booking.'
              })}
            </p>
          </div>
          <div className="booking-event-strip-grid">
            {upcomingEvents.map((event) => {
              const poster = event.posterImage || '';
              const shortText = localizeField(event.shortDescription, locale);
              return (
                <button
                  key={event.id}
                  type="button"
                  className="booking-event-strip-card"
                  onClick={() => openEventBooking(event)}
                >
                  <div className="booking-event-strip-copy">
                    <div className="booking-event-strip-main">
                      {poster ? (
                        <div className="booking-event-strip-poster">
                          <img src={poster} alt={localizeField(event.title, locale)} />
                        </div>
                      ) : null}
                      <div className="booking-event-strip-info">
                        <strong>{localizeField(event.title, locale)}</strong>
                        <span>{formatEventRangeLabel(event)}</span>
                        {shortText ? <p className="booking-event-strip-text">{shortText}</p> : null}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      ) : null}

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
          <button type="button" className="btn btn-secondary btn-small" onClick={returnToStandardBooking}>
            {c({ ua: 'Повернутись до звичайної броні', ru: 'Вернуться к обычной брони', en: 'Back to regular booking' })}
          </button>
        </div>
      ) : null}

      <div className="booking-steps">
        {[
          { step: 1, label: c({ ua: 'Формат', ru: 'Формат', en: 'Format' }) },
          { step: 2, label: c({ ua: 'Дата та гості', ru: 'Дата и гости', en: 'Date & guests' }) },
          { step: 3, label: c({ ua: 'Вибір місця', ru: 'Выбор места', en: 'Choose place' }) },
          { step: 4, label: c({ ua: 'Контакти', ru: 'Контакты', en: 'Contacts' }) },
        ].map((s) => (
          <button
            type="button"
            key={s.step}
            className={`booking-step${currentStep === s.step ? ' active' : ''}${currentStep > s.step ? ' done' : ''}`}
            onClick={() => { if (s.step < currentStep) setCurrentStep(s.step); }}
            disabled={s.step > currentStep}
          >
            <span className="booking-step-number">{s.step}</span>
            <span className="booking-step-label">{s.label}</span>
          </button>
        ))}
      </div>

      <form onSubmit={submitBooking} className={`form-grid booking-flow-grid${stepChanging ? ' animate-step' : ''}`}>
{currentStep === 1 && (<>
        {bookingFlow === 'STANDARD' ? (
          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <label>{c({ ua: 'Що бажаєте забронювати?', ru: 'Что хотите забронировать?', en: 'What would you like to book?' })}</label>
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
        ) : null}

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

        {bookingFlow === 'EVENT' && activeEventSlug ? (
          eventHasMultipleDates && !activeEventDateOption ? (
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label>{c({ ua: 'Оберіть дату події', ru: 'Выберите дату события', en: 'Choose an event date' })}</label>
              <div className="booking-event-date-grid">
                {eventDateOptions.map((option) => {
                  const availabilityKnown = Object.prototype.hasOwnProperty.call(eventDateAvailability, option.key);
                  const isAvailable = eventDateAvailability[option.key] !== false;

                  return (
                    <button
                      key={option.key}
                      type="button"
                      className={`booking-event-date-card${availabilityKnown && !isAvailable ? ' unavailable' : ''}`}
                      disabled={availabilityKnown && !isAvailable}
                      onClick={() => selectEventDate(option)}
                    >
                      <strong>{option.label}</strong>
                      <span className={`booking-event-date-status${availabilityKnown ? (isAvailable ? ' available' : ' unavailable') : ''}`}>
                        {availabilityKnown
                          ? (isAvailable
                            ? c({ ua: 'Доступні столи', ru: 'Доступные столы', en: 'Tables available' })
                            : c({ ua: 'Місць немає', ru: 'Мест нет', en: 'No seats available' }))
                          : c({ ua: 'Перевіряємо…', ru: 'Проверяем…', en: 'Checking…' })}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : activeEventDateOption ? (
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <div className="booking-event-inline-date">
                <span className="booking-event-date-static">{activeEventDateOption.fullLabel}</span>
                {eventHasMultipleDates ? (
                  <button type="button" className="booking-event-change-link" onClick={resetEventDateSelection}>
                    {c({ ua: 'Змінити дату', ru: 'Изменить дату', en: 'Change date' })}
                  </button>
                ) : null}
              </div>
              <p className="booking-compact-note" style={{ marginTop: 12 }}>
                {c({ ua: 'Для цієї події доступні тільки вечірні столи.', ru: 'Для этого события доступны только вечерние столы.', en: 'Only evening tables are available for this event.' })}
              </p>
            </div>
          ) : null
        ) : null}
</>)}

        {currentStep === 2 && (<>
        {bookingFlow !== 'EVENT' ? (
          <div className="form-group">
            <label>{c({ ua: '3. Дата', ru: '3. Дата', en: '3. Date' })}</label>
            <input
              type="date"
              className="form-input"
              value={form.date}
              min={today}
              required
              onChange={(event) => handleStandardDateChange(event.target.value)}
            />
          </div>
        ) : null}

        <div className="form-group">
          <label>{c({ ua: 'Гостей', ru: 'Гостей', en: 'Guests' })}</label>
          <div className="guest-stepper">
            <button type="button" className="guest-stepper-btn" onClick={() => setForm((current) => ({ ...current, guests: Math.max(1, current.guests - 1) }))}>−</button>
            <span className="guest-stepper-value">{form.guests}</span>
            <button type="button" className="guest-stepper-btn" onClick={() => setForm((current) => ({ ...current, guests: Math.min(20, current.guests + 1) }))}>+</button>
          </div>
        </div>

        {bookingFlow !== 'EVENT' ? (
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
        ) : null}

        {standardBeachAlertEvent ? (
          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <p className="menu-cart-note menu-cart-note-alert" style={{ margin: 0 }}>
              {c({
                ua: 'У цей день пляжні послуги у всіх зонах, крім Лівого пляжу, працюють до 18:00, бо з 19:00 починається подія.',
                ru: 'В этот день пляжные услуги во всех зонах, кроме Левого пляжа, работают до 18:00, потому что с 19:00 начинается событие.',
                en: 'On this day, beach services in all zones except the Left Beach operate until 18:00 because the event starts at 19:00.'
              })}
            </p>
          </div>
        ) : null}
</>)}

        {currentStep === 3 && (<>
        <div className="form-group" style={{ gridColumn: '1 / -1' }}>
          <label>{c({ ua: bookingFlow === 'EVENT' ? 'Оберіть вільний стіл на карті' : '4. Карта розміщення', ru: bookingFlow === 'EVENT' ? 'Выберите свободный стол на карте' : '4. Карта размещения', en: bookingFlow === 'EVENT' ? 'Choose an available table on the map' : '4. Venue map' })}</label>
          {bookingFlow !== 'EVENT' || activeEventDateOption ? (
            <>
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
            </>
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
</>)}

        {currentStep === 4 && (<>
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
            {bookingFlow !== 'EVENT' && bookingKind === 'BEACH' ? (
              <p className="menu-cart-note menu-cart-note-alert" style={{ margin: 0 }}>
                {c({
                  ua: 'Нагадування: бронювання сервісних послуг оформлюється за 100% передоплатою, діє до 13:00 оплаченого дня, а за неявки до 13:00 може бути утримано 50% передоплати.',
                  ru: 'Напоминание: бронирование сервисных услуг оформляется по 100% предоплате, действует до 13:00 оплаченного дня, а при неявке до 13:00 может быть удержано 50% предоплаты.',
                  en: 'Reminder: paid service bookings require 100% prepayment, remain valid until 1:00 PM on the paid day, and a 50% retention may apply if the guest does not arrive by 1:00 PM.'
                })}
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
          <input type="tel" className="form-input" value={form.customerPhone} placeholder="+38 (0XX) XXX-XX-XX" required minLength="7" onChange={(event) => setForm((current) => ({ ...current, customerPhone: formatPhone(event.target.value) }))} />
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
              <input type="checkbox" checked={form.agreeAll} onChange={(event) => setForm((current) => ({ ...current, agreeAll: event.target.checked }))} />
              <span>{c({ ua: 'Я погоджуюся з правилами перебування, умовами оплати/повернення та політикою конфіденційності', ru: 'Я соглашаюсь с правилами пребывания, условиями оплаты/возврата и политикой конфиденциальности', en: 'I agree to the venue rules, payment/return terms, and privacy policy' })}</span>
            </label>
          </div>
        </div>
</>)}

        <div ref={formNavRef}>
        {currentStep === 4 ? (
          <div className="btn-group">
            <button type="button" className="btn btn-secondary" onClick={() => setCurrentStep((s) => s - 1)}>
              {c({ ua: 'Назад', ru: 'Назад', en: 'Back' })}
            </button>
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
        ) : (
          <div className="btn-group booking-nav-group">
            {currentStep > 1 ? (
              <button type="button" className="btn btn-secondary" onClick={() => setCurrentStep((s) => s - 1)}>
                {c({ ua: 'Назад', ru: 'Назад', en: 'Back' })}
              </button>
            ) : null}
            <button type="button" className="btn btn-primary" onClick={goToNextStep} disabled={!canProceedFromStep() || submitting}>
              {c({ ua: 'Далі', ru: 'Далее', en: 'Next' })}
            </button>
          </div>
        )}
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

      {eventBookingPrompt ? (
        <div className="booking-event-prompt-backdrop" role="presentation" onClick={dismissEventBookingPrompt}>
          <div
            className="booking-event-prompt-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="booking-event-prompt-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="booking-event-prompt-copy">
              <span className="eyebrow">{c({ ua: 'Подія знайдена', ru: 'Событие найдено', en: 'Event detected' })}</span>
              <strong id="booking-event-prompt-title">
                {c({ ua: 'Ви обрали дату події', ru: 'Вы выбрали дату события', en: 'You selected an event date' })}
              </strong>
              <p className="muted" style={{ margin: 0 }}>
                {c({ ua: 'Перейти до бронювання на', ru: 'Перейти к брони на', en: 'Go to booking for' })}{' '}
                <strong>{localizeField(eventBookingPrompt.event?.title, locale)}</strong>?
              </p>
            </div>
            <div className="booking-event-prompt-actions">
              <button type="button" className="btn btn-secondary btn-small" onClick={dismissEventBookingPrompt}>
                {c({ ua: 'Залишитись', ru: 'Остаться', en: 'Stay here' })}
              </button>
              <button type="button" className="btn btn-primary btn-small" onClick={confirmEventBookingPrompt}>
                {c({ ua: 'Перейти', ru: 'Перейти', en: 'Continue' })}
              </button>
            </div>
          </div>
        </div>
      ) : null}

{showStickyBar ? (
  <div className="booking-sticky-bar">
    <div className="booking-sticky-body">
      <div className="booking-sticky-info">
        <strong>{selectedUnit ? getUnitDisplayName(selectedUnit, locale) : ''}</strong>
        <span>{selectedMetaLine}</span>
      </div>
      <div className="booking-sticky-meta">
        <span className="booking-sticky-timer">{holdTimerDisplay}</span>
        <span className="booking-sticky-price">{money(paymentPreview.totalAmount, paymentPreview.currency)}</span>
      </div>
    </div>
    <button type="button" className="btn btn-primary booking-sticky-btn" onClick={() => {
      const navEl = document.querySelector('.booking-steps');
      if (navEl) navEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }}>
      {c({ ua: 'Продовжити', ru: 'Продолжить', en: 'Continue' })}
    </button>
  </div>
) : null}
    </>
  );
}
