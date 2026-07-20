const prisma = require('../lib/prisma');

function normalizePhone(value) {
  return String(value || '').replace(/\D/g, '');
}

function serializeGuest(guest) {
  return { ...guest, shellBalance: Number(guest.shellBalance || 0), _count: guest._count || undefined };
}

async function listGuests(req, res) {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(10, Number(req.query.limit) || 30));
    const search = String(req.query.search || '').trim();
    const where = search ? { OR: [
      { name: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
      { phone: { contains: search } }
    ] } : {};

    const [guests, total] = await Promise.all([
      prisma.guest.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: { _count: { select: { reservations: true, payments: true, shellTransactions: true } } }
      }),
      prisma.guest.count({ where })
    ]);

    return res.status(200).json({ guests: guests.map(serializeGuest), page, total, totalPages: Math.max(1, Math.ceil(total / limit)) });
  } catch (error) {
    console.error('[adminGuestController.listGuests] Failed.', error);
    return res.status(500).json({ message: 'Failed to load guests.' });
  }
}

async function getGuest(req, res) {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ message: 'Invalid guest id.' });

    const guest = await prisma.guest.findUnique({
      where: { id },
      include: {
        reservations: {
          orderBy: { createdAt: 'desc' },
          include: {
            table: { select: { id: true, code: true, name: true } },
            event: { select: { id: true, title: true } },
            payment: { select: { id: true, amount: true, currency: true, status: true, paidAt: true } }
          }
        },
        payments: {
          orderBy: { createdAt: 'desc' },
          include: {
            reservation: { select: { id: true } },
            ticketOrder: { select: { id: true, orderNumber: true } }
          }
        },
        shellTransactions: { orderBy: { createdAt: 'desc' }, take: 200 },
        favoriteOrders: { orderBy: { createdAt: 'desc' } }
      }
    });
    if (!guest) return res.status(404).json({ message: 'Guest not found.' });

    const phone = normalizePhone(guest.phone);
    const phoneVariants = phone ? [guest.phone, phone, `+${phone}`].filter(Boolean) : [];
    const [ticketOrders, tableOrders] = await Promise.all([
      prisma.ticketOrder.findMany({
        where: { customerEmail: { equals: guest.email, mode: 'insensitive' } },
        orderBy: { createdAt: 'desc' },
        include: {
          event: { select: { id: true, title: true } },
          eventSession: { select: { id: true, name: true, startsAt: true } },
          tickets: { select: { id: true, status: true } },
          payment: { select: { id: true, status: true, amount: true, currency: true } }
        }
      }),
      phoneVariants.length ? prisma.tableOrder.findMany({
        where: { customerPhone: { in: phoneVariants } },
        orderBy: { createdAt: 'desc' },
        include: {
          table: { select: { id: true, code: true, name: true } },
          items: { include: { menuItem: { select: { id: true, name: true } } } }
        }
      }) : []
    ]);

    const responseGuest = serializeGuest(guest);
    responseGuest.payments = guest.payments.map((payment) => ({ ...payment, amount: Number(payment.amount) }));
    responseGuest.shellTransactions = guest.shellTransactions.map((tx) => ({ ...tx, amount: Number(tx.amount), balanceAfter: Number(tx.balanceAfter) }));
    responseGuest.ticketOrders = ticketOrders.map((order) => ({ ...order, amount: Number(order.amount) }));
    responseGuest.tableOrders = tableOrders.map((order) => ({
      ...order,
      total: order.items.reduce((sum, item) => sum + Number(item.price) * item.quantity, 0),
      items: order.items.map((item) => ({ ...item, price: Number(item.price) }))
    }));

    return res.status(200).json({ guest: responseGuest });
  } catch (error) {
    console.error('[adminGuestController.getGuest] Failed.', error);
    return res.status(500).json({ message: 'Failed to load guest.' });
  }
}

module.exports = { listGuests, getGuest };
