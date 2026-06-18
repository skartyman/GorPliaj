const ticketSalesService = require('../services/ticketSalesService');

function parseId(value) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function sendResult(res, result, successStatus = 200) {
  if (result.type === 'NOT_FOUND') return res.status(404).json({ message: result.message });
  if (result.type === 'INVALID') return res.status(400).json({ message: result.message });
  if (result.type === 'CONFLICT') return res.status(409).json({ message: result.message });
  return res.status(successStatus).json(result);
}

async function listTicketTypes(req, res) {
  try {
    const eventId = parseId(req.params.eventId);
    if (!eventId) return res.status(400).json({ message: 'Event id is invalid.' });
    return res.json(await ticketSalesService.listTicketTypes(eventId));
  } catch (error) {
    console.error('[adminTicketSales.listTicketTypes] Failed.', error);
    return res.status(500).json({ message: 'Unable to load ticket types.' });
  }
}

async function createTicketType(req, res) {
  try {
    const eventId = parseId(req.params.eventId);
    if (!eventId) return res.status(400).json({ message: 'Event id is invalid.' });
    return sendResult(res, await ticketSalesService.createTicketType(eventId, req.body || {}), 201);
  } catch (error) {
    console.error('[adminTicketSales.createTicketType] Failed.', error);
    return res.status(500).json({ message: 'Unable to create ticket type.' });
  }
}

async function updateTicketType(req, res) {
  try {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: 'Ticket type id is invalid.' });
    return sendResult(res, await ticketSalesService.updateTicketType(id, req.body || {}));
  } catch (error) {
    console.error('[adminTicketSales.updateTicketType] Failed.', error);
    return res.status(500).json({ message: 'Unable to update ticket type.' });
  }
}

async function deleteTicketType(req, res) {
  try {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: 'Ticket type id is invalid.' });
    const result = await ticketSalesService.deleteTicketType(id);
    if (result.type !== 'SUCCESS') return sendResult(res, result);
    return res.json({ success: true });
  } catch (error) {
    console.error('[adminTicketSales.deleteTicketType] Failed.', error);
    return res.status(500).json({ message: 'Unable to delete ticket type.' });
  }
}

async function createOrder(req, res) {
  try {
    return sendResult(res, await ticketSalesService.createOrder(req.body || {}), 201);
  } catch (error) {
    console.error('[adminTicketSales.createOrder] Failed.', error);
    return res.status(500).json({ message: 'Unable to create ticket order.' });
  }
}

async function listOrders(req, res) {
  try {
    const eventId = req.query.eventId ? parseId(req.query.eventId) : null;
    if (req.query.eventId && !eventId) return res.status(400).json({ message: 'Event id is invalid.' });
    return res.json(await ticketSalesService.listOrders({
      eventId,
      status: req.query.status ? String(req.query.status).toUpperCase() : null
    }));
  } catch (error) {
    console.error('[adminTicketSales.listOrders] Failed.', error);
    return res.status(500).json({ message: 'Unable to load ticket orders.' });
  }
}

async function getOrder(req, res) {
  try {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: 'Order id is invalid.' });
    const order = await ticketSalesService.getOrder(id);
    return order ? res.json(order) : res.status(404).json({ message: 'Ticket order not found.' });
  } catch (error) {
    console.error('[adminTicketSales.getOrder] Failed.', error);
    return res.status(500).json({ message: 'Unable to load ticket order.' });
  }
}

async function updateOrderStatus(req, res) {
  try {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: 'Order id is invalid.' });
    return sendResult(res, await ticketSalesService.updateOrderStatus(id, req.body?.status));
  } catch (error) {
    console.error('[adminTicketSales.updateOrderStatus] Failed.', error);
    return res.status(500).json({ message: 'Unable to update ticket order.' });
  }
}

async function listTickets(req, res) {
  try {
    return res.json(await ticketSalesService.listTickets({
      eventId: req.query.eventId ? parseId(req.query.eventId) : null,
      orderId: req.query.orderId ? parseId(req.query.orderId) : null,
      status: req.query.status ? String(req.query.status).toUpperCase() : null
    }));
  } catch (error) {
    console.error('[adminTicketSales.listTickets] Failed.', error);
    return res.status(500).json({ message: 'Unable to load tickets.' });
  }
}

async function verifyTicket(req, res) {
  try {
    const ticket = await ticketSalesService.verifyTicket(req.params.code);
    return ticket ? res.json({ ticket }) : res.status(404).json({ message: 'Ticket not found.' });
  } catch (error) {
    console.error('[adminTicketSales.verifyTicket] Failed.', error);
    return res.status(500).json({ message: 'Unable to verify ticket.' });
  }
}

async function useTicket(req, res) {
  try {
    const result = await ticketSalesService.useTicket(req.params.code, Number(req.adminAuth.sub) || null);
    if (result.type === 'NOT_FOUND') return res.status(404).json({ message: 'Ticket not found.' });
    if (result.type === 'INVALID_STATUS') {
      return res.status(409).json({ message: `Ticket cannot be used in status ${result.status}.`, status: result.status });
    }
    return res.json({ success: true, ticket: result.ticket });
  } catch (error) {
    console.error('[adminTicketSales.useTicket] Failed.', error);
    return res.status(500).json({ message: 'Unable to use ticket.' });
  }
}

module.exports = {
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
};
