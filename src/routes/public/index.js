const express = require('express');
const publicController = require('../../controllers/publicController');
const reservationController = require('../../controllers/reservationController');
const mapController = require('../../controllers/mapController');

const router = express.Router();

router.get('/health', publicController.getHealth);

router.get('/api/menu', publicController.getMenu);
router.get('/api/events', publicController.getEvents);
router.get('/api/news', publicController.getNews);
router.get('/api/maps/default', mapController.getDefaultMap);

router.get('/api/reservations', reservationController.getReservations);
router.post('/api/reservations', reservationController.createReservation);
router.patch('/api/reservations/:id/status', reservationController.updateReservationStatus);
router.delete('/api/reservations/:id', reservationController.deleteReservation);

module.exports = router;
