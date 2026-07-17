const prisma = require('../lib/prisma');
const { autoTranslateObject } = require('./translationService');
const { normalizeLocalizedField } = require('../utils/localization');

const EVENT_STATUSES = new Set(['DRAFT', 'PUBLISHED', 'ARCHIVED']);
const EVENT_CTA_TYPES = new Set(['BOOKING', 'TICKETS', 'BOTH']);

function normalizeText(value) {
  return String(value || '').trim();
}

function normalizeOptionalText(value) {
  const text = normalizeText(value);
  return text || null;
}

function slugify(value) {
  const text = (value && typeof value === 'object') ? (value.ua || value.en || '') : value;
  return normalizeText(text)
    .toLowerCase()
    .replace(/[^a-z0-9а-яіїєґ]+/giu, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

function normalizeDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function normalizeBoolean(value, fallback = false) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['true', '1', 'yes', 'on'].includes(normalized)) return true;
    if (['false', '0', 'no', 'off'].includes(normalized)) return false;
  }
  return fallback;
}

function normalizeSortOrder(value) {
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : 0;
}

function toEventTicketType(type) {
  return {
    id: type.id,
    name: normalizeLocalizedField(type.name),
    price: type.price,
    capacity: type.capacity,
    soldCount: type.soldCount,
    isActive: type.isActive,
    eventSessionId: type.eventSessionId,
    createdAt: type.createdAt
  };
}

function toAdminEvent(event) {
  const sessions = event.sessions || [];
  const ticketTypes = event.ticketTypes || [];
  return {
    id: event.id,
    title: normalizeLocalizedField(event.title),
    slug: event.slug,
    shortDescription: normalizeLocalizedField(event.shortDescription),
    fullDescription: normalizeLocalizedField(event.fullDescription),
    posterImage: event.posterImage || '',
    startAt: event.startAt,
    endAt: event.endAt,
    status: event.status,
    isFeatured: event.isFeatured,
    ctaType: event.ctaType,
    ticketUrl: event.ticketUrl || '',
    sessions: sessions.map(toEventSession),
    ticketTypes: ticketTypes.map(toEventTicketType),
    _sessionsCount: event._count?.sessions ?? sessions.length,
    _ticketTypesCount: event._count?.ticketTypes ?? ticketTypes.length,
    createdAt: event.createdAt,
    updatedAt: event.updatedAt
  };
}

function toPublicEvent(event) {
  return {
    id: event.id,
    title: normalizeLocalizedField(event.title),
    slug: event.slug,
    shortDescription: normalizeLocalizedField(event.shortDescription),
    fullDescription: normalizeLocalizedField(event.fullDescription),
    posterImage: event.posterImage || '',
    startAt: event.startAt,
    endAt: event.endAt,
    isFeatured: event.isFeatured,
    ctaType: event.ctaType,
    ticketUrl: event.ticketUrl || '',
    sessions: Array.isArray(event.sessions) ? event.sessions.map(toEventSession) : []
  };
}

function toEventSession(session) {
  return {
    id: session.id,
    eventId: session.eventId,
    name: normalizeLocalizedField(session.name),
    startsAt: session.startsAt,
    endsAt: session.endsAt,
    sortOrder: session.sortOrder,
    isActive: session.isActive,
    admissionMode: session.admissionMode || 'TICKETED',
    createdAt: session.createdAt,
    updatedAt: session.updatedAt
  };
}

async function ensureUniqueSlug(baseSlug, excludeId) {
  const safeBase = baseSlug || `event-${Date.now()}`;
  let slug = safeBase;
  let attempt = 2;

  while (true) {
    const existing = await prisma.event.findFirst({
      where: {
        slug,
        ...(excludeId ? { id: { not: excludeId } } : {})
      },
      select: { id: true }
    });

    if (!existing) {
      return slug;
    }

    slug = `${safeBase}-${attempt}`;
    attempt += 1;
  }
}

function resolveStatus(input, fallback) {
  const value = normalizeText(input || fallback).toUpperCase();
  return EVENT_STATUSES.has(value) ? value : null;
}

