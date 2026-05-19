import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  suspendUser,
  reactivateUser,
  assignUserRole,
  archiveRoom,
  reopenRoom,
  recomputeAiProfile,
  listUsers,
  listRooms,
} from '../services/adminMutationsService.js';

// ── Mock DB ──────────────────────────────────────────────────────────────────

function createMockDb() {
  return {
    user: {
      findUnique: vi.fn(),
      findMany: vi.fn().mockResolvedValue([]),
      update: vi.fn().mockResolvedValue({}),
      count: vi.fn().mockResolvedValue(0),
    },
    room: {
      findUnique: vi.fn(),
      findMany: vi.fn().mockResolvedValue([]),
      update: vi.fn().mockResolvedValue({}),
      count: vi.fn().mockResolvedValue(0),
    },
    financialProfile: {
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
      findMany: vi.fn().mockResolvedValue([]),
    },
    auditTrail: {
      create: vi.fn().mockResolvedValue({ id: 'audit-1' }),
      findMany: vi.fn().mockResolvedValue([]),
      count: vi.fn().mockResolvedValue(0),
    },
    operationalEvent: {
      create: vi.fn().mockResolvedValue({ id: 'event-1' }),
    },
  };
}

// ── User Management Tests ────────────────────────────────────────────────────

describe('admin user management', () => {
  let db;
  beforeEach(() => { db = createMockDb(); });

  it('suspends an active user', async () => {
    db.user.findUnique.mockResolvedValue({ id: 'u-1', role: 'member', status: 'active' });
    const result = await suspendUser('admin-1', 'u-1', 'policy violation', db);
    expect(result.success).toBe(true);
    expect(result.status).toBe('suspended');
    expect(db.user.update).toHaveBeenCalledWith({ where: { id: 'u-1' }, data: { status: 'suspended' } });
    expect(db.auditTrail.create).toHaveBeenCalledOnce();
  });

  it('rejects suspending an admin', async () => {
    db.user.findUnique.mockResolvedValue({ id: 'u-admin', role: 'admin', status: 'active' });
    await expect(suspendUser('admin-1', 'u-admin', '', db)).rejects.toThrow('Không thể tạm ngưng');
    expect(db.user.update).not.toHaveBeenCalled();
  });

  it('rejects suspending already-suspended user', async () => {
    db.user.findUnique.mockResolvedValue({ id: 'u-1', role: 'member', status: 'suspended' });
    await expect(suspendUser('admin-1', 'u-1', '', db)).rejects.toThrow('đã bị tạm ngưng');
  });

  it('rejects suspending non-existent user', async () => {
    db.user.findUnique.mockResolvedValue(null);
    await expect(suspendUser('admin-1', 'u-ghost', '', db)).rejects.toThrow('Không tìm thấy');
  });

  it('reactivates a suspended user', async () => {
    db.user.findUnique.mockResolvedValue({ id: 'u-1', status: 'suspended' });
    const result = await reactivateUser('admin-1', 'u-1', db);
    expect(result.success).toBe(true);
    expect(result.status).toBe('active');
    expect(db.user.update).toHaveBeenCalledWith({ where: { id: 'u-1' }, data: { status: 'active' } });
  });

  it('rejects reactivating already-active user', async () => {
    db.user.findUnique.mockResolvedValue({ id: 'u-1', status: 'active' });
    await expect(reactivateUser('admin-1', 'u-1', db)).rejects.toThrow('đã hoạt động');
  });

  it('assigns a new role', async () => {
    db.user.findUnique.mockResolvedValue({ id: 'u-1', role: 'member' });
    const result = await assignUserRole('admin-1', 'u-1', 'admin', db);
    expect(result.success).toBe(true);
    expect(result.role).toBe('admin');
    expect(db.auditTrail.create).toHaveBeenCalledOnce();
  });

  it('rejects invalid role', async () => {
    await expect(assignUserRole('admin-1', 'u-1', 'superadmin', db)).rejects.toThrow('không hợp lệ');
  });

  it('rejects self role change', async () => {
    db.user.findUnique.mockResolvedValue({ id: 'admin-1', role: 'admin' });
    await expect(assignUserRole('admin-1', 'admin-1', 'member', db)).rejects.toThrow('chính mình');
  });

  it('rejects assigning same role', async () => {
    db.user.findUnique.mockResolvedValue({ id: 'u-1', role: 'admin' });
    await expect(assignUserRole('admin-2', 'u-1', 'admin', db)).rejects.toThrow('đã có vai trò');
  });
});

// ── Room Management Tests ────────────────────────────────────────────────────

