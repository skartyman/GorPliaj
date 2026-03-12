const express = require('express');
const publicController = require('../../controllers/publicController');

const router = express.Router();

router.get('/health', publicController.getHealth);

router.get('/api/menu', publicController.getMenu);
router.get('/api/events', publicController.getEvents);
router.get('/api/news', publicController.getNews);
router.get('/api/maps/default', publicController.getDefaultMap);

router.get('/api/reservations', publicController.getReservations);
router.post('/api/reservations', publicController.createReservation);
router.patch('/api/reservations/:id/status', publicController.updateReservationStatus);
router.delete('/api/reservations/:id', publicController.deleteReservation);

module.exports = router;
