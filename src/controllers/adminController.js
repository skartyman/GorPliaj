const adminAuthService = require('../services/adminAuthService');
const adminReservationService = require('../services/adminReservationService');
const adminMapEditorService = require('../services/adminMapEditorService');
const reservationService = require('../services/reservationService');
const { ADMIN_AUTH_COOKIE_NAME } = require('../middleware/adminAuth');
const { NODE_ENV } = require('../config/env');
const { getClosingDateTime, toDateTime } = require('../utils/venueTime');
const { generateTicketCode } = require('../utils/ticket');
const prisma = require('../lib/prisma');

function buildAuthCookie(token) {
  const maxAgeSeconds = Math.floor(adminAuthService.getTokenTtlMs() / 1000);
  const parts = [
    `${ADMIN_AUTH_COOKIE_NAME}=${encodeURIComponent(token)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${maxAgeSeconds}`
  ];

  if (NODE_ENV === 'production') {
    parts.push('Secure');
  }

  return parts.join('; ');
}

function buildLogoutCookie() {
  const parts = [
    `${ADMIN_AUTH_COOKIE_NAME}=`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    'Max-Age=0'
  ];

  if (NODE_ENV === 'production') {
    parts.push('Secure');
  }

  return parts.join('; ');
}

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

    res.setHeader('Set-Cookie', buildAuthCookie(authData.token));

    return res.json({
      admin: authData.admin
    });
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
  res.setHeader('Set-Cookie', buildLogoutCookie());

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


async function deleteAdminReservation(req, res) {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ message: 'Invalid reservation id.' });
    }

    const wasDeleted = await adminReservationService.deleteAdminReservation(id);

    if (!wasDeleted) {
      return res.status(404).json({ message: 'Reservation not found.' });
    }

    return res.status(204).send();
  } catch (error) {
    console.error('[adminController.deleteAdminReservation] Failed to delete reservation.', error);
    return res.status(500).json({ message: 'Unable to delete reservation.' });
  }
}

async function getAdminMapEditor(req, res) {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ message: 'Map id is invalid.' });
    }

    const mapEditorData = await adminMapEditorService.getAdminMapEditor(id);

    if (!mapEditorData) {
      return res.status(404).json({ message: 'Map not found.' });
    }

    return res.json(mapEditorData);
  } catch (error) {
    console.error('[adminController.getAdminMapEditor] Failed to load map editor data.', error);
    return res.status(500).json({ message: 'Unable to load map editor data.' });
  }
}

async function getDefaultAdminMapEditor(req, res) {
  try {
    const mapEditorData = await adminMapEditorService.getDefaultAdminMapEditor();

    if (!mapEditorData) {
      return res.status(404).json({ message: 'Default map not found.' });
    }

    return res.json(mapEditorData);
  } catch (error) {
    console.error('[adminController.getDefaultAdminMapEditor] Failed to load default map editor data.', error);
    return res.status(500).json({ message: 'Unable to load default map editor data.' });
  }
}

async function listAdminMaps(req, res) {
  try {
    const maps = await adminMapEditorService.listAdminMaps();
    return res.json({ maps });
  } catch (error) {
    console.error('[adminController.listAdminMaps] Failed to list maps.', error);
    return res.status(500).json({ message: 'Unable to load maps list.' });
  }
}

async function createAdminMapVariant(req, res) {
  try {
    const result = await adminMapEditorService.createAdminMapVariant({
      name: req.body?.name,
      slug: req.body?.slug,
      description: req.body?.description,
      sourceMapId: req.body?.sourceMapId,
      creationMode: req.body?.creationMode,
      width: req.body?.width,
      height: req.body?.height,
      backgroundColor: req.body?.backgroundColor,
      makeDefault: req.body?.makeDefault
    });

    if (result.type === 'INVALID') {
      return res.status(400).json({ message: result.message });
    }

    if (result.type === 'CONFLICT') {
      return res.status(409).json({ message: result.message });
    }

    if (result.type === 'NOT_FOUND') {
      return res.status(404).json({ message: result.message });
    }

    return res.status(201).json({
      success: true,
      ...result.data
    });
  } catch (error) {
    console.error('[adminController.createAdminMapVariant] Failed to create map variant.', error);
    return res.status(500).json({ message: 'Unable to create map variant.' });
  }
}

