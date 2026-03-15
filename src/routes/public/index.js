const express = require('express');
const publicController = require('../../controllers/publicController');
const reservationController = require('../../controllers/reservationController');
const mapController = require('../../controllers/mapController');

const router = express.Router();

router.get('/health', publicController.getHealth);

router.get('/menu', publicController.getMenu);
router.get('/events', publicController.getEvents);
router.get('/news', publicController.getNews);
router.get('/maps/default', mapController.getDefaultMap);

router.get('/reservations', reservationController.getReservations);
router.post('/reservations', reservationController.createReservation);
router.patch('/reservations/:id/status', reservationController.updateReservationStatus);
router.delete('/reservations/:id', reservationController.deleteReservation);

module.exports = router;
