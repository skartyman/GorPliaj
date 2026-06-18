const express = require('express');
const {
  getAdminStatus,
  loginAdmin,
  getAdminMe,
  changeAdminPassword,
  logoutAdmin,
  getAdminReservations,
  getAdminReservationById,
  updateAdminReservationStatus,
  deleteAdminReservation,
  createAdminReservation,
  verifyAdminReservation,
  arriveAdminReservation,
  listAdminMaps,
  createAdminMapVariant,
  deleteAdminMapVariant,
  setDefaultAdminMap,
  getDefaultAdminMapEditor,
  getAdminMapEditor,
  updateAdminMapEditor
} = require('../../controllers/adminController');
const {
  getMenuCategories,
  createMenuCategory,
  updateMenuCategory,
  deleteMenuCategory,
  getMenuItems,
  getMenuInsights,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem
} = require('../../controllers/adminMenuController');
const { requireAdminAuth } = require('../../middleware/adminAuth');
const { requirePermission } = require('../../middleware/requirePermission');
const { rateLimiter } = require('../../middleware/rateLimiter');
const {
  getAdminEvents,
  getAdminEventById,
  createAdminEvent,
  updateAdminEvent,
  deleteAdminEvent
} = require('../../controllers/adminEventController');
const {
  getAdminPayments,
  getAdminPaymentById,
  updateAdminPaymentStatus,
  getPaygateConfig
} = require('../../controllers/adminPaymentController');
const {
  getAdminNews,
  getAdminNewsById,
  createAdminNews,
  updateAdminNews,
  deleteAdminNews
} = require('../../controllers/adminNewsController');
const {
  getSettings,
  updateSettings,
  patchSettings
} = require('../../controllers/adminSettingsController');
const { handleTranslate } = require('../../controllers/adminTranslationController');
const {
  upload,
  handleMulterError,
  uploadAdminImage,
  listMapAssets,
  createMapAsset,
  removeMapAsset
} = require('../../controllers/adminUploadController');
const {
  listUsers,
  createUser,
  updateUser,
  deleteUser
} = require('../../controllers/adminUserController');
const {
  listTicketTypes,
  createTicketType,
  updateTicketType,
  deleteTicketType,
  createOrder,
  listOrders,
  getOrder,
  updateOrderStatus,
  listTickets,
  verifyTicket,
  useTicket
} = require('../../controllers/adminTicketSalesController');

const router = express.Router();

router.get('/status', getAdminStatus);

router.post('/auth/login', rateLimiter, loginAdmin);
router.get('/auth/me', requireAdminAuth, getAdminMe);
router.patch('/auth/password', requireAdminAuth, changeAdminPassword);
router.post('/auth/logout', requireAdminAuth, logoutAdmin);

router.get('/reservations', requireAdminAuth, requirePermission('reservations:view'), getAdminReservations);
router.get('/reservations/verify/:ticketCode', requireAdminAuth, requirePermission('reservations:verify'), verifyAdminReservation);
router.get('/reservations/:id', requireAdminAuth, requirePermission('reservations:view'), getAdminReservationById);
router.post('/reservations', requireAdminAuth, createAdminReservation);
router.patch('/reservations/:id/status', requireAdminAuth, requirePermission('reservations:update'), updateAdminReservationStatus);
router.post('/reservations/:id/arrive', requireAdminAuth, requirePermission('reservations:arrive'), arriveAdminReservation);
router.delete('/reservations/:id', requireAdminAuth, requirePermission('reservations:delete'), deleteAdminReservation);

router.get('/maps', requireAdminAuth, requirePermission('map:view'), listAdminMaps);
router.post('/maps', requireAdminAuth, requirePermission('map:edit'), createAdminMapVariant);
router.patch('/maps/:id/default', requireAdminAuth, requirePermission('map:edit'), setDefaultAdminMap);
router.delete('/maps/:id', requireAdminAuth, requirePermission('map:edit'), deleteAdminMapVariant);
router.get('/maps/default/editor', requireAdminAuth, requirePermission('map:view'), getDefaultAdminMapEditor);
router.get('/maps/:id/editor', requireAdminAuth, requirePermission('map:view'), getAdminMapEditor);
router.put('/maps/:id/editor', requireAdminAuth, requirePermission('map:edit'), updateAdminMapEditor);

router.get('/menu/categories', requireAdminAuth, requirePermission('menu:view'), getMenuCategories);
router.post('/menu/categories', requireAdminAuth, requirePermission('menu:edit'), createMenuCategory);
router.patch('/menu/categories/:id', requireAdminAuth, requirePermission('menu:edit'), updateMenuCategory);
router.delete('/menu/categories/:id', requireAdminAuth, requirePermission('menu:edit'), deleteMenuCategory);

