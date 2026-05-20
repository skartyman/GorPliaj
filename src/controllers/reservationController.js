const reservationService = require('../services/reservationService');
const { getClosingDateTime, toDateTime } = require('../utils/venueTime');

const LEGACY_STATUS_ALIASES = {
  new: 'PENDING',
  confirmed: 'CONFIRMED',
  cancelled: 'CANCELLED'
};

let cachedReservationStatuses = null;

function getReservationStatuses() {
  if (cachedReservationStatuses) {
    return cachedReservationStatuses;
  }

  const { ReservationStatus } = require('@prisma/client');
  cachedReservationStatuses = Object.values(ReservationStatus);
  return cachedReservationStatuses;
}

async function getReservations(req, res) {
  try {
    const reservations = await reservationService.getReservations();
    return res.json(reservations);
  } catch (error) {
    console.error('[reservationController.getReservations] Failed to get reservations.', error);
    return res.status(500).json({ message: 'Не вдалося отримати бронювання.' });
  }
}

function hasMissingRequiredFields(body) {
  const requiredFields = [
    'tableId',
    'mapId',
    'zoneId',
    'customerName',
    'customerPhone',
    'guests',
    'reservationDate',
    'timeFrom'
  ];

  return requiredFields.some((field) => !body[field]);
}

function getDepositFromObject(object) {
  const meta = object?.metaJson && typeof object.metaJson === 'object' ? object.metaJson : {};
  const amount = Number(meta.depositAmount ?? meta.deposit ?? 0);
  return {
    depositRequired: Boolean(meta.depositRequired) || amount > 0,
    depositAmount: Number.isFinite(amount) && amount > 0 ? amount : null
  };
}

async function createReservation(req, res) {
  try {
    if (hasMissingRequiredFields(req.body)) {
      return res.status(400).json({ message: 'Заповніть обов’язкові поля бронювання.' });
    }

    const guests = Number(req.body.guests);
    if (!Number.isFinite(guests) || guests <= 0) {
      return res.status(400).json({ message: 'Кількість гостей має бути більшою за 0.' });
    }

    const reservationDate = new Date(`${req.body.reservationDate}T00:00:00`);
    const timeFrom = toDateTime(req.body.reservationDate, req.body.timeFrom);
    const timeTo = getClosingDateTime(req.body.reservationDate);

    if (Number.isNaN(reservationDate.getTime()) || Number.isNaN(timeFrom.getTime()) || Number.isNaN(timeTo.getTime())) {
      return res.status(400).json({ message: 'Некоректні дата або час бронювання.' });
    }

    if (timeFrom >= timeTo) {
      return res.status(400).json({ message: 'Час початку має бути раніше за час закриття закладу.' });
    }

    const tableId = Number(req.body.tableId);
    const mapId = Number(req.body.mapId);
    const zoneId = Number(req.body.zoneId);
    const conflict = await reservationService.findReservationConflict({
      tableId,
      reservationDate,
      timeFrom,
      timeTo
    });

    if (conflict) {
      return res.status(409).json({ message: 'Стіл уже заброньований на обраний проміжок часу.' });
    }

    const objectId = Number(req.body.objectId || 0);
    let deposit = { depositRequired: false, depositAmount: null };
    if (objectId) {
      const reservationObject = await reservationService.getReservationObject({ objectId, mapId, tableId });
      if (!reservationObject) {
        return res.status(400).json({ message: 'Selected map object is not available for booking.' });
      }
      deposit = getDepositFromObject(reservationObject);
    }

    const reservation = await reservationService.createReservation({
      tableId,
      mapId,
      zoneId,
      customerName: req.body.customerName,
      customerPhone: req.body.customerPhone,
      guests,
      reservationDate,
      timeFrom,
      timeTo,
      commentCustomer: req.body.commentCustomer,
      depositRequired: deposit.depositRequired,
      depositAmount: deposit.depositAmount
    });

    return res.status(201).json({
      success: true,
      reservation
    });
  } catch (error) {
    console.error('[reservationController.createReservation] Failed to create reservation.', error);
    return res.status(500).json({ message: 'Не вдалося створити бронювання.' });
  }
}

function normalizeStatusInput(status, validStatuses) {
  if (typeof status !== 'string') {
    return null;
  }

  const trimmedStatus = status.trim();
  const upperCasedStatus = trimmedStatus.toUpperCase();

  if (validStatuses.includes(upperCasedStatus)) {
    return upperCasedStatus;
  }

  return LEGACY_STATUS_ALIASES[trimmedStatus.toLowerCase()] || null;
}

async function updateReservationStatus(req, res) {
  try {
    const id = Number(req.params.id);
    const validStatuses = getReservationStatuses();
    const normalizedStatus = normalizeStatusInput(req.body.status, validStatuses);

    if (!normalizedStatus) {
      return res.status(400).json({ message: 'Некоректний статус бронювання.' });
    }

    const reservation = await reservationService.updateReservationStatus(id, normalizedStatus);
    return res.json(reservation);
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ message: 'Бронювання не знайдено.' });
    }

    console.error('[reservationController.updateReservationStatus] Failed to update reservation status.', error);
    return res.status(500).json({ message: 'Не вдалося оновити статус бронювання.' });
  }
}

async function deleteReservation(req, res) {
  try {
    const id = Number(req.params.id);
    const wasDeleted = await reservationService.deleteReservation(id);

    if (!wasDeleted) {
      return res.status(404).json({ message: 'Бронювання не знайдено.' });
    }

    return res.status(204).send();
  } catch (error) {
    console.error('[reservationController.deleteReservation] Failed to delete reservation.', error);
    return res.status(500).json({ message: 'Не вдалося видалити бронювання.' });
  }
}

module.exports = {
  getReservations,
  createReservation,
  updateReservationStatus,
  deleteReservation
};
