const reservationService = require('../services/reservationService');
const bookableUnitService = require('../services/bookableUnitService');
const hutkoService = require('../services/hutkoService');
const ticketSalesService = require('../services/ticketSalesService');
const { sendTicketEmail } = require('../services/emailService');
const waiterTelegramService = require('../services/waiterTelegramService');
const { generateTicketCode } = require('../utils/ticket');
const {
  buildVerifyUrl,
  buildReservationStatusUrl,
  buildReservationPdfUrl,
  buildDepositVerifyUrl,
  generateTicketSignature,
  verifyTicketSignature
} = require('../utils/ticketSignature');
const { generateTicketPdf } = require('../services/ticketPdfService');
const { getClosingDateTime, toDateTime, VENUE_UTC_OFFSET, getVenueClockParts } = require('../utils/venueTime');
const { localizeMessage } = require('../utils/localization');
const crypto = require('crypto');

const LEGACY_STATUS_ALIASES = {
  new: 'PENDING',
  confirmed: 'CONFIRMED',
  cancelled: 'CANCELLED'
};

let cachedReservationStatuses = null;

function getReservationStatuses() {
  if (cachedReservationStatuses) return cachedReservationStatuses;

  const { ReservationStatus } = require('@prisma/client');
  cachedReservationStatuses = Object.values(ReservationStatus);
  return cachedReservationStatuses;
}

function normalizeText(value) {
  return String(value || '').trim();
}

function localizeJson(value) {
  if (!value || typeof value !== 'object') return String(value || '');
  return value.ua || value.ru || value.en || '';
}

function getBookingPositionName(table) {
  return localizeJson(table?.serviceName) || localizeJson(table?.name) || table?.code || '';
}

function getBookingPositionLabel(table, bookingKind) {
  if ((bookingKind || table?.bookingKind) === 'BEACH') {
    return 'beach position';
  }

  return 'table';
}

function toDateOnly(value) {
  return getVenueClockParts(new Date(value)).dateKey;
}

function isSameBookingDay(left, right) {
  if (!left || !right) return false;
  return toDateOnly(left) === toDateOnly(right);
}

async function getReservations(req, res) {
  try {
    await reservationService.expireStaleReservations();
    const reservations = await reservationService.getReservations();
    return res.json(reservations);
  } catch (error) {
    console.error('[reservationController.getReservations] Failed to get reservations.', error);
    return res.status(500).json({ message: 'Unable to load reservations.' });
  }
}

function hasMissingRequiredFields(body) {
  const requiredFields = [
    'customerName',
    'customerPhone',
    'guests',
    'reservationDate',
    'timeFrom'
  ];

  const hasLegacySelection = body.tableId && body.mapId && body.zoneId;
  const hasBookableUnitSelection = body.bookableUnitId;
  const hasBookableUnitGroup = Array.isArray(body.bookableUnitIds) && body.bookableUnitIds.length > 0;

  return requiredFields.some((field) => !body[field]) || (!hasLegacySelection && !hasBookableUnitSelection && !hasBookableUnitGroup);
}

function getDepositFromObject(object) {
  const meta = object?.metaJson && typeof object.metaJson === 'object' ? object.metaJson : {};
  const amount = Number(meta.depositAmount ?? meta.deposit ?? 0);
  return {
    depositRequired: Boolean(meta.depositRequired) || amount > 0,
    depositAmount: Number.isFinite(amount) && amount > 0 ? amount : null
  };
}

function getEventEntryBreakdown(event, reservationDate, guests) {
  if (!event) return null;

  const matchingSession = event.sessions?.find((session) =>
    session.isActive && isSameBookingDay(session.startsAt, reservationDate)
  );
  if (matchingSession?.admissionMode === 'FREE') {
    return {
      eventId: event.id,
      eventSlug: event.slug,
      eventTitle: localizeJson(event.title),
      ticketTypeId: null,
      eventSessionId: matchingSession.id,
      eventSession: matchingSession,
      eventStartsAt: event.startAt,
      eventEndsAt: event.endAt,
      ticketTypeName: '',
      ticketPrice: 0,
      ticketCount: 0,
      amount: 0,
      currency: 'UAH',
      isFreeEntry: true
    };
  }

  const matchingSessionTicket = event.ticketTypes?.find((ticketType) =>
    ticketType.eventSession?.isActive && isSameBookingDay(ticketType.eventSession.startsAt, reservationDate)
  );
  const fallbackTicket = isSameBookingDay(event.startAt, reservationDate)
    ? event.ticketTypes?.find((ticketType) => !ticketType.eventSessionId)
    : null;
  const ticketType = matchingSessionTicket || fallbackTicket;
  if (!ticketType) return null;
  const now = new Date();
  if (ticketType.salesStart && ticketType.salesStart > now) return null;
  if (ticketType.salesEnd && ticketType.salesEnd < now) return null;
  if (Number(ticketType.soldCount || 0) + guests > Number(ticketType.capacity || 0)) return null;

  const price = Number(ticketType.price || 0);
  if (!Number.isFinite(price) || price <= 0) return null;

  return {
    eventId: event.id,
    eventSlug: event.slug,
    eventTitle: localizeJson(event.title),
    ticketTypeId: ticketType.id,
    eventSessionId: ticketType.eventSessionId || null,
    eventSession: ticketType.eventSession || null,
    eventStartsAt: event.startAt,
    eventEndsAt: event.endAt,
    ticketTypeName: localizeJson(ticketType.name),
    ticketPrice: price,
    ticketCount: guests,
    amount: price * guests,
    currency: ticketType.currency || 'UAH'
  };
}

