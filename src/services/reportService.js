const prisma = require('../lib/prisma');

async function getFinancialReport({ from, to }) {
  const reservations = await prisma.reservation.findMany({
    where: {
      createdAt: { gte: from, lte: to },
      payment: { status: { equals: 'PAID' } },
      paidInCash: { not: true }
    },
    include: {
      payment: { select: { id: true, amount: true, status: true, paidAt: true, provider: true } },
      table: { select: { name: true, deposit: true, price: true } },
      zone: { select: { name: true } }
    }
  });

  const ticketOrders = await prisma.ticketOrder.findMany({
    where: {
      createdAt: { gte: from, lte: to },
      payment: { status: { equals: 'PAID' } }
    },
    include: {
      payment: { select: { id: true, amount: true, status: true, paidAt: true, provider: true } }
    }
  });

  const refundedReservations = await prisma.reservation.findMany({
    where: {
      createdAt: { gte: from, lte: to },
      payment: { status: { in: ['REFUNDED', 'FAILED', 'CANCELLED'] } }
    },
    include: {
      payment: { select: { amount: true, status: true } }
    }
  });
  const refundedTicketOrders = await prisma.ticketOrder.findMany({
    where: {
      createdAt: { gte: from, lte: to },
      payment: { status: { in: ['REFUNDED', 'FAILED', 'CANCELLED'] } }
    },
    include: {
      payment: { select: { amount: true, status: true } }
    }
  });

  const paidReservations = reservations.filter(r => r.payment?.status === 'PAID');
  const paidTicketOrders = ticketOrders.filter(o => o.payment?.status === 'PAID');

  const fromReservations = paidReservations.reduce((sum, r) => sum + Number(r.payment.amount || 0), 0);
  const fromTickets = paidTicketOrders.reduce((sum, o) => sum + Number(o.payment.amount || 0), 0);
  const totalRefunds = refundedReservations.reduce((sum, r) => sum + Number(r.payment?.amount || 0), 0)
    + refundedTicketOrders.reduce((sum, o) => sum + Number(o.payment?.amount || 0), 0);

  const depositTotal = paidReservations.reduce((s, r) => s + Number(r.depositAmount || 0), 0);
  const rentalTotal = paidReservations.reduce((s, r) => s + Number(r.rentalAmount || 0), 0);

  return {
    period: { from, to },
    revenue: {
      total: fromReservations + fromTickets,
      fromReservations,
      fromTickets,
      refunds: totalRefunds,
      deposits: depositTotal,
      rentals: rentalTotal,
      note: 'Учтены только подтверждённые онлайн-оплаты через эквайринг'
    },
    counts: {
      paidReservations: paidReservations.length,
      paidTicketOrders: paidTicketOrders.length,
      refunds: refundedReservations.length + refundedTicketOrders.length
    },
    reservations: paidReservations.map(r => ({
      id: r.id, customerName: r.customerName, date: r.reservationDate,
      amount: Number(r.payment?.amount || 0), status: r.payment?.status,
      zone: r.zone?.name, table: r.table?.name
    }))
  };
}