async function deleteAdminMapVariant(req, res) {
  try {
    const id = Number(req.params.id);
    const result = await adminMapEditorService.deleteAdminMapVariant(id);

    if (result.type === 'INVALID') {
      return res.status(400).json({ message: result.message });
    }

    if (result.type === 'NOT_FOUND') {
      return res.status(404).json({ message: result.message });
    }

    return res.json({ success: true });
  } catch (error) {
    console.error('[adminController.deleteAdminMapVariant] Failed to delete map variant.', error);
    return res.status(500).json({ message: 'Unable to delete map variant.' });
  }
}

async function setDefaultAdminMap(req, res) {
  try {
    const id = Number(req.params.id);
    const result = await adminMapEditorService.setDefaultAdminMap(id);

    if (result.type === 'INVALID') {
      return res.status(400).json({ message: result.message });
    }

    if (result.type === 'NOT_FOUND') {
      return res.status(404).json({ message: result.message });
    }

    return res.json({
      success: true,
      ...result.data
    });
  } catch (error) {
    console.error('[adminController.setDefaultAdminMap] Failed to set default map.', error);
    return res.status(500).json({ message: 'Unable to set default map.' });
  }
}

async function updateAdminMapEditor(req, res) {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ message: 'Map id is invalid.' });
    }

    const result = await adminMapEditorService.updateAdminMapEditor(
      id,
      req.body.objects,
      req.body.map || {},
      Array.isArray(req.body.tables) ? req.body.tables : []
    );

    if (result.type === 'NOT_FOUND') {
      return res.status(404).json({ message: 'Map not found.' });
    }

    if (result.type === 'INVALID') {
      return res.status(400).json({ message: result.message });
    }

    return res.json({
      success: true,
      ...result.data
    });
  } catch (error) {
    console.error('[adminController.updateAdminMapEditor] Failed to save map editor data.', error);
    return res.status(500).json({ message: 'Unable to save map editor data.' });
  }
}

async function createAdminReservation(req, res) {
  try {
    const body = req.body || {};
    const requiredFields = ['tableId', 'mapId', 'zoneId', 'customerName', 'customerPhone', 'guests', 'reservationDate', 'timeFrom'];
    const missing = requiredFields.filter((f) => !body[f]);
    if (missing.length) {
      return res.status(400).json({ message: `Missing required fields: ${missing.join(', ')}` });
    }

    const role = req.adminAuth.role;
    const source = body.source || null;

    if (source) {
      const socialSources = ['INSTAGRAM', 'FACEBOOK'];
      const phoneSource = 'PHONE';
      if (role === 'seo_smm' && !socialSources.includes(source)) {
        return res.status(403).json({ message: 'SEO/SMM can only create reservations with Instagram or Facebook source.' });
      }
      if (role === 'hostess' && ![...socialSources, phoneSource, 'WALK_IN'].includes(source)) {
        return res.status(403).json({ message: 'Hostess cannot create reservations with this source.' });
      }
    }

    const guests = Number(body.guests);
    if (!Number.isFinite(guests) || guests <= 0) {
      return res.status(400).json({ message: 'Guests must be greater than 0.' });
    }

    const reservationDate = new Date(`${body.reservationDate}T00:00:00`);
    const timeFrom = toDateTime(body.reservationDate, body.timeFrom);
    const timeTo = body.timeTo ? toDateTime(body.reservationDate, body.timeTo) : getClosingDateTime(body.reservationDate);

    if (Number.isNaN(reservationDate.getTime()) || Number.isNaN(timeFrom.getTime()) || Number.isNaN(timeTo.getTime())) {
      return res.status(400).json({ message: 'Invalid date or time.' });
    }

    if (timeFrom >= timeTo) {
      return res.status(400).json({ message: 'Start time must be before end time.' });
    }

    const tableId = Number(body.tableId);
    const mapId = Number(body.mapId);
    const zoneId = Number(body.zoneId);

    const conflict = await reservationService.findReservationConflict({ tableId, reservationDate, timeFrom, timeTo });
    if (conflict) {
      return res.status(409).json({ message: 'Table is already booked for this time.' });
    }

    const ticketCode = generateTicketCode();

    const reservation = await prisma.reservation.create({
      data: {
        tableId,
        mapId,
        zoneId,
        eventId: body.eventId ? Number(body.eventId) : null,
        customerName: body.customerName,
        customerPhone: body.customerPhone,
        customerEmail: body.customerEmail || null,
        guests,
        reservationDate,
        timeFrom,
        timeTo,
        source: source || undefined,
        ticketCode,
        commentCustomer: body.commentCustomer || null,
        commentAdmin: body.commentAdmin || null,
        depositRequired: Boolean(body.depositRequired),
        depositAmount: body.depositAmount ? Number(body.depositAmount) : null,
        status: body.status || 'PENDING'
      },
      include: {
        table: { select: { id: true, name: true, code: true } },
        zone: { select: { id: true, name: true } }
      }
    });

    return res.status(201).json({ reservation });
  } catch (error) {
    console.error('[adminController.createAdminReservation] Failed to create reservation.', error);
    return res.status(500).json({ message: 'Unable to create reservation.' });
  }
}