function resolveCtaType(input, fallback) {
  const value = normalizeText(input || fallback).toUpperCase();
  return EVENT_CTA_TYPES.has(value) ? value : null;
}

function validateTimeRange(startAt, endAt) {
  if (!startAt) {
    return 'Start date and time are required.';
  }

  if (endAt && endAt < startAt) {
    return 'End date cannot be earlier than start date.';
  }

  return null;
}

async function listAdminEvents() {
  const events = await prisma.event.findMany({
    orderBy: [{ startAt: 'asc' }, { id: 'asc' }],
    include: {
      _count: {
        select: { sessions: true, ticketTypes: true }
      }
    }
  });

  return events.map(toAdminEvent);
}

async function getAdminEventById(id) {
  const event = await prisma.event.findUnique({
    where: { id },
    include: {
      sessions: { orderBy: [{ sortOrder: 'asc' }, { startsAt: 'asc' }, { id: 'asc' }] },
      ticketTypes: { orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }] }
    }
  });
  return event ? toAdminEvent(event) : null;
}

async function createAdminEvent(input) {
  const titleObj = await autoTranslateObject(input.title);
  if (!titleObj.ua) return { type: 'INVALID', message: 'Event title is required.' };

  const shortDescriptionObj = input.shortDescription ? await autoTranslateObject(input.shortDescription) : null;
  const fullDescriptionObj = input.fullDescription ? await autoTranslateObject(input.fullDescription) : null;

  const status = resolveStatus(input.status, 'DRAFT');
  if (!status) return { type: 'INVALID', message: 'Event status is invalid.' };

  const ctaType = resolveCtaType(input.ctaType, 'BOOKING');
  if (!ctaType) return { type: 'INVALID', message: 'CTA type is invalid.' };

  const startAt = normalizeDate(input.startAt);
  const endAt = Object.prototype.hasOwnProperty.call(input, 'endAt') ? normalizeDate(input.endAt) : null;
  const timeError = validateTimeRange(startAt, endAt);
  if (timeError) return { type: 'INVALID', message: timeError };

  const slug = await ensureUniqueSlug(slugify(input.slug || titleObj.ua));

  const sessionsInput = Array.isArray(input.sessions) ? input.sessions : [];
  const sessionNameObjs = await Promise.all(
    sessionsInput.map(async (s) => ({
      name: s.name ? await autoTranslateObject(s.name) : null,
      startsAt: normalizeDate(s.startsAt),
      endsAt: normalizeDate(s.endsAt),
      sortOrder: normalizeSortOrder(s.sortOrder),
      isActive: normalizeBoolean(s.isActive, true),
      admissionMode: s.admissionMode === 'FREE' ? 'FREE' : 'TICKETED'
    }))
  );

  const event = await prisma.event.create({
    data: {
      title: titleObj,
      slug,
      shortDescription: shortDescriptionObj,
      fullDescription: fullDescriptionObj,
      posterImage: normalizeOptionalText(input.posterImage),
      startAt,
      endAt,
      status,
      isFeatured: normalizeBoolean(input.isFeatured, false),
      ctaType,
      ticketUrl: normalizeOptionalText(input.ticketUrl),
      ...(sessionNameObjs.length > 0 ? {
        sessions: { create: sessionNameObjs }
      } : {})
    },
    include: {
      sessions: { orderBy: [{ sortOrder: 'asc' }, { startsAt: 'asc' }, { id: 'asc' }] }
    }
  });

  return { type: 'SUCCESS', event: toAdminEvent(event) };
}

