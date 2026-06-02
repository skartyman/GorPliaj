const express = require('express');
const publicController = require('../../controllers/publicController');
const reservationController = require('../../controllers/reservationController');
const mapController = require('../../controllers/mapController');

const router = express.Router();

router.get('/health', publicController.getHealth);

router.get('/menu', publicController.getMenu);
router.post('/menu/items/:id/like', publicController.setMenuItemLike);
router.get('/events', publicController.getEvents);
router.get('/events/:slug', publicController.getEventBySlug);
router.get('/news', publicController.getNews);
router.get('/settings', publicController.getSettings);
router.get('/maps/default', mapController.getDefaultMap);
router.get('/maps/:mapId', mapController.getMapById);
router.get('/maps/:mapId/availability', mapController.getMapAvailability);

router.post('/reservations', reservationController.createReservation);

module.exports = router;