async function getReservationsReport({ from, to }) {
  const reservations = await prisma.reservation.findMany({
    where: {
      createdAt: { gte: from, lte: to }
    },
    include: {
      table: { select: { name: true, code: true } },
      zone: { select: { name: true } },
      tableHolds: { take: 1 }
    }
  });

  const byStatus = {};
  const bySource = {};
  const byDayOfWeek = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
  const byZone = {};
  const customersMap = {};
  const cancelledWithReason = [];

  for (const r of reservations) {
    byStatus[r.status] = (byStatus[r.status] || 0) + 1;
    bySource[r.source || 'WEB'] = (bySource[r.source || 'WEB'] || 0) + 1;
    const dayIdx = r.reservationDate.getDay();
    byDayOfWeek[dayIdx] = (byDayOfWeek[dayIdx] || 0) + 1;

    const zoneName = r.zone?.name?.ua || r.zone?.name?.ru || r.zone?.name?.en || 'Unknown';
    byZone[zoneName] = (byZone[zoneName] || 0) + 1;

    customersMap[r.customerPhone] = (customersMap[r.customerPhone] || 0) + 1;
    if (r.status === 'CANCELLED') {
      cancelledWithReason.push({
        id: r.id, customerName: r.customerName, date: r.reservationDate,
        commentAdmin: r.commentAdmin, commentCustomer: r.commentCustomer
      });
    }
  }

  const repeatCustomers = Object.values(customersMap).filter(c => c > 1).length;
  const uniqueCustomers = Object.keys(customersMap).length;

  const activeReservations = reservations.filter(r => ['CONFIRMED', 'SEATED', 'COMPLETED'].includes(r.status));
  let avgDurationHours = null;
  if (activeReservations.length > 0) {
    const totalHours = activeReservations.reduce((sum, r) => {
      const ms = new Date(r.timeTo) - new Date(r.timeFrom);
      return sum + (ms / (1000 * 60 * 60));
    }, 0);
    avgDurationHours = parseFloat((totalHours / activeReservations.length).toFixed(2));
  }

  const noShows = reservations.filter(r => r.status === 'NO_SHOW');

  return {
    period: { from, to },
    summary: {
      total: reservations.length,
      confirmed: byStatus['CONFIRMED'] || 0,
      completed: byStatus['COMPLETED'] || 0,
      cancelled: byStatus['CANCELLED'] || 0,
      noShow: noShows.length,
      pending: byStatus['PENDING'] || 0,
      awaitingPayment: byStatus['AWAITING_PAYMENT'] || 0,
      seated: byStatus['SEATED'] || 0,
      cancelledRate: reservations.length > 0 ? parseFloat(((byStatus['CANCELLED'] || 0) / reservations.length * 100).toFixed(1)) : 0,
      noShowRate: reservations.length > 0 ? parseFloat((noShows.length / reservations.length * 100).toFixed(1)) : 0
    },
    bySource,
    byZone,
    byDayOfWeek,
    repeatCustomers,
    uniqueCustomers,
    avgDurationHours,
    cancelledDetails: cancelledWithReason
  };
}

async function getTicketSalesReport({ from, to }) {
  const orders = await prisma.ticketOrder.findMany({
    where: {
      createdAt: { gte: from, lte: to }
    },
    include: {
      event: { select: { title: true, id: true } },
      tickets: { select: { status: true, ticketType: { select: { name: true } } } },
      payment: { select: { amount: true, status: true, paidAt: true, provider: true } }
    }
  });

  const byEvent = {};
  const byTicketType = {};
  const byStatus = { PAID: 0, PENDING: 0, CANCELLED: 0, EXPIRED: 0, REFUNDED: 0, AWAITING_PAYMENT: 0 };
  let totalRevenue = 0;
  let totalOrders = orders.length;
  let paidOrders = 0;
  let totalTickets = 0;
  let usedTickets = 0;

  for (const order of orders) {
    byStatus[order.status] = (byStatus[order.status] || 0) + 1;
    const eventTitle = order.event?.title?.ua || order.event?.title?.ru || order.event?.title?.en || `Event #${order.eventId}`;
    if (!byEvent[eventTitle]) byEvent[eventTitle] = { count: 0, revenue: 0 };
    byEvent[eventTitle].count += 1;

    if (order.payment?.status === 'PAID') {
      byEvent[eventTitle].revenue += Number(order.payment.amount || 0);
      totalRevenue += Number(order.payment.amount || 0);
      paidOrders += 1;
    }

    for (const t of order.tickets) {
      totalTickets += 1;
      const ttName = t.ticketType?.name?.ua || t.ticketType?.name?.ru || t.ticketType?.name?.en || 'Unknown';
      byTicketType[ttName] = (byTicketType[ttName] || 0) + 1;
      if (t.status === 'USED') usedTickets += 1;
    }
  }

  return {
    period: { from, to },
    summary: {
      totalOrders,
      paidOrders,
      totalRevenue,
      conversionRate: totalOrders > 0 ? parseFloat((paidOrders / totalOrders * 100).toFixed(1)) : 0,
      totalTickets,
      usedTickets,
      usageRate: totalTickets > 0 ? parseFloat((usedTickets / totalTickets * 100).toFixed(1)) : 0,
      revenueNote: 'Только подтверждённые онлайн-оплаты'
    },
    byStatus,
    byEvent,
    byTicketType
  };
}