function getEventArrivalWindow(entryBreakdown) {
  const session = entryBreakdown?.eventSession;
  const startsAt = new Date(session?.startsAt || entryBreakdown?.eventStartsAt);
  const endsAt = new Date(session?.endsAt || entryBreakdown?.eventEndsAt || entryBreakdown?.eventStartsAt);
  if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) return null;
  return {
    earliest: new Date(startsAt.getTime() - 60 * 60 * 1000),
    latest: endsAt
  };
}

function buildPaymentComment({ rentalAmount, depositAmount, entryBreakdown, totalAmount }) {
  const lines = [];

  if (rentalAmount > 0) {
    lines.push(`Position rental paid online: ${rentalAmount} UAH.`);
  }
  if (depositAmount > 0) {
    lines.push(`Deposit paid online: ${depositAmount} UAH. Included in the final bill at the venue.`);
  }
  if (!rentalAmount && !depositAmount) {
    lines.push('Booking is free: no rental or deposit was configured for this position.');
  }

  lines.push(`Total online payment: ${totalAmount} UAH.`);

  if (entryBreakdown?.ticketTypeId) {
    lines.push(`Event entry included: ${entryBreakdown.ticketCount} x ${entryBreakdown.ticketPrice} ${entryBreakdown.currency} = ${entryBreakdown.amount} ${entryBreakdown.currency}.`);
  }

  return lines.join('\n');
}

function buildPublicReservationAccess(reservation) {
  if (!reservation?.ticketCode) return null;
  const token = generateTicketSignature(reservation.ticketCode, reservation.reservationDate);
  return {
    ticketCode: reservation.ticketCode,
    token,
    statusUrl: `/api/reservations/${encodeURIComponent(reservation.ticketCode)}/status?t=${encodeURIComponent(token)}`,
    downloadUrl: `/api/reservations/${encodeURIComponent(reservation.ticketCode)}/pdf?t=${encodeURIComponent(token)}`
  };
}

function buildReservationPdfPayload(reservation) {
  const groupReservations = reservation.groupReservations?.length ? reservation.groupReservations : [reservation];
  const totalPaid = Number(reservation.payment?.amount || 0);
  const depositAmount = groupReservations.reduce((sum, item) => sum + Number(item.depositAmount || 0), 0);
  const rentalAmount = groupReservations.reduce((sum, item) => sum + Number(item.rentalAmount || 0), 0);
  const entryTicketsAmount = Math.max(totalPaid - depositAmount - rentalAmount, 0);
  const totalGuests = Number(reservation.groupGuestCount || reservation.guests || 0);
  const tableName = groupReservations.map((item) => getBookingPositionName(item.table)).filter(Boolean).join(', ');
  const zoneName = [...new Set(groupReservations.map((item) => localizeJson(item.zone?.name)).filter(Boolean))].join(', ');

  return {
    ticketCode: reservation.ticketCode,
    customerName: reservation.customerName,
    customerPhone: reservation.customerPhone || '',
    guests: totalGuests,
    reservationDate: reservation.reservationDate,
    timeFrom: reservation.timeFrom,
    timeTo: reservation.timeTo,
    tableName,
    zoneName,
    eventTitle: localizeJson(reservation.event?.title),
    depositAmount,
    rentalAmount,
    totalPaid,
    entryTicketsAmount,
    entryTicketCount: entryTicketsAmount > 0 ? totalGuests : 0,
    entryTicketPrice: entryTicketsAmount > 0 && totalGuests ? entryTicketsAmount / totalGuests : 0,
    status: reservation.status,
    paymentStatus: reservation.payment?.status || null,
    verifyUrl: buildVerifyUrl(reservation.ticketCode, reservation.reservationDate),
    statusUrl: buildReservationStatusUrl(reservation.ticketCode, reservation.reservationDate),
    downloadUrl: buildReservationPdfUrl(reservation.ticketCode, reservation.reservationDate),
    depositVerifyUrl: depositAmount > 0 ? buildDepositVerifyUrl(reservation.ticketCode, reservation.reservationDate) : null
  };
}

function allocateGuestsAcrossTables(tables, totalGuests) {
  let remaining = totalGuests;
  return tables.map((table, index) => {
    const tablesLeft = tables.length - index - 1;
    const capacity = Math.max(1, Number(table.seatsMax || 1));
    const allocated = index === tables.length - 1
      ? remaining
      : Math.min(capacity, Math.max(1, remaining - tablesLeft));
    remaining -= allocated;
    return allocated;
  });
}

