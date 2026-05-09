const express = require('express');
const {
  getAdminStatus,
  loginAdmin,
  getAdminMe,
  logoutAdmin,
  getAdminReservations,
  getAdminReservationById,
  updateAdminReservationStatus,
  listAdminMaps,
  createAdminMapVariant,
  deleteAdminMapVariant,
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
const {
  getAdminEvents,
  getAdminEventById,
  createAdminEvent,
  updateAdminEvent,
  deleteAdminEvent
} = require('../../controllers/adminEventController');
const {
  getSettings,
  updateSettings,
  patchSettings
} = require('../../controllers/adminSettingsController');
const { handleTranslate } = require('../../controllers/adminTranslationController');
const {
  upload,
  handleMulterError,
  uploadAdminImage
} = require('../../controllers/adminUploadController');

const router = express.Router();

router.get('/status', getAdminStatus);

router.post('/auth/login', loginAdmin);
router.get('/auth/me', requireAdminAuth, getAdminMe);
router.post('/auth/logout', requireAdminAuth, logoutAdmin);

router.get('/reservations', requireAdminAuth, getAdminReservations);
router.get('/reservations/:id', requireAdminAuth, getAdminReservationById);
router.patch('/reservations/:id/status', requireAdminAuth, updateAdminReservationStatus);
router.get('/maps', requireAdminAuth, listAdminMaps);
router.post('/maps', requireAdminAuth, createAdminMapVariant);
router.delete('/maps/:id', requireAdminAuth, deleteAdminMapVariant);
router.get('/maps/default/editor', requireAdminAuth, getDefaultAdminMapEditor);
router.get('/maps/:id/editor', requireAdminAuth, getAdminMapEditor);
router.put('/maps/:id/editor', requireAdminAuth, updateAdminMapEditor);

router.get('/menu/categories', requireAdminAuth, getMenuCategories);
router.post('/menu/categories', requireAdminAuth, createMenuCategory);
router.patch('/menu/categories/:id', requireAdminAuth, updateMenuCategory);
router.delete('/menu/categories/:id', requireAdminAuth, deleteMenuCategory);

router.get('/menu/items', requireAdminAuth, getMenuItems);
router.get('/menu/insights', requireAdminAuth, getMenuInsights);
router.post('/menu/items', requireAdminAuth, createMenuItem);
router.patch('/menu/items/:id', requireAdminAuth, updateMenuItem);
router.delete('/menu/items/:id', requireAdminAuth, deleteMenuItem);

router.get('/events', requireAdminAuth, getAdminEvents);
router.get('/events/:id', requireAdminAuth, getAdminEventById);
router.post('/events', requireAdminAuth, createAdminEvent);
router.patch('/events/:id', requireAdminAuth, updateAdminEvent);
router.delete('/events/:id', requireAdminAuth, deleteAdminEvent);

router.get('/settings', requireAdminAuth, getSettings);
router.put('/settings', requireAdminAuth, updateSettings);
router.patch('/settings', requireAdminAuth, patchSettings);
router.post('/translate', requireAdminAuth, handleTranslate);

router.post('/uploads/image', requireAdminAuth, upload.single('image'), handleMulterError, uploadAdminImage);

module.exports = router;
