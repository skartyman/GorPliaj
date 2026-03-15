const express = require('express');
const {
  getAdminStatus,
  loginAdmin,
  getAdminMe,
  logoutAdmin,
  getAdminReservations,
  getAdminReservationById,
  updateAdminReservationStatus
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

module.exports = router;