async function createGroupReservation(req, res, context) {
  const { guests, reservationDate, timeFrom, timeTo, event, eventSlug, customerEmail, locale } = context;
  let effectiveTimeTo = timeTo;
  const requestedIds = [...new Set(req.body.bookableUnitIds.map((value) => normalizeText(value)).filter(Boolean))];
  if (requestedIds.length < 2) return null;

  const requestedMapId = Number(req.body.mapId);
  const units = [];
  for (const bookableUnitId of requestedIds) {
    const unit = await bookableUnitService.getReservationUnit({
      bookableUnitId,
      mapId: requestedMapId,
      reservationDate,
      eventId: event?.id || null
    });
    if (!unit) return res.status(400).json({ message: 'One of the selected booking positions is not available.' });
    units.push(unit);
  }

  const tables = [];
  for (const unit of units) {
    const table = await reservationService.getReservationTable({
      tableId: Number(unit.tableId),
      mapId: Number(unit.mapId),
      zoneId: Number(unit.zoneId),
      reservationDate,
      eventId: event?.id || null
    });
    if (!table) return res.status(400).json({ message: 'One of the selected booking positions is not available.' });
    tables.push(table);
  }

  const bookingKind = units[0].bookingKind || tables[0].bookingKind || 'TABLE';
  const sameBookingContext = units.every((unit) => Number(unit.mapId) === Number(units[0].mapId) && (unit.bookingKind || bookingKind) === bookingKind);
  if (!sameBookingContext) {
    return res.status(400).json({ message: 'Grouped positions must belong to the same map and booking scenario.' });
  }

  if (!event) {
    const restrictions = await Promise.all(tables.map((table) => (
      reservationService.getRegularBookingRestriction({ reservationDate, timeFrom, table })
    )));
    const blockedRestriction = restrictions.find((restriction) => restriction?.blocked);
    if (blockedRestriction) {
      return res.status(409).json({
        message: reservationService.getEventDayRestrictionMessage(locale, blockedRestriction.cutoffTime)
      });
    }
    effectiveTimeTo = restrictions.reduce(reservationService.clampBookingEnd, effectiveTimeTo);
  }

  const totalCapacity = tables.reduce((sum, table) => sum + Math.max(1, Number(table.seatsMax || 1)), 0);
  if (totalCapacity < guests) {
    return res.status(400).json({ message: 'The selected positions do not have enough capacity for all guests.' });
  }

  const holdTokens = new Map((Array.isArray(req.body.holdTokens) ? req.body.holdTokens : [])
    .map((hold) => [Number(hold?.tableId), normalizeText(hold?.holdToken)]));

  for (const table of tables) {
    const holdConflict = await reservationService.findTableHoldConflict({ tableId: table.id, reservationDate, timeFrom, timeTo: effectiveTimeTo });
    if (holdConflict && holdConflict.holdToken !== holdTokens.get(table.id)) {
      return res.status(409).json({ message: localizeMessage('reservation.conflict', locale) });
    }
    const reservationConflict = await reservationService.findReservationConflict({ tableId: table.id, reservationDate, timeFrom, timeTo: effectiveTimeTo });
    if (reservationConflict) {
      return res.status(409).json({ message: localizeMessage('reservation.conflict', locale) });
    }
  }

  const entryBreakdown = getEventEntryBreakdown(event, reservationDate, guests);
  if (event && !entryBreakdown) {
    return res.status(409).json({ message: 'Entry tickets for this event are not available for the selected guest count.' });
  }
  const eventArrivalWindow = getEventArrivalWindow(entryBreakdown);
  if (eventArrivalWindow && (timeFrom < eventArrivalWindow.earliest || timeFrom > eventArrivalWindow.latest)) {
    return res.status(400).json({ message: 'Arrival time must be within the selected event session and no earlier than one hour before it starts.' });
  }

  const positionAmounts = units.map((unit, index) => ({
    deposit: Number(unit.depositAmount ?? tables[index].deposit ?? 0) || 0,
    rental: event ? 0 : (Number(unit.rentalAmount ?? tables[index].price ?? 0) || 0)
  }));
  const depositAmount = positionAmounts.reduce((sum, amount) => sum + amount.deposit, 0);
  const rentalAmount = positionAmounts.reduce((sum, amount) => sum + amount.rental, 0);
  const totalAmount = rentalAmount + depositAmount + Number(entryBreakdown?.amount || 0);
  const isAwaitingPayment = totalAmount > 0;
  const expiresAt = isAwaitingPayment ? new Date(Date.now() + 15 * 60 * 1000) : null;
  const bookingGroupId = crypto.randomUUID();
  const allocations = allocateGuestsAcrossTables(tables, guests);
  const positionNames = tables.map((table) => getBookingPositionName(table) || table.code || `#${table.id}`);
  const groupComment = `Grouped booking ${bookingGroupId}: ${positionNames.join(', ')}. Total guests: ${guests}.`;
  const paymentComment = `${buildPaymentComment({ rentalAmount, depositAmount, entryBreakdown, totalAmount })}\n${groupComment}`;
  const customerComment = [normalizeText(req.body.commentCustomer), paymentComment].filter(Boolean).join('\n\n');

  const payloads = tables.map((table, index) => ({
    bookingGroupId,
    isGroupLead: index === 0,
    groupGuestCount: index === 0 ? guests : null,
    tableId: table.id,
    mapId: Number(units[index].mapId),
    zoneId: Number(units[index].zoneId),
    eventId: entryBreakdown?.eventId || event?.id || null,
    bookingKind,
    customerName: req.body.customerName,
    customerPhone: req.body.customerPhone,
    customerEmail,
    guests: allocations[index],
    reservationDate,
    timeFrom,
    timeTo: effectiveTimeTo,
    commentCustomer: customerComment,
    commentAdmin: paymentComment,
    depositRequired: positionAmounts[index].deposit > 0,
    depositAmount: positionAmounts[index].deposit || null,
    rentalAmount: positionAmounts[index].rental || null,
    status: isAwaitingPayment ? 'AWAITING_PAYMENT' : 'CONFIRMED',
    expiresAt,
    source: event ? 'EVENT' : 'WEB',
    ticketCode: generateTicketCode()
  }));

  const reservation = await reservationService.createReservationGroup(payloads);
  let linkedTicketOrder = null;
  if (entryBreakdown?.ticketTypeId) {
    const ticketOrderResult = await ticketSalesService.createOrder({
      eventId: entryBreakdown.eventId,
      eventSessionId: entryBreakdown.eventSessionId,
      customerName: req.body.customerName,
      customerEmail,
      customerPhone: req.body.customerPhone,
      items: [{ ticketTypeId: entryBreakdown.ticketTypeId, quantity: guests }],
      enforceSalesWindow: true,
      expiresAt
    });
    if (ticketOrderResult.type !== 'SUCCESS') {
      await reservationService.cancelReservationAfterTicketFailure(reservation.id);
      return res.status(ticketOrderResult.type === 'CONFLICT' ? 409 : 400).json({ message: ticketOrderResult.message });
    }
    linkedTicketOrder = ticketOrderResult.order;
  }

  for (const table of tables) {
    const token = holdTokens.get(table.id);
    if (token) await reservationService.consumeTableHold(token, reservation.id);
  }

  const access = buildPublicReservationAccess(reservation);
  let checkout = null;
  if (totalAmount > 0) {
    const returnTo = `/booking?reservation=${encodeURIComponent(access.ticketCode)}&t=${encodeURIComponent(access.token)}${eventSlug ? `&event=${encodeURIComponent(eventSlug)}` : ''}`;
    checkout = await hutkoService.createCheckoutSession({
      reservationId: reservation.id,
      ticketOrderId: linkedTicketOrder?.id || null,
      amount: totalAmount,
      description: `GorPliaj group booking: ${positionNames.join(', ')}; rental ${rentalAmount} UAH, deposit ${depositAmount} UAH${entryBreakdown?.ticketTypeId ? ` + entry ${guests} x ${entryBreakdown.ticketPrice} ${entryBreakdown.currency}` : ''}`,
      currency: entryBreakdown?.currency || 'UAH',
      customerEmail,
      customerPhone: req.body.customerPhone,
      returnTo
    });
    if (checkout.type === 'NOT_CONFIGURED' || checkout.type === 'PROVIDER_ERROR') {
      if (linkedTicketOrder) await ticketSalesService.updateOrderStatus(linkedTicketOrder.id, 'CANCELLED');
      await reservationService.cancelReservationAfterTicketFailure(reservation.id);
      return res.status(checkout.type === 'NOT_CONFIGURED' ? 503 : 502).json({ message: checkout.message, reservation, access });
    }
  } else {
    try {
      await sendTicketEmail({
        to: customerEmail,
        ticketCode: reservation.ticketCode,
        customerName: reservation.customerName,
        customerPhone: reservation.customerPhone || '',
        reservationDate: reservation.reservationDate,
        timeFrom: reservation.timeFrom,
        timeTo: reservation.timeTo,
        guests,
        tableName: positionNames.join(', '),
        zoneName: reservation.zone?.name || '',
        eventTitle: entryBreakdown?.eventTitle || '',
        depositAmount,
        rentalAmount,
        totalPaid: 0,
        entryTicketsAmount: 0,
        verifyUrl: buildVerifyUrl(reservation.ticketCode, reservation.reservationDate),
        statusUrl: buildReservationStatusUrl(reservation.ticketCode, reservation.reservationDate),
        downloadUrl: buildReservationPdfUrl(reservation.ticketCode, reservation.reservationDate),
        status: reservation.status,
        paymentStatus: null
      });
    } catch (emailError) {
      console.error(`[reservationController] Failed to send grouped booking email #${reservation.id}:`, emailError.message);
    }
    try {
      await waiterTelegramService.sendNewReservationMessage(reservation, {
        positions: positionNames,
        zones: tables.map((table) => localizeJson(table.zone?.name)).filter(Boolean),
        guests,
        totalAmount: 0,
        isPaid: false,
        eventTitle: entryBreakdown?.eventTitle || ''
      });
    } catch (telegramError) {
      console.error(`[reservationController] Failed to send telegram notification for grouped reservation #${reservation.id}:`, telegramError.message);
    }
  }

  return res.status(201).json({
    success: true,
    reservation,
    group: { id: bookingGroupId, positions: positionNames, totalGuests: guests, totalCapacity },
    paymentUrl: checkout?.paymentUrl || null,
    paymentId: checkout?.paymentId || null,
    access,
    paymentBreakdown: {
      depositAmount,
      rentalAmount,
      entryTicketsAmount: entryBreakdown?.amount || 0,
      entryTicketCount: entryBreakdown?.ticketCount || 0,
      entryTicketPrice: entryBreakdown?.ticketPrice || 0,
      eventTitle: entryBreakdown?.eventTitle || '',
      totalAmount,
      currency: entryBreakdown?.currency || 'UAH'
    },
    ticketOrder: linkedTicketOrder ? { orderNumber: linkedTicketOrder.orderNumber, ticketCount: guests } : null
  });
}

