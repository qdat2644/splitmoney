import prisma from '../utils/db.js';
import { recordAuditEntry } from './auditTrailService.js';
import { recordOperationalEvent } from './operationalEventService.js';
import { logger } from '../utils/logger.js';

// ── User Management ──────────────────────────────────────────────────────────

export async function suspendUser(adminId, userId, reason = '', db = prisma) {
  const user = await db.user.findUnique({ where: { id: userId }, select: { id: true, role: true, status: true } });
  if (!user) throw createError(404, 'Không tìm thấy người dùng.');
  if (user.role === 'admin') throw createError(403, 'Không thể tạm ngưng tài khoản admin khác.');
  if (user.status === 'suspended') throw createError(409, 'Tài khoản đã bị tạm ngưng.');

  await db.user.update({ where: { id: userId }, data: { status: 'suspended' } });

  await recordAuditEntry({
    actorId: adminId, actionType: 'user.suspend', targetType: 'user', targetId: userId,
    metadata: { reason: reason || 'Admin action' },
  }, db);

  await recordOperationalEvent({
    type: 'admin.user_suspended', source: 'admin', severity: 'warning',
    userId, metadata: { adminId, reason },
  }, db).catch(() => {});

  return { success: true, userId, status: 'suspended' };
}

export async function reactivateUser(adminId, userId, db = prisma) {
  const user = await db.user.findUnique({ where: { id: userId }, select: { id: true, status: true } });
  if (!user) throw createError(404, 'Không tìm thấy người dùng.');
  if (user.status === 'active') throw createError(409, 'Tài khoản đã hoạt động.');

  await db.user.update({ where: { id: userId }, data: { status: 'active' } });

  await recordAuditEntry({
    actorId: adminId, actionType: 'user.reactivate', targetType: 'user', targetId: userId,
  }, db);

  return { success: true, userId, status: 'active' };
}

export async function assignUserRole(adminId, userId, newRole, db = prisma) {
  if (!['member', 'admin'].includes(newRole)) throw createError(400, 'Vai trò không hợp lệ.');

  const user = await db.user.findUnique({ where: { id: userId }, select: { id: true, role: true } });
  if (!user) throw createError(404, 'Không tìm thấy người dùng.');
  if (user.role === newRole) throw createError(409, `Người dùng đã có vai trò "${newRole}".`);
  if (user.id === adminId) throw createError(403, 'Không thể tự thay đổi vai trò của chính mình.');

  await db.user.update({ where: { id: userId }, data: { role: newRole } });

  await recordAuditEntry({
    actorId: adminId, actionType: 'user.role_change', targetType: 'user', targetId: userId,
    metadata: { previousRole: user.role, newRole },
  }, db);

  return { success: true, userId, role: newRole };
}

// ── Room Management ──────────────────────────────────────────────────────────

export async function archiveRoom(adminId, roomId, db = prisma) {
  const room = await db.room.findUnique({ where: { id: roomId }, select: { id: true, status: true, name: true } });
  if (!room) throw createError(404, 'Không tìm thấy phòng.');
  if (room.status === 'archived') throw createError(409, 'Phòng đã được lưu trữ.');

  await db.room.update({ where: { id: roomId }, data: { status: 'archived' } });

  await recordAuditEntry({
    actorId: adminId, actionType: 'room.archive', targetType: 'room', targetId: roomId,
    metadata: { roomName: room.name },
  }, db);

  return { success: true, roomId, status: 'archived' };
}

export async function reopenRoom(adminId, roomId, db = prisma) {
  const room = await db.room.findUnique({ where: { id: roomId }, select: { id: true, status: true, name: true } });
  if (!room) throw createError(404, 'Không tìm thấy phòng.');
  if (room.status === 'active') throw createError(409, 'Phòng đang hoạt động.');

  await db.room.update({ where: { id: roomId }, data: { status: 'active' } });

  await recordAuditEntry({
    actorId: adminId, actionType: 'room.reopen', targetType: 'room', targetId: roomId,
    metadata: { roomName: room.name },
  }, db);

  return { success: true, roomId, status: 'active' };
}

// ── AI Operations ────────────────────────────────────────────────────────────

export async function recomputeAiProfile(adminId, userId, db = prisma) {
  const user = await db.user.findUnique({ where: { id: userId }, select: { id: true } });
  if (!user) throw createError(404, 'Không tìm thấy người dùng.');

  // Delete existing profile so it will be regenerated on next access
  try {
    await db.financialProfile.deleteMany({ where: { userId } });
  } catch { /* may not exist */ }

  await recordAuditEntry({
    actorId: adminId, actionType: 'ai.recompute', targetType: 'ai_profile', targetId: userId,
  }, db);

  await recordOperationalEvent({
    type: 'admin.ai_recompute', source: 'admin', severity: 'info',
    userId, metadata: { adminId },
  }, db).catch(() => {});

  return { success: true, userId, action: 'profile_cleared_for_recomputation' };
}