async function verifyAdminReservation(req, res) {
  try {
    const ticketCode = String(req.params.ticketCode || '').trim();
    if (!ticketCode) {
      return res.status(400).json({ message: 'Ticket code is required.' });
    }

    const reservation = await prisma.reservation.findUnique({
      where: { ticketCode },
      include: {
        table: { select: { id: true, name: true } },
        zone: { select: { id: true, name: true } },
        payment: true
      }
    });

    if (!reservation) {
      return res.status(404).json({ message: 'Ticket not found.' });
    }

    return res.json({
      reservation: {
        id: reservation.id,
        ticketCode: reservation.ticketCode,
        customerName: reservation.customerName,
        customerPhone: reservation.customerPhone,
        customerEmail: reservation.customerEmail,
        guests: reservation.guests,
        reservationDate: reservation.reservationDate,
        timeFrom: reservation.timeFrom,
        timeTo: reservation.timeTo,
        status: reservation.status,
        source: reservation.source,
        arrivedAt: reservation.arrivedAt,
        arrivedGuests: reservation.arrivedGuests,
        table: reservation.table,
        zone: reservation.zone,
        paymentStatus: reservation.payment?.status || null,
        paymentAmount: reservation.payment?.amount || null,
        paidAt: reservation.payment?.paidAt || null
      }
    });
  } catch (error) {
    console.error('[adminController.verifyAdminReservation] Failed to verify ticket.', error);
    return res.status(500).json({ message: 'Unable to verify ticket.' });
  }
}

async function arriveAdminReservation(req, res) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ message: 'Invalid reservation id.' });
    }

    const existing = await prisma.reservation.findUnique({
      where: { id },
      select: { id: true, arrivedAt: true }
    });
    if (!existing) {
      return res.status(404).json({ message: 'Reservation not found.' });
    }
    if (existing.arrivedAt) {
      return res.status(409).json({ message: 'Guests have already arrived.' });
    }

    const arrivedGuests = req.body.arrivedGuests ? Number(req.body.arrivedGuests) : null;

    const reservation = await prisma.reservation.update({
      where: { id },
      data: {
        arrivedAt: new Date(),
        arrivedGuests,
        status: 'COMPLETED'
      },
      include: {
        table: { select: { id: true, name: true } },
        zone: { select: { id: true, name: true } }
      }
    });

    return res.json({ reservation });
  } catch (error) {
    console.error('[adminController.arriveAdminReservation] Failed to mark arrival.', error);
    return res.status(500).json({ message: 'Unable to mark arrival.' });
  }
}

module.exports = {
  getAdminStatus,
  loginAdmin,
  getAdminMe,
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
};