async function createReservation(req, res) {
  try {
    if (hasMissingRequiredFields(req.body)) {
      return res.status(400).json({ message: 'Fill in all required booking fields.' });
    }

    const customerEmail = normalizeText(req.body.customerEmail).toLowerCase();
    const guests = Number(req.body.guests);
    if (!Number.isFinite(guests) || guests <= 0) {
      return res.status(400).json({ message: 'Guest count must be greater than 0.' });
    }

    const reservationDate = new Date(`${req.body.reservationDate}T00:00:00${VENUE_UTC_OFFSET}`);
    const timeFrom = toDateTime(req.body.reservationDate, req.body.timeFrom);
    let timeTo = getClosingDateTime(req.body.reservationDate);

    if (Number.isNaN(reservationDate.getTime()) || Number.isNaN(timeFrom.getTime()) || Number.isNaN(timeTo.getTime())) {
      return res.status(400).json({ message: 'Invalid booking date or time.' });
    }

    if (timeFrom >= timeTo) {
      return res.status(400).json({ message: 'Start time must be before venue closing time.' });
    }

    let tableId = Number(req.body.tableId);
    let mapId = Number(req.body.mapId);
    let zoneId = Number(req.body.zoneId);
    let bookingKind = normalizeText(req.body.bookingKind).toUpperCase() || 'TABLE';
    let bookableUnit = null;
    const eventSlug = normalizeText(req.body.eventSlug);
    const event = eventSlug ? await reservationService.getPublicEventWithEntryTicket(eventSlug) : null;

    if (Array.isArray(req.body.bookableUnitIds) && req.body.bookableUnitIds.length > 1) {
      return createGroupReservation(req, res, {
        guests,
        reservationDate,
        timeFrom,
        timeTo,
        event,
        eventSlug,
        customerEmail,
        locale: req.body?.locale || 'ua'
      });
    }

    if (req.body.bookableUnitId) {
      bookableUnit = await bookableUnitService.getReservationUnit({
        bookableUnitId: req.body.bookableUnitId,
        mapId,
        reservationDate,
        eventId: event?.id || null
      });

      if (!bookableUnit) {
        return res.status(400).json({ message: 'Selected booking option is not available.' });
      }

      tableId = Number(bookableUnit.tableId);
      mapId = Number(bookableUnit.mapId);
      zoneId = Number(bookableUnit.zoneId);
      bookingKind = bookableUnit.bookingKind || bookingKind;
    }

    const table = await reservationService.getReservationTable({
      tableId,
      mapId,
      zoneId,
      reservationDate,
      eventId: event?.id || null
    });
    if (!table) {
      return res.status(400).json({ message: 'Selected booking position is not available.' });
    }

    const locale = req.body?.locale || 'ua';
    if (!event) {
      const restriction = await reservationService.getRegularBookingRestriction({ reservationDate, timeFrom, table });
      if (restriction?.blocked) {
        return res.status(409).json({
          message: reservationService.getEventDayRestrictionMessage(locale, restriction.cutoffTime)
        });
      }
      timeTo = reservationService.clampBookingEnd(timeTo, restriction);
    }

    if (!reservationService.matchesGuestCapacity(table, guests)) {
      return res.status(400).json({ message: 'Guest count does not match the selected position capacity.' });
    }

    const holdToken = normalizeText(req.body.holdToken);
    if (holdToken) {
      const holdConflict = await reservationService.findTableHoldConflict({ tableId, reservationDate, timeFrom, timeTo });
      if (holdConflict && holdConflict.holdToken !== holdToken) {
        return res.status(409).json({ message: localizeMessage('reservation.conflict', locale) });
      }
    }
    const reservationConflict = await reservationService.findReservationConflict({ tableId, reservationDate, timeFrom, timeTo });
    if (reservationConflict) {
      return res.status(409).json({ message: localizeMessage('reservation.conflict', locale) });
    }

    const objectId = Number(req.body.objectId || bookableUnit?.objectId || 0);
    const tableDeposit = Number(table.deposit || 0);
    const tablePrice = Number(table.price || 0);
    let deposit = {
      depositRequired: tableDeposit > 0,
      depositAmount: tableDeposit > 0 ? tableDeposit : null
    };
    let rentalAmount = tablePrice > 0 ? tablePrice : null;
    if (bookableUnit?.depositAmount > 0) {
      deposit = {
        depositRequired: true,
        depositAmount: Number(bookableUnit.depositAmount)
      };
    }
    if (bookableUnit?.rentalAmount > 0) {
      rentalAmount = Number(bookableUnit.rentalAmount);
    }

    if (objectId) {
      const reservationObject = await reservationService.getReservationObject({ objectId, mapId, tableId });
      if (!reservationObject) {
        return res.status(400).json({ message: 'Selected map object is not available for booking.' });
      }
      if (!deposit.depositAmount) {
        deposit = getDepositFromObject(reservationObject);
      }
    }

    // Evening event tables use a deposit, never a rental charge.
    if (event) {
      rentalAmount = null;
    }

    const entryBreakdown = getEventEntryBreakdown(event, reservationDate, guests);
    if (event && !entryBreakdown) {
      return res.status(409).json({ message: 'Entry tickets for this event are not available for the selected guest count.' });
    }
    const eventArrivalWindow = getEventArrivalWindow(entryBreakdown);
    if (eventArrivalWindow && (timeFrom < eventArrivalWindow.earliest || timeFrom > eventArrivalWindow.latest)) {
      return res.status(400).json({ message: 'Arrival time must be within the selected event session and no earlier than one hour before it starts.' });
    }
    const depositAmount = Number(deposit.depositAmount);
    const rental = rentalAmount ? Number(rentalAmount) : 0;
    const totalAmount = rental + depositAmount + Number(entryBreakdown?.amount || 0);
    if (!customerEmail) {
      return res.status(400).json({ message: 'Email is required so we can send the QR code and PDF confirmation.' });
    }

    const paymentComment = buildPaymentComment({ rentalAmount: rental, depositAmount, entryBreakdown, totalAmount });
    const commentCustomer = [normalizeText(req.body.commentCustomer), paymentComment].filter(Boolean).join('\n\n');
    const ticketCode = generateTicketCode();

    const isAwaitingPayment = totalAmount > 0;

    const reservation = await reservationService.createReservation({
      tableId,
      mapId,
      zoneId,
      eventId: entryBreakdown?.eventId || event?.id || null,
      customerName: req.body.customerName,
      customerPhone: req.body.customerPhone,
      customerEmail,
      guests,
      reservationDate,
      timeFrom,
      timeTo,
      bookingKind,
      commentCustomer,
      commentAdmin: paymentComment,
      depositRequired: depositAmount > 0,
      depositAmount,
      rentalAmount: rental > 0 ? rental : null,
      status: isAwaitingPayment ? 'AWAITING_PAYMENT' : 'CONFIRMED',
      expiresAt: isAwaitingPayment ? new Date(Date.now() + 15 * 60 * 1000) : null,
      source: event ? 'EVENT' : 'WEB',
      ticketCode,
      analyticsDistinctId: req.body.analyticsDistinctId || null
    });

    let linkedTicketOrder = null;
    if (entryBreakdown?.ticketTypeId) {
      const ticketOrderResult = await ticketSalesService.createOrder({
        eventId: entryBreakdown.eventId,
        eventSessionId: entryBreakdown.eventSessionId,
        customerName: req.body.customerName,
        customerEmail,
        customerPhone: req.body.customerPhone,
        items: [{ ticketTypeId: entryBreakdown.ticketTypeId, quantity: guests }],
        enforceSalesWindow: true,
        expiresAt: reservation.expiresAt
      });
      if (ticketOrderResult.type !== 'SUCCESS') {
        await reservationService.cancelReservationAfterTicketFailure(reservation.id);
        return res.status(ticketOrderResult.type === 'CONFLICT' ? 409 : 400).json({ message: ticketOrderResult.message });
      }
      linkedTicketOrder = ticketOrderResult.order;
    }

    if (holdToken) {
      await reservationService.consumeTableHold(holdToken, reservation.id);
    }

    const access = buildPublicReservationAccess(reservation);
    let checkout = null;
    if (totalAmount > 0) {
      const positionName = getBookingPositionName(table) || `${getBookingPositionLabel(table, bookingKind)} ${table.code || table.id}`;
      const bookingLabel = getBookingPositionLabel(table, bookingKind);
      const returnTo = `/booking?reservation=${encodeURIComponent(access.ticketCode)}&t=${encodeURIComponent(access.token)}${eventSlug ? `&event=${encodeURIComponent(eventSlug)}` : ''}`;
      checkout = await hutkoService.createCheckoutSession({
        reservationId: reservation.id,
        ticketOrderId: linkedTicketOrder?.id || null,
        amount: totalAmount,
        description: `GorPliaj ${bookingLabel} ${positionName}: rental ${rental} UAH, deposit ${depositAmount} UAH${entryBreakdown?.ticketTypeId ? ` + entry ${entryBreakdown.ticketCount} x ${entryBreakdown.ticketPrice} ${entryBreakdown.currency}` : ''}`,
        currency: entryBreakdown?.currency || 'UAH',
        customerEmail,
        customerPhone: req.body.customerPhone,
        returnTo
      });

      if (checkout.type === 'NOT_CONFIGURED') {
        if (linkedTicketOrder) await ticketSalesService.updateOrderStatus(linkedTicketOrder.id, 'CANCELLED');
        await reservationService.cancelReservationAfterTicketFailure(reservation.id);
        return res.status(503).json({ message: checkout.message, reservation, access });
      }
      if (checkout.type === 'PROVIDER_ERROR') {
        if (linkedTicketOrder) await ticketSalesService.updateOrderStatus(linkedTicketOrder.id, 'CANCELLED');
        await reservationService.cancelReservationAfterTicketFailure(reservation.id);
        return res.status(502).json({ message: checkout.message, reservation, access });
      }
    } else {
      // Free booking -> Auto-confirmed and receives the same QR/PDF package as paid bookings.
      try {
        const verifyUrl = buildVerifyUrl(reservation.ticketCode, reservation.reservationDate);
        const statusUrl = buildReservationStatusUrl(reservation.ticketCode, reservation.reservationDate);
        const downloadUrl = buildReservationPdfUrl(reservation.ticketCode, reservation.reservationDate);

        await sendTicketEmail({
          to: customerEmail,
          ticketCode: reservation.ticketCode,
          customerName: reservation.customerName,
          customerPhone: reservation.customerPhone || '',
          reservationDate: reservation.reservationDate,
          timeFrom: reservation.timeFrom,
          timeTo: reservation.timeTo,
          guests: reservation.guests,
          tableName: getBookingPositionName(table),
          zoneName: reservation.zone?.name || '',
          eventTitle: entryBreakdown?.eventTitle || '',
          depositAmount,
          rentalAmount: rental,
          totalPaid: 0,
          entryTicketsAmount: 0,
          verifyUrl,
          statusUrl,
          downloadUrl,
          status: reservation.status,
          paymentStatus: null
        });
      } catch (emailError) {
        console.error(`[reservationController] Failed to send ticket email for free reservation #${reservation.id}:`, emailError.message);
      }
      
      // Send Telegram notification
      try {
        await waiterTelegramService.sendNewReservationMessage(reservation);
      } catch (telegramError) {
        console.error(`[reservationController] Failed to send telegram notification for free reservation #${reservation.id}:`, telegramError.message);
      }
    }

    return res.status(201).json({
      success: true,
      reservation,
      paymentUrl: checkout?.paymentUrl || null,
      paymentId: checkout?.paymentId || null,
      access,
      paymentBreakdown: {
        depositAmount,
        entryTicketsAmount: entryBreakdown?.amount || 0,
        entryTicketCount: entryBreakdown?.ticketCount || 0,
        entryTicketPrice: entryBreakdown?.ticketPrice || 0,
        eventTitle: entryBreakdown?.eventTitle || '',
        totalAmount,
        currency: entryBreakdown?.currency || 'UAH',
        note: 'The booking deposit is included in the final bill at the venue.'
      },
      ticketOrder: linkedTicketOrder ? {
        orderNumber: linkedTicketOrder.orderNumber,
        ticketCount: linkedTicketOrder.tickets?.length || guests
      } : null
    });
  } catch (error) {
    console.error('[reservationController.createReservation] Failed to create reservation.', error);
    return res.status(500).json({ message: 'Unable to create reservation.' });
  }
}