router.get('/menu/items', requireAdminAuth, requirePermission('menu:view'), getMenuItems);
router.get('/menu/insights', requireAdminAuth, requirePermission('menu:view'), getMenuInsights);
router.post('/menu/items', requireAdminAuth, requirePermission('menu:edit'), createMenuItem);
router.patch('/menu/items/:id', requireAdminAuth, requirePermission('menu:edit'), updateMenuItem);
router.delete('/menu/items/:id', requireAdminAuth, requirePermission('menu:edit'), deleteMenuItem);

router.get('/events', requireAdminAuth, requirePermission('events:view'), getAdminEvents);
router.get('/events/:id', requireAdminAuth, requirePermission('events:view'), getAdminEventById);
router.post('/events', requireAdminAuth, requirePermission('events:create'), createAdminEvent);
router.patch('/events/:id', requireAdminAuth, requirePermission('events:update'), updateAdminEvent);
router.delete('/events/:id', requireAdminAuth, requirePermission('events:delete'), deleteAdminEvent);
router.get('/events/:eventId/ticket-types', requireAdminAuth, requirePermission('tickets:view'), listTicketTypes);
router.post('/events/:eventId/ticket-types', requireAdminAuth, requirePermission('tickets:manage'), createTicketType);
router.patch('/ticket-types/:id', requireAdminAuth, requirePermission('tickets:manage'), updateTicketType);
router.delete('/ticket-types/:id', requireAdminAuth, requirePermission('tickets:manage'), deleteTicketType);

router.get('/ticket-orders', requireAdminAuth, requirePermission('tickets:view'), listOrders);
router.post('/ticket-orders', requireAdminAuth, requirePermission('tickets:manage'), createOrder);
router.get('/ticket-orders/:id', requireAdminAuth, requirePermission('tickets:view'), getOrder);
router.patch('/ticket-orders/:id/status', requireAdminAuth, requirePermission('tickets:manage'), updateOrderStatus);

router.get('/tickets', requireAdminAuth, requirePermission('tickets:view'), listTickets);
router.get('/tickets/verify/:code', requireAdminAuth, requirePermission('tickets:verify'), verifyTicket);
router.post('/tickets/verify/:code/use', requireAdminAuth, requirePermission('tickets:verify'), useTicket);

router.get('/news', requireAdminAuth, requirePermission('news:view'), getAdminNews);
router.get('/news/:id', requireAdminAuth, requirePermission('news:view'), getAdminNewsById);
router.post('/news', requireAdminAuth, requirePermission('news:create'), createAdminNews);
router.patch('/news/:id', requireAdminAuth, requirePermission('news:update'), updateAdminNews);
router.delete('/news/:id', requireAdminAuth, requirePermission('news:delete'), deleteAdminNews);

router.get('/payments', requireAdminAuth, requirePermission('payments:view'), getAdminPayments);
router.get('/payments/config', requireAdminAuth, requirePermission('payments:view'), getPaygateConfig);
router.get('/payments/:id', requireAdminAuth, requirePermission('payments:view'), getAdminPaymentById);
router.patch('/payments/:id/status', requireAdminAuth, requirePermission('payments:update'), updateAdminPaymentStatus);

router.get('/settings', requireAdminAuth, requirePermission('settings:view'), getSettings);
router.put('/settings', requireAdminAuth, requirePermission('settings:edit'), updateSettings);
router.patch('/settings', requireAdminAuth, requirePermission('settings:edit'), patchSettings);
router.post('/translate', requireAdminAuth, handleTranslate);

router.post('/uploads/image', requireAdminAuth, upload.single('image'), handleMulterError, uploadAdminImage);
router.get('/map-assets', requireAdminAuth, requirePermission('map:view'), listMapAssets);
router.post('/map-assets', requireAdminAuth, requirePermission('map:edit'), createMapAsset);
router.delete('/map-assets/:id', requireAdminAuth, requirePermission('map:edit'), removeMapAsset);

router.get('/users', requireAdminAuth, requirePermission('users:view'), listUsers);
router.post('/users', requireAdminAuth, requirePermission('users:create'), createUser);
router.patch('/users/:id', requireAdminAuth, requirePermission('users:update'), updateUser);
router.delete('/users/:id', requireAdminAuth, requirePermission('users:delete'), deleteUser);

module.exports = router;