async function getMenuReport({ from, to }) {
  const menuItems = await prisma.menuItem.findMany({
    where: {
      createdAt: { lte: to }
    },
    include: {
      category: { select: { name: true, section: true } },
      orderItems: {
        where: {
          order: {
            createdAt: { gte: from, lte: to }
          }
        }
      }
    }
  });

  const allOrders = await prisma.tableOrder.findMany({
    where: {
      createdAt: { gte: from, lte: to }
    },
    include: {
      items: { select: { quantity: true, price: true, menuItem: { select: { id: true, name: true } } } }
    }
  });

  const byCategory = {};
  const bySection = { KITCHEN: 0, BAR: 0 };
  const topByLikes = [];
  const topByOrders = [];
  const revenueByItem = [];

  for (const item of menuItems) {
    const catName = item.category?.name?.ua || item.category?.name?.ru || item.category?.name?.en || 'Unknown';
    const section = item.category?.section || 'KITCHEN';

    const orderCount = item.orderItems.reduce((s, oi) => s + oi.quantity, 0);
    const orderRevenue = item.orderItems.reduce((s, oi) => s + Number(oi.price || 0) * oi.quantity, 0);

    if (!byCategory[catName]) byCategory[catName] = { section, items: 0, orders: 0, revenue: 0 };
    byCategory[catName].items += 1;
    byCategory[catName].orders += orderCount;
    byCategory[catName].revenue += orderRevenue;
    bySection[section] = (bySection[section] || 0) + orderRevenue;

    topByLikes.push({ itemId: item.id, name: item.name?.ua || item.name?.ru || item.name?.en, likesCount: item.likesCount, category: catName });
    if (orderCount > 0) {
      topByOrders.push({ itemId: item.id, name: item.name?.ua || item.name?.ru || item.name?.en, orders: orderCount, revenue: orderRevenue, category: catName });
    }
    if (orderRevenue > 0) {
      revenueByItem.push({ itemId: item.id, name: item.name?.ua || item.name?.ru || item.name?.en, revenue: orderRevenue, quantity: orderCount });
    }
  }

  topByLikes.sort((a, b) => b.likesCount - a.likesCount);
  topByOrders.sort((a, b) => b.orders - a.orders);
  revenueByItem.sort((a, b) => b.revenue - a.revenue);

  let totalRevenue = 0;
  let totalOrders = allOrders.length;
  for (const o of allOrders) {
    totalRevenue += o.items.reduce((s, i) => s + Number(i.price || 0) * i.quantity, 0);
  }

  return {
    period: { from, to },
    summary: {
      totalItems: menuItems.length,
      totalOrders: totalOrders,
      totalRevenue,
      avgCheck: totalOrders > 0 ? parseFloat((totalRevenue / totalOrders).toFixed(2)) : 0
    },
    byCategory,
    bySection,
    topByLikes: topByLikes.slice(0, 15),
    topByOrders: topByOrders.slice(0, 15),
    topByRevenue: revenueByItem.slice(0, 15)
  };
}

