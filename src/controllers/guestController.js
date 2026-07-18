const prisma = require('../lib/prisma');
const guestAuthService = require('../services/guestAuthService');
const { sendGuestMagicLinkEmail } = require('../services/emailService');
const { getBaseUrl } = require('../utils/deliveryPresentation');

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

async function requestMagicLink(req, res) {
  try {
    const email = normalizeEmail(req.body.email);
    if (!email || !email.includes('@')) {
      return res.status(400).json({ message: 'Valid email is required.' });
    }
    const guest = await guestAuthService.findOrCreateGuest({
      email,
      phone: req.body.phone || null,
      name: req.body.name || null
    });
    const link = await guestAuthService.createMagicLink(guest.id);
    const baseUrl = getBaseUrl(req) || (process.env.APP_BASE_URL || 'http://localhost:8080');
    const loginUrl = `${baseUrl}/cabinet?token=${encodeURIComponent(link.token)}`;
    await sendGuestMagicLinkEmail({ to: email, loginUrl });
    return res.status(200).json({ sent: true });
  } catch (error) {
    console.error('[guestController.requestMagicLink] Failed.', error);
    return res.status(500).json({ message: 'Failed to send login link.' });
  }
}

async function verifyMagicLink(req, res) {
  try {
    const token = req.body.token;
    if (!token) {
      return res.status(400).json({ message: 'Token is required.' });
    }
    const guest = await guestAuthService.verifyMagicLink(token);
    if (!guest) {
      return res.status(401).json({ message: 'Invalid or expired login link.' });
    }
    const authToken = guestAuthService.generateToken(guest);
    return res.status(200).json({
      token: authToken,
      guest: {
        id: guest.id,
        email: guest.email,
        phone: guest.phone,
        name: guest.name
      }
    });
  } catch (error) {
    console.error('[guestController.verifyMagicLink] Failed.', error);
    return res.status(500).json({ message: 'Failed to verify login link.' });
  }
}

async function getMe(req, res) {
  const guest = await guestAuthService.getGuestById(req.guestId);
  if (!guest) {
    return res.status(404).json({ message: 'Guest not found.' });
  }
  return res.status(200).json({ guest });
}

async function listReservations(req, res) {
  try {
    const reservations = await prisma.reservation.findMany({
      where: { guestId: req.guestId },
      orderBy: [{ reservationDate: 'desc' }, { timeFrom: 'desc' }],
      include: {
        table: { select: { id: true, code: true, name: true, bookingKind: true, photoUrl: true } },
        zone: { select: { id: true, name: true } },
        event: { select: { id: true, title: true, slug: true } },
        payment: { select: { id: true, amount: true, currency: true, status: true, paidAt: true } }
      }
    });
    return res.status(200).json({ reservations });
  } catch (error) {
    console.error('[guestController.listReservations] Failed.', error);
    return res.status(500).json({ message: 'Failed to load reservations.' });
  }
}

async function listFavorites(req, res) {
  try {
    const favorites = await prisma.guestFavoriteUnit.findMany({
      where: { guestId: req.guestId },
      include: {
        table: { select: { id: true, code: true, name: true, bookingKind: true, photoUrl: true, seatsMin: true, seatsMax: true, positionType: true } },
        menuItem: { select: { id: true, name: true, price: true, imageUrl: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    return res.status(200).json({ favorites });
  } catch (error) {
    console.error('[guestController.listFavorites] Failed.', error);
    return res.status(500).json({ message: 'Failed to load favorites.' });
  }
}

async function addFavorite(req, res) {
  try {
    const kind = req.body.kind === 'menu' ? 'menu' : 'table';
    const tableId = req.body.tableId ? Number(req.body.tableId) : null;
    const menuItemId = req.body.menuItemId ? Number(req.body.menuItemId) : null;
    if (kind === 'menu' && !menuItemId) {
      return res.status(400).json({ message: 'menuItemId is required.' });
    }
    if (kind === 'table' && !tableId) {
      return res.status(400).json({ message: 'tableId is required.' });
    }
    const where = kind === 'menu'
      ? { guestId_kind_menuItemId: { guestId: req.guestId, kind, menuItemId } }
      : { guestId_kind_tableId: { guestId: req.guestId, kind, tableId } };
    const favorite = await prisma.guestFavoriteUnit.upsert({
      where,
      create: { guestId: req.guestId, kind, tableId, menuItemId },
      update: {}
    });
    return res.status(200).json({ favorite });
  } catch (error) {
    console.error('[guestController.addFavorite] Failed.', error);
    return res.status(500).json({ message: 'Failed to add favorite.' });
  }
}

async function removeFavorite(req, res) {
  try {
    const id = Number(req.params.id);
    if (id) {
      await prisma.guestFavoriteUnit.deleteMany({
        where: { id, guestId: req.guestId }
      });
      return res.status(200).json({ removed: true });
    }
    const kind = req.query.kind === 'menu' ? 'menu' : (req.query.kind === 'table' ? 'table' : null);
    const tableId = req.query.tableId ? Number(req.query.tableId) : null;
    const menuItemId = req.query.menuItemId ? Number(req.query.menuItemId) : null;
    const where = { guestId: req.guestId };
    if (kind === 'menu' && menuItemId) { where.kind = 'menu'; where.menuItemId = menuItemId; }
    else if (kind === 'table' && tableId) { where.kind = 'table'; where.tableId = tableId; }
    else { return res.status(400).json({ message: 'Provide id or kind+tableId/menuItemId.' }); }
    await prisma.guestFavoriteUnit.deleteMany({ where });
    return res.status(200).json({ removed: true });
  } catch (error) {
    console.error('[guestController.removeFavorite] Failed.', error);
    return res.status(500).json({ message: 'Failed to remove favorite.' });
  }
}

async function cancelReservation(req, res) {
  try {
    const reservationId = Number(req.params.id);
    const reservation = await prisma.reservation.findUnique({
      where: { id: reservationId },
      select: { id: true, guestId: true, status: true }
    });
    if (!reservation || reservation.guestId !== req.guestId) {
      return res.status(404).json({ message: 'Reservation not found.' });
    }
    if (!['PENDING', 'AWAITING_PAYMENT', 'CONFIRMED'].includes(reservation.status)) {
      return res.status(400).json({ message: 'This reservation can no longer be cancelled.' });
    }
    await prisma.reservation.update({
      where: { id: reservationId },
      data: { status: 'CANCELLED' }
    });
    return res.status(200).json({ cancelled: true });
  } catch (error) {
    console.error('[guestController.cancelReservation] Failed.', error);
    return res.status(500).json({ message: 'Failed to cancel reservation.' });
  }
}

module.exports = {
  requestMagicLink,
  verifyMagicLink,
  getMe,
  listReservations,
  listFavorites,
  addFavorite,
  removeFavorite,
  cancelReservation
};
