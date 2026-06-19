const eventService = require('../services/eventService');

function parseId(value) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

async function getAdminEvents(req, res) {
  try {
    const events = await eventService.listAdminEvents();
    return res.json(events);
  } catch (error) {
    console.error('[adminEventController.getAdminEvents] Failed to load events.', error);
    return res.status(500).json({ message: 'Unable to load events.' });
  }
}

async function getAdminEventById(req, res) {
  try {
    const id = parseId(req.params.id);
    if (!id) {
      return res.status(400).json({ message: 'Event id is invalid.' });
    }

    const event = await eventService.getAdminEventById(id);
    if (!event) {
      return res.status(404).json({ message: 'Event not found.' });
    }

    return res.json(event);
  } catch (error) {
    console.error('[adminEventController.getAdminEventById] Failed to load event.', error);
    return res.status(500).json({ message: 'Unable to load event.' });
  }
}

async function createAdminEvent(req, res) {
  try {
    const result = await eventService.createAdminEvent(req.body || {});
    if (result.type === 'INVALID') {
      return res.status(400).json({ message: result.message });
    }

    return res.status(201).json({ success: true, event: result.event });
  } catch (error) {
    console.error('[adminEventController.createAdminEvent] Failed to create event.', error);
    return res.status(500).json({ message: 'Unable to create event.' });
  }
}

async function updateAdminEvent(req, res) {
  try {
    const id = parseId(req.params.id);
    if (!id) {
      return res.status(400).json({ message: 'Event id is invalid.' });
    }

    const result = await eventService.updateAdminEvent(id, req.body || {});
    if (result.type === 'NOT_FOUND') {
      return res.status(404).json({ message: 'Event not found.' });
    }

    if (result.type === 'INVALID') {
      return res.status(400).json({ message: result.message });
    }

    return res.json({ success: true, event: result.event });
  } catch (error) {
    console.error('[adminEventController.updateAdminEvent] Failed to update event.', error);
    return res.status(500).json({ message: 'Unable to update event.' });
  }
}

async function deleteAdminEvent(req, res) {
  try {
    const id = parseId(req.params.id);
    if (!id) {
      return res.status(400).json({ message: 'Event id is invalid.' });
    }

    const result = await eventService.deleteAdminEvent(id);
    if (result.type === 'NOT_FOUND') {
      return res.status(404).json({ message: 'Event not found.' });
    }

    if (result.type === 'INVALID') {
      return res.status(409).json({ message: result.message });
    }

    return res.json({ success: true });
  } catch (error) {
    console.error('[adminEventController.deleteAdminEvent] Failed to delete event.', error);
    return res.status(500).json({ message: 'Unable to delete event.' });
  }
}

async function listAdminEventSessions(req, res) {
  try {
    const eventId = parseId(req.params.eventId);
    if (!eventId) {
      return res.status(400).json({ message: 'Event id is invalid.' });
    }

    const result = await eventService.listEventSessions(eventId);
    if (result.type === 'NOT_FOUND') {
      return res.status(404).json({ message: result.message });
    }

    return res.json(result.sessions);
  } catch (error) {
    console.error('[adminEventController.listAdminEventSessions] Failed to load event sessions.', error);
    return res.status(500).json({ message: 'Unable to load event sessions.' });
  }
}

async function createAdminEventSession(req, res) {
  try {
    const eventId = parseId(req.params.eventId);
    if (!eventId) {
      return res.status(400).json({ message: 'Event id is invalid.' });
    }

    const result = await eventService.createEventSession(eventId, req.body || {});
    if (result.type === 'NOT_FOUND') return res.status(404).json({ message: result.message });
    if (result.type === 'INVALID') return res.status(400).json({ message: result.message });

    return res.status(201).json({ success: true, session: result.session });
  } catch (error) {
    console.error('[adminEventController.createAdminEventSession] Failed to create event session.', error);
    return res.status(500).json({ message: 'Unable to create event session.' });
  }
}

async function updateAdminEventSession(req, res) {
  try {
    const id = parseId(req.params.id);
    if (!id) {
      return res.status(400).json({ message: 'Event session id is invalid.' });
    }

    const result = await eventService.updateEventSession(id, req.body || {});
    if (result.type === 'NOT_FOUND') return res.status(404).json({ message: result.message });
    if (result.type === 'INVALID') return res.status(400).json({ message: result.message });

    return res.json({ success: true, session: result.session });
  } catch (error) {
    console.error('[adminEventController.updateAdminEventSession] Failed to update event session.', error);
    return res.status(500).json({ message: 'Unable to update event session.' });
  }
}

async function deleteAdminEventSession(req, res) {
  try {
    const id = parseId(req.params.id);
    if (!id) {
      return res.status(400).json({ message: 'Event session id is invalid.' });
    }

    const result = await eventService.deleteEventSession(id);
    if (result.type === 'NOT_FOUND') return res.status(404).json({ message: result.message });
    if (result.type === 'CONFLICT') return res.status(409).json({ message: result.message });

    return res.json({ success: true });
  } catch (error) {
    console.error('[adminEventController.deleteAdminEventSession] Failed to delete event session.', error);
    return res.status(500).json({ message: 'Unable to delete event session.' });
  }
}

module.exports = {
  getAdminEvents,
  getAdminEventById,
  createAdminEvent,
  updateAdminEvent,
  deleteAdminEvent,
  listAdminEventSessions,
  createAdminEventSession,
  updateAdminEventSession,
  deleteAdminEventSession
};