// ── User / Room Listings ─────────────────────────────────────────────────────

export async function listUsers({ search, role, status, page = 1, limit = 25 } = {}, db = prisma) {
  const where = {};
  if (role) where.role = role;
  if (status) where.status = status;
  if (search) {
    where.OR = [
      { name: { contains: search } },
      { email: { contains: search } },
    ];
  }

  const [users, total] = await Promise.all([
    db.user.findMany({
      where,
      select: {
        id: true, name: true, email: true, role: true, status: true,
        createdAt: true, updatedAt: true,
        _count: { select: { roomMemberships: true, expensesCreated: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    db.user.count({ where }),
  ]);

  return {
    users: users.map((u) => ({
      id: u.id,
      name: u.name,
      email: maskEmail(u.email),
      role: u.role,
      status: u.status,
      createdAt: u.createdAt,
      rooms: u._count.roomMemberships,
      expenses: u._count.expensesCreated,
    })),
    total,
    page,
    totalPages: Math.ceil(total / limit),
  };
}

export async function listRooms({ search, status, page = 1, limit = 25 } = {}, db = prisma) {
  const where = {};
  if (status) where.status = status;
  if (search) {
    where.name = { contains: search };
  }

  const [rooms, total] = await Promise.all([
    db.room.findMany({
      where,
      select: {
        id: true, name: true, status: true, createdAt: true, updatedAt: true,
        owner: { select: { id: true, name: true } },
        _count: { select: { members: true, expenses: true, guestMembers: true, payments: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    db.room.count({ where }),
  ]);

  return {
    rooms: rooms.map((r) => ({
      id: r.id,
      name: r.name,
      status: r.status,
      ownerName: r.owner?.name,
      createdAt: r.createdAt,
      members: r._count.members,
      expenses: r._count.expenses,
      guests: r._count.guestMembers,
      payments: r._count.payments,
    })),
    total,
    page,
    totalPages: Math.ceil(total / limit),
  };
}

// ── Trend Data for Charts ────────────────────────────────────────────────────

export async function buildTrendData(db = prisma) {
  const now = new Date();
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

  const [events, expenses, rooms] = await Promise.all([
    safeFind(() => db.operationalEvent.findMany({
      where: { createdAt: { gte: fourteenDaysAgo } },
      select: { type: true, source: true, severity: true, createdAt: true, metadata: true },
      orderBy: { createdAt: 'asc' },
    })),
    safeFind(() => db.expense.findMany({
      where: { createdAt: { gte: fourteenDaysAgo } },
      select: { createdAt: true },
    })),
    safeFind(() => db.room.findMany({
      where: { createdAt: { gte: fourteenDaysAgo } },
      select: { createdAt: true },
    })),
  ]);

  // Build daily buckets
  const days = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    days.push(formatDayKey(d));
  }

  const aiTrend = buildDailyBuckets(days, events.filter(e => e.type === 'ai.parser'));
  const aiFallback = buildDailyBuckets(days, events.filter(e => e.source === 'ai' && parseMeta(e.metadata)?.isFallback));
  const importTrend = buildDailyBuckets(days, events.filter(e => e.source === 'import'));
  const importFailed = buildDailyBuckets(days, events.filter(e => e.source === 'import' && e.severity === 'error'));
  const importWarning = buildDailyBuckets(days, events.filter(e => e.source === 'import' && e.severity === 'warning'));
  const failedAuth = buildDailyBuckets(days, events.filter(e => e.type === 'security.auth_failed'));
  const rateLimit = buildDailyBuckets(days, events.filter(e => e.type === 'security.rate_limit_hit'));
  const expenseTrend = buildDailyBuckets(days, expenses);
  const roomTrend = buildDailyBuckets(days, rooms);

  return {
    days,
    ai: { parser: aiTrend, fallback: aiFallback },
    imports: { total: importTrend, failed: importFailed, warning: importWarning },
    security: { failedAuth, rateLimit },
    activity: { expenses: expenseTrend, rooms: roomTrend },
  };
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function createError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

function maskEmail(email) {
  if (!email || !email.includes('@')) return null;
  const [name, domain] = email.split('@');
  return `${name.slice(0, 2)}***@${domain}`;
}

function formatDayKey(date) {
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${m}/${d}`;
}

function buildDailyBuckets(days, items) {
  const counts = {};
  days.forEach(d => { counts[d] = 0; });
  items.forEach(item => {
    const key = formatDayKey(new Date(item.createdAt));
    if (counts[key] !== undefined) counts[key]++;
  });
  return days.map(d => counts[d]);
}

function parseMeta(metadata) {
  if (!metadata) return {};
  try { return typeof metadata === 'string' ? JSON.parse(metadata) : metadata; }
  catch { return {}; }
}

async function safeFind(fn) {
  try { return await fn(); }
  catch { return []; }
}