describe('admin room management', () => {
  let db;
  beforeEach(() => { db = createMockDb(); });

  it('archives an active room', async () => {
    db.room.findUnique.mockResolvedValue({ id: 'r-1', status: 'active', name: 'Test Room' });
    const result = await archiveRoom('admin-1', 'r-1', db);
    expect(result.success).toBe(true);
    expect(result.status).toBe('archived');
    expect(db.room.update).toHaveBeenCalledWith({ where: { id: 'r-1' }, data: { status: 'archived' } });
  });

  it('rejects archiving already-archived room', async () => {
    db.room.findUnique.mockResolvedValue({ id: 'r-1', status: 'archived', name: 'Test Room' });
    await expect(archiveRoom('admin-1', 'r-1', db)).rejects.toThrow('đã được lưu trữ');
  });

  it('reopens an archived room', async () => {
    db.room.findUnique.mockResolvedValue({ id: 'r-1', status: 'archived', name: 'Test Room' });
    const result = await reopenRoom('admin-1', 'r-1', db);
    expect(result.success).toBe(true);
    expect(result.status).toBe('active');
  });

  it('rejects reopening already-active room', async () => {
    db.room.findUnique.mockResolvedValue({ id: 'r-1', status: 'active', name: 'Test Room' });
    await expect(reopenRoom('admin-1', 'r-1', db)).rejects.toThrow('đang hoạt động');
  });

  it('rejects operations on non-existent room', async () => {
    db.room.findUnique.mockResolvedValue(null);
    await expect(archiveRoom('admin-1', 'r-ghost', db)).rejects.toThrow('Không tìm thấy');
  });
});

// ── AI Operations Tests ──────────────────────────────────────────────────────

describe('admin AI operations', () => {
  let db;
  beforeEach(() => { db = createMockDb(); });

  it('recomputes AI profile by clearing existing data', async () => {
    db.user.findUnique.mockResolvedValue({ id: 'u-1' });
    const result = await recomputeAiProfile('admin-1', 'u-1', db);
    expect(result.success).toBe(true);
    expect(db.financialProfile.deleteMany).toHaveBeenCalledWith({ where: { userId: 'u-1' } });
    expect(db.auditTrail.create).toHaveBeenCalledOnce();
  });

  it('rejects recompute for non-existent user', async () => {
    db.user.findUnique.mockResolvedValue(null);
    await expect(recomputeAiProfile('admin-1', 'u-ghost', db)).rejects.toThrow('Không tìm thấy');
  });
});

// ── Audit Trail Tests ────────────────────────────────────────────────────────

describe('audit trail immutability', () => {
  let db;
  beforeEach(() => { db = createMockDb(); });

  it('writes audit entry on user suspension', async () => {
    db.user.findUnique.mockResolvedValue({ id: 'u-1', role: 'member', status: 'active' });
    await suspendUser('admin-1', 'u-1', 'testing', db);

    expect(db.auditTrail.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        actorId: 'admin-1',
        actionType: 'user.suspend',
        targetType: 'user',
        targetId: 'u-1',
      }),
    });
  });

  it('writes audit entry on room archive', async () => {
    db.room.findUnique.mockResolvedValue({ id: 'r-1', status: 'active', name: 'Room' });
    await archiveRoom('admin-1', 'r-1', db);

    expect(db.auditTrail.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        actorId: 'admin-1',
        actionType: 'room.archive',
        targetType: 'room',
        targetId: 'r-1',
      }),
    });
  });

  it('writes audit entry on role change', async () => {
    db.user.findUnique.mockResolvedValue({ id: 'u-1', role: 'member' });
    await assignUserRole('admin-1', 'u-1', 'admin', db);

    const callData = db.auditTrail.create.mock.calls[0][0].data;
    expect(callData.actionType).toBe('user.role_change');
    const meta = JSON.parse(callData.metadata);
    expect(meta.previousRole).toBe('member');
    expect(meta.newRole).toBe('admin');
  });
});

// ── Listings Tests ───────────────────────────────────────────────────────────

describe('admin listings', () => {
  let db;
  beforeEach(() => { db = createMockDb(); });

  it('lists users with masked emails', async () => {
    db.user.findMany.mockResolvedValue([
      { id: 'u-1', name: 'Test', email: 'test@example.com', role: 'member', status: 'active', createdAt: new Date(), _count: { roomMemberships: 2, expensesCreated: 5 } },
    ]);
    db.user.count.mockResolvedValue(1);

    const result = await listUsers({}, db);
    expect(result.users).toHaveLength(1);
    expect(result.users[0].email).toBe('te***@example.com');
    expect(result.total).toBe(1);
  });

  it('applies search filter', async () => {
    db.user.findMany.mockResolvedValue([]);
    db.user.count.mockResolvedValue(0);
    await listUsers({ search: 'john' }, db);

    const callArgs = db.user.findMany.mock.calls[0][0];
    expect(callArgs.where.OR).toBeDefined();
  });

  it('lists rooms with owner name', async () => {
    db.room.findMany.mockResolvedValue([
      { id: 'r-1', name: 'Room 1', status: 'active', createdAt: new Date(), owner: { id: 'u-1', name: 'Admin' }, _count: { members: 3, expenses: 10, guestMembers: 1, payments: 2 } },
    ]);
    db.room.count.mockResolvedValue(1);

    const result = await listRooms({}, db);
    expect(result.rooms[0].ownerName).toBe('Admin');
  });
});