async function getPublicReservationStatus(req, res) {
  try {
    const ticketCode = normalizeText(req.params.ticketCode).toUpperCase();
    const signature = normalizeText(req.query.t);
    const reservation = await reservationService.getPublicReservationByTicketCode(ticketCode);

    if (!reservation) {
      return res.status(404).json({ message: 'Reservation not found.' });
    }
    if (!verifyTicketSignature(ticketCode, reservation.reservationDate, signature)) {
      return res.status(403).json({ message: 'Reservation link is invalid.' });
    }

    if (reservation.payment?.status && !['PAID', 'FAILED', 'REFUNDED', 'CANCELLED'].includes(reservation.payment.status)) {
      await hutkoService.syncReservationPaymentStatus(reservation.id);
    }

    const fresh = await reservationService.getPublicReservationByTicketCode(ticketCode);
    const access = buildPublicReservationAccess(fresh);
    const groupReservations = fresh.groupReservations?.length ? fresh.groupReservations : [fresh];
    const groupDepositAmount = groupReservations.reduce((sum, item) => sum + Number(item.depositAmount || 0), 0);
    const groupRentalAmount = groupReservations.reduce((sum, item) => sum + Number(item.rentalAmount || 0), 0);
    const groupTableNames = groupReservations.map((item) => getBookingPositionName(item.table)).filter(Boolean);
    const groupZoneNames = [...new Set(groupReservations.map((item) => localizeJson(item.zone?.name)).filter(Boolean))];
    return res.json({
      reservation: {
        ticketCode: fresh.ticketCode,
        status: fresh.status,
        paymentStatus: fresh.payment?.status || null,
        paymentAmount: fresh.payment ? Number(fresh.payment.amount || 0) : null,
        rentalAmount: groupRentalAmount,
        depositAmount: groupDepositAmount,
        entryTicketsAmount: Math.max(Number(fresh.payment?.amount || 0) - groupRentalAmount - groupDepositAmount, 0),
        customerName: fresh.customerName,
        guests: Number(fresh.groupGuestCount || fresh.guests),
        tableName: groupTableNames.join(', '),
        positions: groupTableNames,
        bookingKind: fresh.bookingKind || fresh.table?.bookingKind || 'TABLE',
        positionType: fresh.table?.positionType || null,
        zoneName: groupZoneNames.join(', '),
        reservationDate: fresh.reservationDate,
        timeFrom: fresh.timeFrom
      },
      downloadUrl: (fresh.status === 'CONFIRMED' || fresh.payment?.status === 'PAID') ? access.downloadUrl : null
    });
  } catch (error) {
    console.error('[reservationController.getPublicReservationStatus] Failed.', error);
    return res.status(500).json({ message: 'Unable to load reservation status.' });
  }
}

