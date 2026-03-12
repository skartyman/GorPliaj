const reservationService = require('../services/reservationService');

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

function getReservations(req, res) {
  res.json(reservationService.getReservations());
}

function createReservation(req, res) {
  const { guestName, phone, date, time, guests, zone } = req.body;

  if (!guestName || !phone || !date || !time || !guests || !zone) {
    return res.status(400).json({ message: 'Заповніть обов’язкові поля бронювання.' });
  }

  const reservation = reservationService.createReservation(req.body);
  return res.status(201).json(reservation);
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

function updateReservationStatus(req, res) {
  try {
    const id = Number(req.params.id);
    const validStatuses = getReservationStatuses();
    const normalizedStatus = normalizeStatusInput(req.body.status, validStatuses);

    if (!normalizedStatus) {
      return res.status(400).json({ message: 'Некоректний статус бронювання.' });
    }

    const reservation = reservationService.updateReservationStatus(id, normalizedStatus);

    if (!reservation) {
      return res.status(404).json({ message: 'Бронювання не знайдено.' });
    }

    return res.json(reservation);
  } catch (error) {
    console.error('[reservationController.updateReservationStatus] Failed to update reservation status.', error);
    return res.status(500).json({ message: 'Не вдалося оновити статус бронювання.' });
  }
}

function deleteReservation(req, res) {
  const id = Number(req.params.id);
  const wasDeleted = reservationService.deleteReservation(id);

  if (!wasDeleted) {
    return res.status(404).json({ message: 'Бронювання не знайдено.' });
  }

  return res.status(204).send();
}

module.exports = {
  getReservations,
  createReservation,
  updateReservationStatus,
  deleteReservation
};
