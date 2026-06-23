const express = require('express');
const publicController = require('../../controllers/publicController');
const reservationController = require('../../controllers/reservationController');
const mapController = require('../../controllers/mapController');
const holdController = require('../../controllers/holdController');
const publicTicketSalesController = require('../../controllers/publicTicketSalesController');

const router = express.Router();

router.get('/health', publicController.getHealth);

router.get('/menu', publicController.getMenu);
router.post('/menu/items/:id/like', publicController.setMenuItemLike);
router.get('/events', publicController.getEvents);
router.get('/events/:slug', publicController.getEventBySlug);
router.get('/events/:slug/ticket-types', publicTicketSalesController.getEventTicketTypes);
router.post('/events/:slug/ticket-orders', publicTicketSalesController.createTicketOrder);
router.get('/ticket-orders/:orderNumber/status', publicTicketSalesController.getTicketOrderStatus);
router.get('/ticket-orders/:orderNumber/pdf', publicTicketSalesController.downloadTicketOrderPdf);
router.get('/news', publicController.getNews);
router.get('/position-types', publicController.listPositionTypes);
router.get('/settings', publicController.getSettings);
router.get('/maps', mapController.listPublicMaps);
router.get('/maps/default', mapController.getDefaultMap);
router.get('/maps/:mapId', mapController.getMapById);
router.get('/maps/:mapId/availability', mapController.getMapAvailability);
router.get('/maps/:mapId/bookable-units', mapController.getMapBookableUnits);

router.post('/holds', holdController.createHold);
router.delete('/holds/:holdToken', holdController.releaseHold);

router.get('/reservations/:ticketCode/status', reservationController.getPublicReservationStatus);
router.get('/reservations/:ticketCode/pdf', reservationController.downloadPublicReservationPdf);
router.post('/reservations', reservationController.createReservation);

module.exports = router;