async function getEventsReport({ from, to }) {
  const events = await prisma.event.findMany({
    where: {
      startAt: { gte: from, lte: to }
    },
    include: {
      reservations: {
        where: { status: { notIn: ['CANCELLED', 'EXPIRED'] } }
      },
      ticketOrders: {
        where: { status: { notIn: ['CANCELLED', 'EXPIRED'] } },
        include: {
          payment: { select: { amount: true, status: true } },
          tickets: true
        }
      },
      ticketTypes: true
    }
  });

  const results = [];
  let totalEventRevenue = 0;

  for (const event of events) {
    const title = event.title?.ua || event.title?.ru || event.title?.en || `Event #${event.id}`;
    const reservationsCount = event.reservations.length;
    const ticketOrdersCount = event.ticketOrders.length;
    const paidOrders = event.ticketOrders.filter(o => o.payment?.status === 'PAID');
    const ticketRevenue = paidOrders.reduce((s, o) => s + Number(o.payment.amount || 0), 0);
    const totalTickets = event.ticketOrders.reduce((s, o) => s + o.tickets.length, 0);
    const usedTickets = event.ticketOrders.reduce((s, o) => s + o.tickets.filter(t => t.status === 'USED').length, 0);

    totalEventRevenue += ticketRevenue;
    results.push({
      eventId: event.id, title, startAt: event.startAt, status: event.status,
      reservationsCount, ticketOrdersCount, paidOrdersCount: paidOrders.length,
      ticketRevenue, totalTickets, usedTickets,
      ticketTypes: event.ticketTypes.map(tt => ({
        name: tt.name?.ua || tt.name?.ru || tt.name?.en, price: Number(tt.price), soldCount: tt.soldCount
      }))
    });
  }

  return {
    period: { from, to },
    summary: {
      totalEvents: events.length,
      totalRevenue: totalEventRevenue,
      totalReservations: results.reduce((s, e) => s + e.reservationsCount, 0),
      totalTicketSales: results.reduce((s, e) => s + e.totalTickets, 0)
    },
    events: results
  };
}

async function getStaffReport({ from, to }) {
  const waiters = await prisma.waiter.findMany({
    include: {
      orders: {
        where: {
          createdAt: { gte: from, lte: to }
        },
        include: {
          table: { select: { name: true } },
          items: { select: { quantity: true, price: true, menuItem: { select: { name: true } } } }
        }
      },
      calls: {
        where: {
          createdAt: { gte: from, lte: to },
          respondedAt: { not: null }
        }
      }
    }
  });

  const results = [];
  let totalOrders = 0;
  let totalRevenue = 0;

  for (const waiter of waiters) {
    const ordersInPeriod = waiter.orders;
    const orderCount = ordersInPeriod.length;
    const revenue = ordersInPeriod.reduce((s, o) => s + o.items.reduce((ss, i) => ss + Number(i.price || 0) * i.quantity, 0), 0);

    const avgResponseTimeMs = waiter.calls.length > 0
      ? waiter.calls.reduce((s, c) => s + (new Date(c.respondedAt) - new Date(c.createdAt)), 0) / waiter.calls.length
      : null;

    const avgResponseMin = avgResponseTimeMs ? parseFloat((avgResponseTimeMs / 1000 / 60).toFixed(2)) : null;

    totalOrders += orderCount;
    totalRevenue += revenue;

    results.push({
      waiterId: waiter.id,
      name: waiter.name,
      isActive: waiter.isActive,
      orderCount,
      revenue,
      respondedCalls: waiter.calls.length,
      avgResponseTimeMin: avgResponseMin
    });
  }

  return {
    period: { from, to },
    summary: {
      totalWaiters: waiters.length,
      activeWaiters: waiters.filter(w => w.isActive).length,
      totalOrders,
      totalRevenue
    },
    waiters: results.sort((a, b) => b.orderCount - a.orderCount)
  };
}

async function getSummaryReport({ from, to }) {
  const dayCount = Math.max(1, Math.round((to - from) / (1000 * 60 * 60 * 24)));
  const prevFrom = new Date(from.getTime() - dayCount * 24 * 60 * 60 * 1000);
  const prevTo = from;

  const [fin, res, tickets, menu, events, staff] = await Promise.all([
    getFinancialReport({ from, to }),
    getReservationsReport({ from, to }),
    getTicketSalesReport({ from, to }),
    getMenuReport({ from, to }),
    getEventsReport({ from, to }),
    getStaffReport({ from, to })
  ]);

  const [prevFin] = await Promise.all([getFinancialReport({ from: prevFrom, to: prevTo })]);
  const revenueChange = prevFin.revenue.total > 0
    ? parseFloat(((fin.revenue.total - prevFin.revenue.total) / prevFin.revenue.total * 100).toFixed(1))
    : null;

  return {
    period: { from, to, prevFrom, prevTo },
    kpis: {
      revenue: { value: fin.revenue.total, change: revenueChange },
      reservations: { value: res.summary.total },
      cancelledRate: { value: res.summary.cancelledRate },
      noShowRate: { value: res.summary.noShowRate },
      ticketRevenue: { value: tickets.summary.totalRevenue },
      menuRevenue: { value: menu.summary.totalRevenue },
      menuAvgCheck: { value: menu.summary.avgCheck },
      activeEvents: { value: events.summary.totalEvents }
    },
    financial: fin,
    reservations: res,
    tickets,
    menu,
    events,
    staff
  };
}

