import prisma from '../utils/db.js';
import { logger } from '../utils/logger.js';

const BLOCKED_KEYS = new Set([
  'password',
  'passwordHash',
  'token',
  'authorization',
  'secret',
  'prompt',
  'text',
  'raw',
  'fileBuffer',
]);

export async function recordOperationalEvent({
  type,
  source,
  severity = 'info',
  userId = null,
  roomId = null,
  metadata = {},
}, db = prisma) {
  if (!type || !source || !db.operationalEvent?.create) return null;

  try {
    return await db.operationalEvent.create({
      data: {
        type,
        source,
        severity,
        userId,
        roomId,
        metadata: JSON.stringify(sanitizeMetadata(metadata)),
      },
    });
  } catch (error) {
    logger.warn('operational_event_write_failed', { type, source, message: error.message });
    return null;
  }
}

export async function countOperationalEvents(where = {}, db = prisma) {
  if (!db.operationalEvent?.count) return 0;
  try {
    return await db.operationalEvent.count({ where });
  } catch (error) {
    logger.warn('operational_event_count_failed', { message: error.message });
    return 0;
  }
}

export async function listOperationalEvents({ where = {}, take = 50 } = {}, db = prisma) {
  if (!db.operationalEvent?.findMany) return [];
  try {
    const events = await db.operationalEvent.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take,
    });
    return events.map(decodeEvent);
  } catch (error) {
    logger.warn('operational_event_read_failed', { message: error.message });
    return [];
  }
}

export function decodeEvent(event) {
  return {
    id: event.id,
    type: event.type,
    source: event.source,
    severity: event.severity,
    userId: event.userId,
    roomId: event.roomId,
    createdAt: event.createdAt,
    metadata: parseMetadata(event.metadata),
  };
}

function sanitizeMetadata(value, depth = 0) {
  if (depth > 3) return '[truncated]';
  if (value === null || value === undefined) return null;
  if (typeof value === 'number' || typeof value === 'boolean') return value;
  if (typeof value === 'string') return value.slice(0, 160);
  if (Array.isArray(value)) return value.slice(0, 20).map((item) => sanitizeMetadata(item, depth + 1));
  if (typeof value !== 'object') return null;

  return Object.entries(value).reduce((safe, [key, item]) => {
    if (BLOCKED_KEYS.has(key) || BLOCKED_KEYS.has(key.toLowerCase())) return safe;
    safe[key] = sanitizeMetadata(item, depth + 1);
    return safe;
  }, {});
}

function parseMetadata(metadata) {
  if (!metadata) return {};
  try {
    return JSON.parse(metadata);
  } catch {
    return {};
  }
}
