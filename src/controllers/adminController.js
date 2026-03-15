const adminAuthService = require('../services/adminAuthService');
const adminReservationService = require('../services/adminReservationService');

function getAdminStatus(req, res) {
  res.json({
    message: 'Admin API is ready',
    ready: true
  });
}

async function loginAdmin(req, res) {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    const authData = await adminAuthService.loginAdmin({ email, password });
    if (!authData) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    return res.json(authData);
  } catch (error) {
    console.error('[adminController.loginAdmin] Failed to login admin.', error);
    return res.status(500).json({ message: 'Unable to login.' });
  }
}

async function getAdminMe(req, res) {
  try {
    const adminId = Number(req.adminAuth.sub);
    const admin = await adminAuthService.getAdminById(adminId);

    if (!admin) {
      return res.status(401).json({ message: 'Unauthorized admin access.' });
    }

    return res.json({
      admin,
      tokenPayload: {
        exp: req.adminAuth.exp
      }
    });
  } catch (error) {
    console.error('[adminController.getAdminMe] Failed to load admin profile.', error);
    return res.status(500).json({ message: 'Unable to get admin profile.' });
  }
}

function logoutAdmin(req, res) {
  return res.json({
    success: true
  });
}

async function getAdminReservations(req, res) {
  try {
    const reservations = await adminReservationService.getAdminReservations();
    return res.json(reservations);
  } catch (error) {
    console.error('[adminController.getAdminReservations] Failed to get reservations.', error);
    return res.status(500).json({ message: 'Unable to load reservations.' });
  }
}

async function getAdminReservationById(req, res) {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ message: 'Reservation id is invalid.' });
    }

    const reservation = await adminReservationService.getAdminReservationById(id);

    if (!reservation) {
      return res.status(404).json({ message: 'Reservation not found.' });
    }

    return res.json({
      reservation,
      allowedNextStatuses: adminReservationService.getAllowedNextStatuses(reservation.status)
    });
  } catch (error) {
    console.error('[adminController.getAdminReservationById] Failed to get reservation details.', error);
    return res.status(500).json({ message: 'Unable to load reservation details.' });
  }
}

async function updateAdminReservationStatus(req, res) {
  try {
    const id = Number(req.params.id);
    const status = String(req.body.status || '').trim().toUpperCase();

    if (!Number.isInteger(id) || id <= 0 || !status) {
      return res.status(400).json({ message: 'Reservation id or status is invalid.' });
    }

    const result = await adminReservationService.updateAdminReservationStatus({ id, status });

    if (result.type === 'NOT_FOUND') {
      return res.status(404).json({ message: 'Reservation not found.' });
    }

    if (result.type === 'INVALID_TRANSITION') {
      return res.status(400).json({
        message: `Invalid status transition from ${result.currentStatus}.`,
        allowedNextStatuses: result.allowedStatuses
      });
    }

    if (result.type === 'NO_OP') {
      return res.json({
        success: true,
        reservation: result.reservation,
        note: 'Status unchanged.'
      });
    }

    return res.json({
      success: true,
      reservation: result.reservation
    });
  } catch (error) {
    console.error('[adminController.updateAdminReservationStatus] Failed to update reservation status.', error);
    return res.status(500).json({ message: 'Unable to update reservation status.' });
  }
}

module.exports = {
  getAdminStatus,
  loginAdmin,
  getAdminMe,
  logoutAdmin,
  getAdminReservations,
  getAdminReservationById,
  updateAdminReservationStatus
};
