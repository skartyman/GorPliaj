const menuService = require('../services/menuService');
const reservationService = require('../services/reservationService');
const contentService = require('../services/contentService');

function getHealth(req, res) {
  res.json({ status: 'ok' });
}

function getMenu(req, res) {
  res.json(menuService.getMenu());
}

function getEvents(req, res) {
  res.json(contentService.getEvents());
}

function getNews(req, res) {
  res.json(contentService.getNews());
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

function updateReservationStatus(req, res) {
  const id = Number(req.params.id);
  const { status } = req.body;

  if (!['new', 'confirmed', 'cancelled'].includes(status)) {
    return res.status(400).json({ message: 'Некоректний статус бронювання.' });
  }

  const reservation = reservationService.updateReservationStatus(id, status);

  if (!reservation) {
    return res.status(404).json({ message: 'Бронювання не знайдено.' });
  }

  return res.json(reservation);
}

function deleteReservation(req, res) {
  const id = Number(req.params.id);
  const wasDeleted = reservationService.deleteReservation(id);

  if (!wasDeleted) {
    return res.status(404).json({ message: 'Бронювання не знайдено.' });
  }

  return res.status(204).send();
}

function getDefaultMap(req, res) {
  res.json(contentService.getDefaultMap());
}

module.exports = {
  getHealth,
  getMenu,
  getEvents,
  getNews,
  getReservations,
  createReservation,
  updateReservationStatus,
  deleteReservation,
  getDefaultMap
};