async function downloadPublicReservationPdf(req, res) {
  try {
    const ticketCode = normalizeText(req.params.ticketCode).toUpperCase();
    const signature = normalizeText(req.query.t);
    const reservation = await reservationService.getPublicReservationByTicketCode(ticketCode);

    if (!reservation) {
      return res.status(404).json({ message: 'Reservation not found.' });
    }
    if (!verifyTicketSignature(ticketCode, reservation.reservationDate, signature)) {
      return res.status(403).json({ message: 'Reservation link is invalid.' });
    }
    const canDownloadPdf = reservation.status === 'CONFIRMED' || reservation.payment?.status === 'PAID';
    if (!canDownloadPdf) {
      return res.status(409).json({ message: 'Reservation is not confirmed yet.' });
    }

    const pdf = await generateTicketPdf(buildReservationPdfPayload(reservation));
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="gorpliaj-booking-${ticketCode.toLowerCase()}.pdf"`);
    return res.send(pdf);
  } catch (error) {
    console.error('[reservationController.downloadPublicReservationPdf] Failed.', error);
    return res.status(500).json({ message: 'Unable to generate reservation PDF.' });
  }
}

function normalizeStatusInput(status, validStatuses) {
  if (typeof status !== 'string') return null;

  const trimmedStatus = status.trim();
  const upperCasedStatus = trimmedStatus.toUpperCase();
  if (validStatuses.includes(upperCasedStatus)) return upperCasedStatus;

  return LEGACY_STATUS_ALIASES[trimmedStatus.toLowerCase()] || null;
}

async function updateReservationStatus(req, res) {
  try {
    const id = Number(req.params.id);
    const validStatuses = getReservationStatuses();
    const normalizedStatus = normalizeStatusInput(req.body.status, validStatuses);

    if (!normalizedStatus) {
      return res.status(400).json({ message: 'Invalid reservation status.' });
    }

    const reservation = await reservationService.updateReservationStatus(id, normalizedStatus);
    return res.json(reservation);
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ message: 'Reservation not found.' });
    }

    console.error('[reservationController.updateReservationStatus] Failed to update reservation status.', error);
    return res.status(500).json({ message: 'Unable to update reservation status.' });
  }
}

async function deleteReservation(req, res) {
  try {
    const id = Number(req.params.id);
    const wasDeleted = await reservationService.deleteReservation(id);

    if (!wasDeleted) {
      return res.status(404).json({ message: 'Reservation not found.' });
    }

    return res.status(204).send();
  } catch (error) {
    console.error('[reservationController.deleteReservation] Failed to delete reservation.', error);
    return res.status(500).json({ message: 'Unable to delete reservation.' });
  }
}

module.exports = {
  getReservations,
  createReservation,
  getPublicReservationStatus,
  downloadPublicReservationPdf,
  updateReservationStatus,
  deleteReservation
};
