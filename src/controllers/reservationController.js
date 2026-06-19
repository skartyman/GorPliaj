const reservationService = require('../services/reservationService');
const bookableUnitService = require('../services/bookableUnitService');
const hutkoService = require('../services/hutkoService');
const { generateTicketCode } = require('../utils/ticket');
const { buildVerifyUrl, generateTicketSignature, verifyTicketSignature } = require('../utils/ticketSignature');
const { generateTicketPdf } = require('../services/ticketPdfService');
const { getClosingDateTime, toDateTime } = require('../utils/venueTime');

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
  return new Date(value).toISOString().slice(0, 10);
}

function isSameBookingDay(left, right) {
  if (!left || !right) return false;
  return toDateOnly(left) === toDateOnly(right);
}

async function getReservations(req, res) {
  try {
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

  return requiredFields.some((field) => !body[field]) || (!hasLegacySelection && !hasBookableUnitSelection);
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
    ticketTypeName: localizeJson(ticketType.name),
    ticketPrice: price,
    ticketCount: guests,
    amount: price * guests,
    currency: ticketType.currency || 'UAH'
  };
}

function buildPaymentComment({ depositAmount, entryBreakdown, totalAmount }) {
  const lines = [];

  if (depositAmount > 0) {
    lines.push(`Booking deposit paid online: ${depositAmount} UAH.`);
    lines.push('Important: this deposit is included in the final bill at the venue.');
  } else {
    lines.push('Booking is free: no deposit was configured for this position.');
  }

  lines.push(`Total online payment: ${totalAmount} UAH.`);

  if (entryBreakdown) {
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
  const totalPaid = Number(reservation.payment?.amount || 0);
  const depositAmount = Number(reservation.depositAmount || 0);
  const entryTicketsAmount = Math.max(totalPaid - depositAmount, 0);

  return {
    ticketCode: reservation.ticketCode,
    customerName: reservation.customerName,
    customerPhone: reservation.customerPhone || '',
    guests: reservation.guests,
    reservationDate: reservation.reservationDate,
    timeFrom: reservation.timeFrom,
    timeTo: reservation.timeTo,
    tableName: getBookingPositionName(reservation.table),
    zoneName: reservation.zone?.name || '',
    eventTitle: localizeJson(reservation.event?.title),
    depositAmount,
    totalPaid,
    entryTicketsAmount,
    entryTicketCount: entryTicketsAmount > 0 ? reservation.guests : 0,
    entryTicketPrice: entryTicketsAmount > 0 && reservation.guests ? entryTicketsAmount / reservation.guests : 0,
    status: reservation.status,
    paymentStatus: reservation.payment?.status || null,
    verifyUrl: buildVerifyUrl(reservation.ticketCode, reservation.reservationDate)
  };
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

    const reservationDate = new Date(`${req.body.reservationDate}T00:00:00`);
    const timeFrom = toDateTime(req.body.reservationDate, req.body.timeFrom);
    const timeTo = getClosingDateTime(req.body.reservationDate);

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

    if (!reservationService.matchesGuestCapacity(table, guests)) {
      return res.status(400).json({ message: 'Guest count does not match the selected position capacity.' });
    }

    const conflict = await reservationService.findReservationConflict({ tableId, reservationDate, timeFrom, timeTo });
    if (conflict) {
      return res.status(409).json({ message: 'This position is already booked for the selected time.' });
    }

    const objectId = Number(req.body.objectId || bookableUnit?.objectId || 0);
    const tableDeposit = Number(table.deposit || 0);
    let deposit = {
      depositRequired: tableDeposit > 0,
      depositAmount: tableDeposit > 0 ? tableDeposit : null
    };
    if (bookableUnit?.depositAmount > 0) {
      deposit = {
        depositRequired: true,
        depositAmount: Number(bookableUnit.depositAmount)
      };
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

    const entryBreakdown = getEventEntryBreakdown(event, reservationDate, guests);
    const eventMatchesReservationDay = event && (
      isSameBookingDay(event.startAt, reservationDate)
      || event.ticketTypes?.some((ticketType) => ticketType.eventSession?.isActive && isSameBookingDay(ticketType.eventSession.startsAt, reservationDate))
    );
    if (eventMatchesReservationDay && !entryBreakdown) {
      return res.status(409).json({ message: 'Entry tickets for this event are not available for the selected guest count.' });
    }
    const depositAmount = Number(deposit.depositAmount);
    const totalAmount = depositAmount + Number(entryBreakdown?.amount || 0);
    if (totalAmount > 0 && !customerEmail) {
      return res.status(400).json({ message: 'Email is required for paid bookings so we can send the PDF confirmation.' });
    }

    const paymentComment = buildPaymentComment({ depositAmount, entryBreakdown, totalAmount });
    const commentCustomer = [normalizeText(req.body.commentCustomer), paymentComment].filter(Boolean).join('\n\n');
    const ticketCode = generateTicketCode();

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
      status: totalAmount > 0 ? 'AWAITING_PAYMENT' : 'PENDING',
      source: event ? 'EVENT' : 'WEB',
      ticketCode
    });

    const access = buildPublicReservationAccess(reservation);
    let checkout = null;
    if (totalAmount > 0) {
      const positionName = getBookingPositionName(table) || `${getBookingPositionLabel(table, bookingKind)} ${table.code || table.id}`;
      const bookingLabel = getBookingPositionLabel(table, bookingKind);
      const returnTo = `/booking?reservation=${encodeURIComponent(access.ticketCode)}&t=${encodeURIComponent(access.token)}${eventSlug ? `&event=${encodeURIComponent(eventSlug)}` : ''}`;
      checkout = await hutkoService.createCheckoutSession({
        reservationId: reservation.id,
        amount: totalAmount,
        description: `GorPliaj ${bookingLabel} ${positionName}: deposit ${depositAmount} UAH${entryBreakdown ? ` + entry ${entryBreakdown.ticketCount} x ${entryBreakdown.ticketPrice} ${entryBreakdown.currency}` : ''}`,
        currency: entryBreakdown?.currency || 'UAH',
        customerEmail,
        customerPhone: req.body.customerPhone,
        returnTo
      });

      if (checkout.type === 'NOT_CONFIGURED') {
        return res.status(503).json({ message: checkout.message, reservation, access });
      }
      if (checkout.type === 'PROVIDER_ERROR') {
        return res.status(502).json({ message: checkout.message, reservation, access });
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
      }
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
    return res.json({
      reservation: {
        ticketCode: fresh.ticketCode,
        status: fresh.status,
        paymentStatus: fresh.payment?.status || null,
        paymentAmount: fresh.payment ? Number(fresh.payment.amount || 0) : null,
        customerName: fresh.customerName,
        guests: fresh.guests,
        tableName: getBookingPositionName(fresh.table),
        bookingKind: fresh.bookingKind || fresh.table?.bookingKind || 'TABLE',
        positionType: fresh.table?.positionType || null,
        zoneName: fresh.zone?.name || '',
        reservationDate: fresh.reservationDate,
        timeFrom: fresh.timeFrom
      },
      downloadUrl: fresh.payment?.status === 'PAID' ? access.downloadUrl : null
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
    if (reservation.payment?.status !== 'PAID') {
      return res.status(409).json({ message: 'Reservation is not paid yet.' });
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