async function updateAdminEvent(id, input) {
  const existing = await prisma.event.findUnique({ where: { id } });
  if (!existing) return { type: 'NOT_FOUND' };

  let titleObj = existing.title;
  if (Object.prototype.hasOwnProperty.call(input, 'title')) {
    titleObj = await autoTranslateObject(input.title);
  }
  if (!titleObj || (typeof titleObj === 'object' && !titleObj.ua)) return { type: 'INVALID', message: 'Event title is required.' };

  let shortDescriptionObj = existing.shortDescription;
  if (Object.prototype.hasOwnProperty.call(input, 'shortDescription')) {
    shortDescriptionObj = input.shortDescription ? await autoTranslateObject(input.shortDescription) : null;
  }

  let fullDescriptionObj = existing.fullDescription;
  if (Object.prototype.hasOwnProperty.call(input, 'fullDescription')) {
    fullDescriptionObj = input.fullDescription ? await autoTranslateObject(input.fullDescription) : null;
  }

  const status = Object.prototype.hasOwnProperty.call(input, 'status')
    ? resolveStatus(input.status, existing.status)
    : existing.status;
  if (!status) return { type: 'INVALID', message: 'Event status is invalid.' };

  const ctaType = Object.prototype.hasOwnProperty.call(input, 'ctaType')
    ? resolveCtaType(input.ctaType, existing.ctaType)
    : existing.ctaType;
  if (!ctaType) return { type: 'INVALID', message: 'CTA type is invalid.' };

  const startAt = Object.prototype.hasOwnProperty.call(input, 'startAt')
    ? normalizeDate(input.startAt)
    : existing.startAt;
  const endAt = Object.prototype.hasOwnProperty.call(input, 'endAt')
    ? normalizeDate(input.endAt)
    : existing.endAt;

  const timeError = validateTimeRange(startAt, endAt);
  if (timeError) return { type: 'INVALID', message: timeError };

  const slugSeed = Object.prototype.hasOwnProperty.call(input, 'slug') ? input.slug : existing.slug;
  const slug = await ensureUniqueSlug(slugify(slugSeed || titleObj.ua), id);

  const event = await prisma.event.update({
    where: { id },
    data: {
      title: titleObj,
      slug,
      shortDescription: shortDescriptionObj,
      fullDescription: fullDescriptionObj,
      posterImage: Object.prototype.hasOwnProperty.call(input, 'posterImage')
        ? normalizeOptionalText(input.posterImage)
        : existing.posterImage,
      startAt,
      endAt,
      status,
      isFeatured: Object.prototype.hasOwnProperty.call(input, 'isFeatured')
        ? normalizeBoolean(input.isFeatured, existing.isFeatured)
        : existing.isFeatured,
      ctaType,
      ticketUrl: Object.prototype.hasOwnProperty.call(input, 'ticketUrl')
        ? normalizeOptionalText(input.ticketUrl)
        : existing.ticketUrl
    }
  });

  return { type: 'SUCCESS', event: toAdminEvent(event) };
}

async function deleteAdminEvent(id) {
  const existing = await prisma.event.findUnique({ where: { id } });
  if (!existing) return { type: 'NOT_FOUND' };

  const [ticketOrdersCount, ticketsCount] = await Promise.all([
    prisma.ticketOrder.count({ where: { eventId: id } }),
    prisma.ticket.count({ where: { eventId: id } })
  ]);

  if (ticketOrdersCount > 0 || ticketsCount > 0) {
    return {
      type: 'INVALID',
      message: 'Cannot delete this event because it already has ticket sales or issued tickets. Archive it instead or remove the related ticket data first.'
    };
  }

  await prisma.event.delete({ where: { id } });
  return { type: 'SUCCESS' };
}

async function listEventSessions(eventId) {
  const event = await prisma.event.findUnique({ where: { id: eventId }, select: { id: true } });
  if (!event) return { type: 'NOT_FOUND', message: 'Event not found.' };

  const rows = await prisma.eventSession.findMany({
    where: { eventId },
    orderBy: [{ sortOrder: 'asc' }, { startsAt: 'asc' }, { id: 'asc' }]
  });

  return { type: 'SUCCESS', sessions: rows.map(toEventSession) };
}

async function createEventSession(eventId, input) {
  const event = await prisma.event.findUnique({ where: { id: eventId }, select: { id: true } });
  if (!event) return { type: 'NOT_FOUND', message: 'Event not found.' };

  const startsAt = normalizeDate(input.startsAt);
  const endsAt = normalizeDate(input.endsAt);
  const timeError = validateTimeRange(startsAt, endsAt);
  if (timeError) return { type: 'INVALID', message: timeError };

  const row = await prisma.eventSession.create({
    data: {
      eventId,
      name: input.name ? await autoTranslateObject(input.name) : null,
      startsAt,
      endsAt,
      sortOrder: normalizeSortOrder(input.sortOrder),
      isActive: normalizeBoolean(input.isActive, true),
      admissionMode: input.admissionMode === 'FREE' ? 'FREE' : 'TICKETED'
    }
  });

  return { type: 'SUCCESS', session: toEventSession(row) };
}