function resolveRange(period) {
  const now = new Date();
  if (period === 'today') {
    const from = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const to = new Date(from); to.setDate(to.getDate() + 1);
    return { from, to };
  }
  if (period === 'yesterday') {
    const from = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
    const to = new Date(from); to.setDate(to.getDate() + 1);
    return { from, to };
  }
  if (period === 'week') {
    const from = new Date(now); from.setDate(from.getDate() - 7);
    return { from, to: now };
  }
  if (period === 'month') {
    const from = new Date(now); from.setMonth(from.getMonth() - 1);
    return { from, to: now };
  }
  if (period === 'quarter') {
    const from = new Date(now); from.setMonth(from.getMonth() - 3);
    return { from, to: now };
  }
  if (period === 'year') {
    const from = new Date(now); from.setFullYear(from.getFullYear() - 1);
    return { from, to: now };
  }
  return { from: new Date(now.getFullYear(), now.getMonth(), 1), to: now };
}

async function getOccupancyReport({ from, to }) {
  const dayCount = Math.max(1, Math.round((to - from) / (1000 * 60 * 60 * 24)));
  const dayStart = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const dayEnd = new Date(to.getFullYear(), to.getMonth(), to.getDate());

  const reservations = await prisma.reservation.findMany({
    where: {
      reservationDate: { gte: dayStart, lt: dayEnd }
    },
    include: {
      table: { select: { id: true, code: true, name: true, seatsMin: true, seatsMax: true, bookingKind: true } },
      zone: { select: { id: true, name: true } }
    }
  });

  const tables = await prisma.venueTable.findMany({
    where: { isActive: true },
    select: { id: true, seatsMax: true, bookingKind: true, zoneId: true, mapId: true }
  });

  const zones = await prisma.zone.findMany({
    include: { tables: { select: { id: true, seatsMax: true, bookingKind: true } } }
  });

  const totalCapacity = tables.reduce((sum, t) => sum + (t.seatsMax || 1), 0);
  const beachCapacity = tables.filter(t => t.bookingKind === 'BEACH').reduce((sum, t) => sum + (t.seatsMax || 1), 0);
  const tableCapacity = tables.filter(t => t.bookingKind === 'TABLE').reduce((sum, t) => sum + (t.seatsMax || 1), 0);

  const arrived = reservations.filter(r => r.arrivedAt || ['SEATED', 'COMPLETED'].includes(r.status));
  const confirmed = reservations.filter(r => ['CONFIRMED', 'SEATED', 'COMPLETED'].includes(r.status));
  const noShows = reservations.filter(r => r.status === 'NO_SHOW');
  const onPremises = arrived.filter(r => r.onPremises);
  const beach = arrived.filter(r => r.bookingKind === 'BEACH');
  const tableEvening = arrived.filter(r => r.bookingKind === 'TABLE');
  const hasEvent = arrived.filter(r => r.eventId);

  const totalGuests = arrived.reduce((sum, r) => sum + (r.arrivedGuests || r.guests || 0), 0);
  const beachGuests = beach.reduce((sum, r) => sum + (r.arrivedGuests || r.guests || 0), 0);
  const tableGuests = tableEvening.reduce((sum, r) => sum + (r.arrivedGuests || r.guests || 0), 0);
  const onPremisesGuests = onPremises.reduce((sum, r) => sum + (r.arrivedGuests || r.guests || 0), 0);

  let avgDurationMinutes = null;
  if (arrived.length > 0) {
    const durations = arrived.filter(r => r.arrivedAt && r.timeTo).map(r => {
      const ms = new Date(r.timeTo) - new Date(r.arrivedAt);
      return Math.max(0, ms / (1000 * 60));
    });
    if (durations.length > 0) {
      avgDurationMinutes = Math.round(durations.reduce((a, b) => a + b, 0) / durations.length);
    }
  }

  const byZone = [];
  for (const zone of tables.reduce((acc, t) => {
    if (!acc.find(z => z.id === t.zoneId)) {
      const zoneData = zones.find(z => z.id === t.zoneId);
      if (zoneData) acc.push({ id: zoneData.id, name: zoneData.name });
    }
    return acc;
  }, [])) {
    const zoneTables = tables.filter(t => t.zoneId === zone.id);
    const zoneCapacity = zoneTables.reduce((sum, t) => sum + (t.seatsMax || 1), 0);
    const zoneReservations = arrived.filter(r => r.zoneId === zone.id);
    const zoneGuests = zoneReservations.reduce((sum, r) => sum + (r.arrivedGuests || r.guests || 0), 0);
    const zoneOnPremises = zoneReservations.filter(r => r.onPremises);
    const zoneUniqueTables = new Set(zoneReservations.map(r => r.tableId)).size;
    const zoneBeach = zoneReservations.filter(r => r.bookingKind === 'BEACH');
    byZone.push({
      zoneId: zone.id,
      name: zone.name?.ua || zone.name?.ru || zone.name?.en || 'Unknown',
      capacity: zoneCapacity,
      occupied: zoneUniqueTables,
      guests: zoneGuests,
      onPremises: zoneOnPremises.length,
      onPremisesGuests: zoneOnPremises.reduce((sum, r) => sum + (r.arrivedGuests || r.guests || 0), 0),
      beachUnits: zoneBeach.length,
      beachGuests: zoneBeach.reduce((sum, r) => sum + (r.arrivedGuests || r.guests || 0), 0),
      occupancyPct: zoneCapacity > 0 ? parseFloat((zoneUniqueTables / zoneTables.length * 100).toFixed(1)) : 0
    });
  }
  byZone.sort((a, b) => b.occupied - a.occupied);

  const hourly = [];
  for (let h = 0; h < 24; h++) {
    const hourOccupied = arrived.filter(r => {
      const arr = new Date(r.arrivedAt);
      const dep = r.timeTo ? new Date(r.timeTo) : new Date(r.reservationDate);
      return arr.getHours() <= h && dep.getHours() > h;
    }).length;
    const hourArrivals = arrived.filter(r => {
      const arr = new Date(r.arrivedAt);
      return arr.getHours() === h;
    }).length;
    const hourGuests = arrived.filter(r => {
      const arr = new Date(r.arrivedAt);
      return arr.getHours() === h;
    }).reduce((sum, r) => sum + (r.arrivedGuests || r.guests || 0), 0);
    hourly.push({ hour: h, occupied: hourOccupied, arrivals: hourArrivals, guests: hourGuests });
  }

  return {
    period: { from, to, dayCount },
    summary: {
      totalReservations: reservations.length,
      arrived: arrived.length,
      confirmed: confirmed.length,
      noShows: noShows.length,
      onPremises: onPremises.length,
      totalGuests,
      beachGuests,
      tableGuests,
      onPremisesGuests,
      totalCapacity,
      beachCapacity,
      tableCapacity,
      avgDurationMinutes,
      occupancyPct: totalCapacity > 0 ? parseFloat((arrived.length / tables.length * 100).toFixed(1)) : 0
    },
    byKind: {
      beach: { units: beach.length, guests: beachGuests, capacity: beachCapacity, occupancyPct: beachCapacity > 0 ? parseFloat((beach.length / beachCapacity * 100).toFixed(1)) : 0 },
      table: { units: tableEvening.length, guests: tableGuests, capacity: tableCapacity, eveningEvents: hasEvent.length, occupancyPct: tableCapacity > 0 ? parseFloat((tableEvening.length / tableCapacity * 100).toFixed(1)) : 0 }
    },
    byZone,
    hourly
  };
}

