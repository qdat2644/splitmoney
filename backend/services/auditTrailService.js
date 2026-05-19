import prisma from '../utils/db.js';
import { logger } from '../utils/logger.js';

/**
 * Record an immutable audit trail entry for an admin action.
 * Entries cannot be updated or deleted through the API.
 */
export async function recordAuditEntry({
  actorId,
  actionType,
  targetType,
  targetId,
  metadata = {},
}, db = prisma) {
  if (!actorId || !actionType || !targetType || !targetId) {
    logger.warn('audit_trail_missing_fields', { actorId, actionType, targetType, targetId });
    return null;
  }

  try {
    return await db.auditTrail.create({
      data: {
        actorId,
        actionType,
        targetType,
        targetId: String(targetId),
        metadata: JSON.stringify(sanitize(metadata)),
      },
    });
  } catch (error) {
    logger.error('audit_trail_write_failed', { actionType, targetType, message: error.message });
    return null;
  }
}

/**
 * List audit trail entries with optional filters.
 * Used for the admin audit log page.
 */
export async function listAuditEntries({
  actorId,
  actionType,
  targetType,
  targetId,
  limit = 50,
} = {}, db = prisma) {
  try {
    const where = {};
    if (actorId) where.actorId = actorId;
    if (actionType) where.actionType = actionType;
    if (targetType) where.targetType = targetType;
    if (targetId) where.targetId = targetId;

    const entries = await db.auditTrail.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: Math.min(limit, 200),
    });

    return entries.map(formatEntry);
  } catch (error) {
    logger.warn('audit_trail_read_failed', { message: error.message });
    return [];
  }
}

/**
 * Count audit trail entries (for dashboard metrics).
 */
export async function countAuditEntries(where = {}, db = prisma) {
  try {
    return await db.auditTrail.count({ where });
  } catch {
    return 0;
  }
}

function formatEntry(entry) {
  let metadata = {};
  try {
    metadata = entry.metadata ? JSON.parse(entry.metadata) : {};
  } catch { /* ignore */ }

  return {
    id: entry.id,
    actorId: entry.actorId,
    actionType: entry.actionType,
    targetType: entry.targetType,
    targetId: entry.targetId,
    metadata,
    createdAt: entry.createdAt,
  };
}

function sanitize(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string') return value.slice(0, 200);
  if (typeof value === 'number' || typeof value === 'boolean') return value;
  if (Array.isArray(value)) return value.slice(0, 10).map(sanitize);
  if (typeof value === 'object') {
    return Object.entries(value).reduce((safe, [key, item]) => {
      if (['password', 'token', 'secret', 'passwordHash'].includes(key.toLowerCase())) return safe;
      safe[key] = sanitize(item);
      return safe;
    }, {});
  }
  return null;
}
