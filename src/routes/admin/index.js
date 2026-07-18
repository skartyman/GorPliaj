const express = require('express');
const {
  getAdminStatus,
  loginAdmin,
  getAdminMe,
  changeAdminPassword,
  logoutAdmin,
  getAdminReservations,
  getAdminReservationPositions,
  getAdminReservationById,
  updateAdminReservationPosition,
  upsertAdminReservationPositionOverride,
  deleteAdminReservationPositionOverride,
  updateAdminReservationStatus,
  updateAdminReservationComments,
  deleteAdminReservation,
  createAdminReservation,
  verifyAdminReservation,
  arriveAdminReservation,
  arriveByTicketCodeAdminReservation,
  createAdminTableArrive,
  listAdminMaps,
  createAdminMapVariant,
  deleteAdminMapVariant,
  setDefaultAdminMap,
  activateAdminMapController,
  getDefaultAdminMapEditor,
  getAdminMapEditor,
  updateAdminMapEditor,
  createAdminTable,
  deleteAdminTable,
  batchUpdateAdminTables
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
  deleteAdminEvent,
  listAdminEventSessions,
  createAdminEventSession,
  updateAdminEventSession,
  deleteAdminEventSession
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
  listPositionTypes,
  createPositionType,
  updatePositionType,
  deletePositionType
} = require('../../controllers/adminPositionTypeController');
const waiterService = require('../../services/waiterService');
const tableOrderService = require('../../services/tableOrderService');
const { addWaiterConnection } = require('../../services/waiterSseService');
const QRCode = require('qrcode');
const { APP_BASE_URL } = require('../../config/env');
const {
  listBeachRows,
  createBeachRow,
  updateBeachRow,
  deleteBeachRow
} = require('../../controllers/adminBeachRowController');
const {
  upload,
  handleMulterError,
  uploadAdminImage,
  listMapAssets,
  createMapAsset,
  removeMapAsset,
  deleteGalleryImage,
  reorderGalleryImages
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
const {
  getFinancialReportController,
  getReservationsReportController,
  getTicketSalesReportController,
  getMenuReportController,
  getEventsReportController,
  getStaffReportController,
  getSummaryReportController,
  getOccupancyReportController,
  sendManualReportController,
  listSchedulesController,
  createScheduleController,
  batchCreateScheduleController,
  updateScheduleController,
  deleteScheduleController,
  triggerScheduleController
} = require('../../controllers/adminReportController');

const router = express.Router();

router.get('/status', getAdminStatus);

router.post('/auth/login', rateLimiter, loginAdmin);
router.get('/auth/me', requireAdminAuth, getAdminMe);
router.patch('/auth/password', requireAdminAuth, changeAdminPassword);
router.post('/auth/logout', requireAdminAuth, logoutAdmin);

router.get('/reservations', requireAdminAuth, requirePermission('reservations:view'), getAdminReservations);
router.get('/reservation-positions', requireAdminAuth, requirePermission('reservations:view'), getAdminReservationPositions);
router.patch('/reservation-positions/:tableId', requireAdminAuth, requirePermission('reservations:update'), updateAdminReservationPosition);
router.put('/reservation-positions/:tableId/override', requireAdminAuth, requirePermission('reservations:update'), upsertAdminReservationPositionOverride);
router.delete('/reservation-positions/:tableId/override', requireAdminAuth, requirePermission('reservations:update'), deleteAdminReservationPositionOverride);
router.post('/tables', requireAdminAuth, requirePermission('map:edit'), createAdminTable);
router.delete('/tables/:id', requireAdminAuth, requirePermission('map:edit'), deleteAdminTable);
router.post('/tables/batch', requireAdminAuth, requirePermission('map:edit'), batchUpdateAdminTables);
router.post('/tables/:tableId/arrive', requireAdminAuth, requirePermission('reservations:arrive'), createAdminTableArrive);
router.get('/reservations/verify/:ticketCode', (req, res, next) => {
  if (req.headers.accept && req.headers.accept.includes('text/html')) {
    const ticketCode = req.params.ticketCode;
    const sig = req.query.t || '';
    const view = req.query.view || '';
    const redirectUrl = `/admin/verify-ticket?ticket=${encodeURIComponent(ticketCode)}&t=${encodeURIComponent(sig)}${view ? `&view=${encodeURIComponent(view)}` : ''}`;
    return res.redirect(redirectUrl);
  }
  return next();
}, requireAdminAuth, requirePermission('reservations:verify'), verifyAdminReservation);
router.get('/reservations/:id', requireAdminAuth, requirePermission('reservations:view'), getAdminReservationById);
router.post('/reservations', requireAdminAuth, createAdminReservation);
router.patch('/reservations/:id/status', requireAdminAuth, requirePermission('reservations:update'), updateAdminReservationStatus);
router.patch('/reservations/:id/comments', requireAdminAuth, requirePermission('reservations:update'), updateAdminReservationComments);
router.post('/reservations/arrive-by-ticket/:ticketCode', requireAdminAuth, requirePermission('reservations:arrive'), arriveByTicketCodeAdminReservation);
router.post('/reservations/:id/arrive', requireAdminAuth, requirePermission('reservations:arrive'), arriveAdminReservation);
router.delete('/reservations/:id', requireAdminAuth, requirePermission('reservations:delete'), deleteAdminReservation);

router.get('/maps', requireAdminAuth, requirePermission('map:view'), listAdminMaps);
router.post('/maps', requireAdminAuth, requirePermission('map:edit'), createAdminMapVariant);
router.patch('/maps/:id/default', requireAdminAuth, requirePermission('map:edit'), setDefaultAdminMap);
router.patch('/maps/:id/activate', requireAdminAuth, requirePermission('map:edit'), activateAdminMapController);
router.delete('/maps/:id', requireAdminAuth, requirePermission('map:edit'), deleteAdminMapVariant);
router.get('/maps/default/editor', requireAdminAuth, requirePermission('map:view'), getDefaultAdminMapEditor);
router.get('/maps/:id/editor', requireAdminAuth, requirePermission('map:view'), getAdminMapEditor);
router.put('/maps/:id/editor', requireAdminAuth, requirePermission('map:edit'), updateAdminMapEditor);

router.get('/position-types', requireAdminAuth, requirePermission('map:view'), listPositionTypes);
router.post('/position-types', requireAdminAuth, requirePermission('map:edit'), createPositionType);
router.patch('/position-types/:id', requireAdminAuth, requirePermission('map:edit'), updatePositionType);
router.delete('/position-types/:id', requireAdminAuth, requirePermission('map:edit'), deletePositionType);

router.get('/maps/:mapId/rows', requireAdminAuth, requirePermission('map:view'), listBeachRows);
router.post('/maps/:mapId/rows', requireAdminAuth, requirePermission('map:edit'), createBeachRow);
router.patch('/beach-rows/:id', requireAdminAuth, requirePermission('map:edit'), updateBeachRow);
router.delete('/beach-rows/:id', requireAdminAuth, requirePermission('map:edit'), deleteBeachRow);

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
router.get('/events/:eventId/sessions', requireAdminAuth, requirePermission('events:view'), listAdminEventSessions);
router.post('/events/:eventId/sessions', requireAdminAuth, requirePermission('events:update'), createAdminEventSession);
router.patch('/event-sessions/:id', requireAdminAuth, requirePermission('events:update'), updateAdminEventSession);
router.delete('/event-sessions/:id', requireAdminAuth, requirePermission('events:update'), deleteAdminEventSession);
router.get('/events/:eventId/ticket-types', requireAdminAuth, requirePermission('tickets:view'), listTicketTypes);
router.post('/events/:eventId/ticket-types', requireAdminAuth, requirePermission('tickets:manage'), createTicketType);
router.patch('/ticket-types/:id', requireAdminAuth, requirePermission('tickets:manage'), updateTicketType);
router.delete('/ticket-types/:id', requireAdminAuth, requirePermission('tickets:manage'), deleteTicketType);

router.get('/ticket-orders', requireAdminAuth, requirePermission('tickets:view'), listOrders);
router.post('/ticket-orders', requireAdminAuth, requirePermission('tickets:manage'), createOrder);
router.get('/ticket-orders/:id', requireAdminAuth, requirePermission('tickets:view'), getOrder);
router.patch('/ticket-orders/:id/status', requireAdminAuth, requirePermission('tickets:manage'), updateOrderStatus);

router.get('/tickets', requireAdminAuth, requirePermission('tickets:view'), listTickets);
router.get('/tickets/verify/:code', (req, res, next) => {
  if (req.headers.accept && req.headers.accept.includes('text/html')) {
    const code = req.params.code;
    const sig = req.query.t || '';
    return res.redirect(`/admin/verify-ticket?ticket=${encodeURIComponent(code)}&t=${encodeURIComponent(sig)}`);
  }
  return next();
}, requireAdminAuth, requirePermission('tickets:verify'), verifyTicket);
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
router.post('/uploads/gallery/delete', requireAdminAuth, requirePermission('settings:edit'), deleteGalleryImage);
router.post('/uploads/gallery/reorder', requireAdminAuth, requirePermission('settings:edit'), reorderGalleryImages);
router.get('/map-assets', requireAdminAuth, requirePermission('map:view'), listMapAssets);
router.post('/map-assets', requireAdminAuth, requirePermission('map:edit'), createMapAsset);
router.delete('/map-assets/:id', requireAdminAuth, requirePermission('map:edit'), removeMapAsset);

router.get('/users', requireAdminAuth, requirePermission('users:view'), listUsers);
router.post('/users', requireAdminAuth, requirePermission('users:create'), createUser);
router.patch('/users/:id', requireAdminAuth, requirePermission('users:update'), updateUser);
router.delete('/users/:id', requireAdminAuth, requirePermission('users:delete'), deleteUser);

router.get('/waiters', requireAdminAuth, requirePermission('users:view'), async (req, res) => {
  try { res.json(await waiterService.listWaiters()); }
  catch (err) { res.status(500).json({ message: 'Internal server error.' }); }
});
router.post('/waiters', requireAdminAuth, requirePermission('users:create'), async (req, res) => {
  try {
    const { name, pinCode, telegramChatId } = req.body;
    if (!name || !pinCode) return res.status(400).json({ message: 'name and pinCode are required.' });
    res.status(201).json(await waiterService.createWaiter({ name, pinCode, telegramChatId }));
  } catch (err) { res.status(500).json({ message: err.message }); }
});
router.patch('/waiters/:id', requireAdminAuth, requirePermission('users:update'), async (req, res) => {
  try { res.json(await waiterService.updateWaiter(parseInt(req.params.id, 10), req.body)); }
  catch (err) { res.status(500).json({ message: 'Internal server error.' }); }
});
router.delete('/waiters/:id', requireAdminAuth, requirePermission('users:delete'), async (req, res) => {
  try { await waiterService.deleteWaiter(parseInt(req.params.id, 10)); res.json({ ok: true }); }
  catch (err) { res.status(500).json({ message: 'Internal server error.' }); }
});
router.get('/table-orders', requireAdminAuth, requirePermission('reservations:view'), async (req, res) => {
  try {
    const { date, status, waiterId } = req.query;
    res.json(await tableOrderService.getAllOrders({ date, status, waiterId: waiterId ? parseInt(waiterId, 10) : undefined }));
  } catch (err) { res.status(500).json({ message: 'Internal server error.' }); }
});

router.get('/waiters/qr', requireAdminAuth, requirePermission('users:view'), async (req, res) => {
  try {
    const { code } = req.query;
    if (!code) return res.status(400).json({ message: 'code is required.' });
    const baseUrl = APP_BASE_URL || `${req.protocol}://${req.get('host')}`;
    const url = `${baseUrl}/menu?table=${encodeURIComponent(code)}`;
    const buffer = await QRCode.toBuffer(url, { width: 300, margin: 2, color: { dark: '#000000', light: '#ffffff' } });
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.send(buffer);
  } catch (err) { res.status(500).json({ message: 'Internal server error.' }); }
});

router.get('/waiters/qr-pdf', requireAdminAuth, requirePermission('users:view'), async (req, res) => {
  try {
    const { generateTableQrPdf } = require('../../services/tableQrPdfService');
    const baseUrl = APP_BASE_URL || `${req.protocol}://${req.get('host')}`;
    const pdf = await generateTableQrPdf(baseUrl);
    if (!pdf) return res.status(404).json({ message: 'No tables with codes found.' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="qr-tables.pdf"');
    res.send(pdf);
  } catch (err) { console.error('QR PDF error:', err); res.status(500).json({ message: 'Internal server error.' }); }
});

router.get('/reports/financial', requireAdminAuth, requirePermission('reports:view'), getFinancialReportController);
router.get('/reports/reservations', requireAdminAuth, requirePermission('reports:view'), getReservationsReportController);
router.get('/reports/tickets', requireAdminAuth, requirePermission('reports:view'), getTicketSalesReportController);
router.get('/reports/menu', requireAdminAuth, requirePermission('reports:view'), getMenuReportController);
router.get('/reports/events', requireAdminAuth, requirePermission('reports:view'), getEventsReportController);
router.get('/reports/staff', requireAdminAuth, requirePermission('reports:view'), getStaffReportController);
router.get('/reports/summary', requireAdminAuth, requirePermission('reports:view'), getSummaryReportController);
router.get('/reports/occupancy', requireAdminAuth, requirePermission('reports:view'), getOccupancyReportController);
router.post('/reports/send', requireAdminAuth, requirePermission('reports:manage'), sendManualReportController);
router.get('/report-schedules', requireAdminAuth, requirePermission('reports:manage'), listSchedulesController);
router.post('/report-schedules', requireAdminAuth, requirePermission('reports:manage'), createScheduleController);
router.post('/report-schedules/batch', requireAdminAuth, requirePermission('reports:manage'), batchCreateScheduleController);
router.patch('/report-schedules/:id', requireAdminAuth, requirePermission('reports:manage'), updateScheduleController);
router.delete('/report-schedules/:id', requireAdminAuth, requirePermission('reports:manage'), deleteScheduleController);
router.post('/report-schedules/:id/trigger', requireAdminAuth, requirePermission('reports:manage'), triggerScheduleController);

module.exports = router;