const ACTIVE_RESERVATION_STATUSES = ['PENDING', 'AWAITING_PAYMENT', 'CONFIRMED', 'SEATED'];

async function getOccupancyLive({ date }) {
  const targetDate = date || new Date();
  const dayStart = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
  const dayEnd = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate() + 1);
  const now = new Date();

  const allTables = await prisma.venueTable.findMany({
    where: { isActive: true, isBookable: true },
    select: { id: true, seatsMax: true, bookingKind: true, zoneId: true, mapId: true }
  });

  const beachTables = allTables.filter(t => t.bookingKind === 'BEACH');
  const tableTables = allTables.filter(t => t.bookingKind === 'TABLE');

  const [busyReservations, heldTables] = await Promise.all([
    prisma.reservation.findMany({
      where: {
        reservationDate: { gte: dayStart, lt: dayEnd },
        status: { in: ACTIVE_RESERVATION_STATUSES },
        timeFrom: { lt: now },
        timeTo: { gt: now }
      },
      select: { tableId: true, bookingKind: true, guests: true, arrivedGuests: true, onPremises: true, eventId: true, timeFrom: true, timeTo: true }
    }),
    prisma.tableHold.findMany({
      where: {
        reservationDate: { gte: dayStart, lt: dayEnd },
        status: 'ACTIVE',
        expiresAt: { gt: now },
        timeFrom: { lt: now },
        timeTo: { gt: now }
      },
      select: { tableId: true }
    })
  ]);

  const busyTableIds = new Set(busyReservations.map(r => r.tableId));
  heldTables.forEach(h => busyTableIds.add(h.tableId));

  const busyBeach = busyReservations.filter(r => r.bookingKind === 'BEACH');
  const busyTable = busyReservations.filter(r => r.bookingKind === 'TABLE');

  const beachOccupied = beachTables.filter(t => busyTableIds.has(t.id)).length;
  const tableOccupied = tableTables.filter(t => busyTableIds.has(t.id)).length;

  const beachCapacity = beachTables.length;
  const tableCapacity = tableTables.length;

  const beachGuests = busyBeach.reduce((sum, r) => sum + (r.arrivedGuests || r.guests || 0), 0);
  const tableGuests = busyTable.reduce((sum, r) => sum + (r.arrivedGuests || r.guests || 0), 0);
  const totalGuests = beachGuests + tableGuests;

  const onPremises = busyReservations.filter(r => r.onPremises).length;
  const eveningEvents = new Set(busyTable.filter(r => r.eventId).map(r => r.eventId)).size;

  const totalCapacity = allTables.length;
  const totalOccupied = busyTableIds.size;

  return {
    date: dayStart,
    asOf: now,
    byKind: {
      beach: {
        occupied: beachOccupied,
        capacity: beachCapacity,
        pct: beachCapacity > 0 ? parseFloat((beachOccupied / beachCapacity * 100).toFixed(1)) : 0,
        guests: beachGuests
      },
      table: {
        occupied: tableOccupied,
        capacity: tableCapacity,
        pct: tableCapacity > 0 ? parseFloat((tableOccupied / tableCapacity * 100).toFixed(1)) : 0,
        guests: tableGuests,
        eveningEvents
      }
    },
    total: {
      occupied: totalOccupied,
      capacity: totalCapacity,
      pct: totalCapacity > 0 ? parseFloat((totalOccupied / totalCapacity * 100).toFixed(1)) : 0,
      guests: totalGuests
    },
    onPremises,
    busyTableIds: [...busyTableIds]
  };
}

module.exports = {
  getFinancialReport,
  getReservationsReport,
  getTicketSalesReport,
  getMenuReport,
  getEventsReport,
  getStaffReport,
  getSummaryReport,
  getOccupancyReport,
  getOccupancyLive,
  resolveRange
};
