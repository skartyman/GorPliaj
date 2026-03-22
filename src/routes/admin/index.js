const express = require('express');
const {
  getAdminStatus,
  loginAdmin,
  getAdminMe,
  logoutAdmin,
  getAdminReservations,
  getAdminReservationById,
  updateAdminReservationStatus,
  getDefaultAdminMapEditor,
  getAdminMapEditor,
  updateAdminMapEditor
} = require('../../controllers/adminController');
const { requireAdminAuth } = require('../../middleware/adminAuth');

const router = express.Router();

router.get('/status', getAdminStatus);

router.post('/auth/login', loginAdmin);
router.get('/auth/me', requireAdminAuth, getAdminMe);
router.post('/auth/logout', requireAdminAuth, logoutAdmin);

router.get('/reservations', requireAdminAuth, getAdminReservations);
router.get('/reservations/:id', requireAdminAuth, getAdminReservationById);
router.patch('/reservations/:id/status', requireAdminAuth, updateAdminReservationStatus);
router.get('/maps/default/editor', requireAdminAuth, getDefaultAdminMapEditor);
router.get('/maps/:id/editor', requireAdminAuth, getAdminMapEditor);
router.put('/maps/:id/editor', requireAdminAuth, updateAdminMapEditor);

module.exports = router;