async function updateEventSession(id, input) {
  const existing = await prisma.eventSession.findUnique({ where: { id } });
  if (!existing) return { type: 'NOT_FOUND', message: 'Event session not found.' };

  const nextStartsAt = Object.prototype.hasOwnProperty.call(input, 'startsAt')
    ? normalizeDate(input.startsAt)
    : existing.startsAt;
  const nextEndsAt = Object.prototype.hasOwnProperty.call(input, 'endsAt')
    ? normalizeDate(input.endsAt)
    : existing.endsAt;
  const timeError = validateTimeRange(nextStartsAt, nextEndsAt);
  if (timeError) return { type: 'INVALID', message: timeError };

  const data = {
    startsAt: nextStartsAt,
    endsAt: nextEndsAt
  };

  if (Object.prototype.hasOwnProperty.call(input, 'name')) {
    data.name = input.name ? await autoTranslateObject(input.name) : null;
  }
  if (Object.prototype.hasOwnProperty.call(input, 'sortOrder')) {
    data.sortOrder = normalizeSortOrder(input.sortOrder);
  }
  if (Object.prototype.hasOwnProperty.call(input, 'isActive')) {
    data.isActive = normalizeBoolean(input.isActive, existing.isActive);
  }
  if (Object.prototype.hasOwnProperty.call(input, 'admissionMode')) {
    data.admissionMode = input.admissionMode === 'FREE' ? 'FREE' : 'TICKETED';
  }

  const row = await prisma.eventSession.update({
    where: { id },
    data
  });

  return { type: 'SUCCESS', session: toEventSession(row) };
}

async function deleteEventSession(id) {
  const existing = await prisma.eventSession.findUnique({
    where: { id },
    include: {
      _count: {
        select: {
          ticketTypes: true,
          ticketOrders: true,
          tickets: true
        }
      }
    }
  });
  if (!existing) return { type: 'NOT_FOUND', message: 'Event session not found.' };

  if (existing._count.ticketOrders > 0 || existing._count.tickets > 0) {
    return {
      type: 'CONFLICT',
      message: 'Event session cannot be deleted because tickets or orders already exist for it.'
    };
  }

  await prisma.eventSession.delete({ where: { id } });
  return { type: 'SUCCESS' };
}

async function listPublicEvents({ includePast = false, limit } = {}) {
  const now = new Date();
  const events = await prisma.event.findMany({
    where: {
      status: 'PUBLISHED',
      ...(includePast
        ? {}
        : {
            OR: [
              { startAt: { gte: now } },
              { endAt: { gte: now } },
              {
                sessions: {
                  some: {
                    isActive: true,
                    endsAt: { gte: now }
                  }
                }
              }
            ]
          })
    },
    include: {
      sessions: {
        where: { isActive: true },
        orderBy: [{ sortOrder: 'asc' }, { startsAt: 'asc' }, { id: 'asc' }]
      }
    },
    orderBy: [{ startAt: 'asc' }, { id: 'asc' }],
    ...(Number.isInteger(limit) && limit > 0 ? { take: limit } : {})
  });

  return events.map(toPublicEvent);
}

async function getPublicEventBySlug(slug) {
  const event = await prisma.event.findFirst({
    where: {
      slug,
      status: 'PUBLISHED'
    },
    include: {
      sessions: {
        where: { isActive: true },
        orderBy: [{ sortOrder: 'asc' }, { startsAt: 'asc' }, { id: 'asc' }]
      }
    }
  });

  return event ? toPublicEvent(event) : null;
}

module.exports = {
  listAdminEvents,
  getAdminEventById,
  createAdminEvent,
  updateAdminEvent,
  deleteAdminEvent,
  listEventSessions,
  createEventSession,
  updateEventSession,
  deleteEventSession,
  listPublicEvents,
  getPublicEventBySlug
};
