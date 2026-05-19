import { describe, expect, it, vi } from 'vitest';
import { recordAuditEntry, listAuditEntries, countAuditEntries } from '../services/auditTrailService.js';

function createMockDb() {
  return {
    auditTrail: {
      create: vi.fn().mockResolvedValue({ id: 'audit-1', actorId: 'a', actionType: 'user.suspend', targetType: 'user', targetId: 'u-1', metadata: '{}', createdAt: new Date() }),
      findMany: vi.fn().mockResolvedValue([]),
      count: vi.fn().mockResolvedValue(0),
    },
  };
}

describe('audit trail service', () => {
  it('records a valid audit entry', async () => {
    const db = createMockDb();
    const result = await recordAuditEntry({
      actorId: 'admin-1',
      actionType: 'user.suspend',
      targetType: 'user',
      targetId: 'u-1',
      metadata: { reason: 'policy violation' },
    }, db);

    expect(result).not.toBeNull();
    expect(db.auditTrail.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        actorId: 'admin-1',
        actionType: 'user.suspend',
        targetType: 'user',
        targetId: 'u-1',
      }),
    });
  });

  it('rejects entries with missing fields', async () => {
    const db = createMockDb();
    const result = await recordAuditEntry({ actorId: 'admin-1' }, db);
    expect(result).toBeNull();
    expect(db.auditTrail.create).not.toHaveBeenCalled();
  });

  it('sanitizes metadata and strips sensitive keys', async () => {
    const db = createMockDb();
    await recordAuditEntry({
      actorId: 'a', actionType: 'test', targetType: 'user', targetId: 'u',
      metadata: { reason: 'ok', password: 'secret123', token: 'xyz' },
    }, db);

    const metaArg = db.auditTrail.create.mock.calls[0][0].data.metadata;
    const parsed = JSON.parse(metaArg);
    expect(parsed.reason).toBe('ok');
    expect(parsed.password).toBeUndefined();
    expect(parsed.token).toBeUndefined();
  });

  it('lists audit entries with filters', async () => {
    const db = createMockDb();
    db.auditTrail.findMany.mockResolvedValue([
      { id: 'a-1', actorId: 'admin-1', actionType: 'user.suspend', targetType: 'user', targetId: 'u-1', metadata: '{}', createdAt: new Date() },
    ]);

    const entries = await listAuditEntries({ actionType: 'user.suspend' }, db);
    expect(entries).toHaveLength(1);
    expect(entries[0].actionType).toBe('user.suspend');
  });

  it('counts audit entries', async () => {
    const db = createMockDb();
    db.auditTrail.count.mockResolvedValue(42);
    const count = await countAuditEntries({}, db);
    expect(count).toBe(42);
  });

  it('handles database write failure gracefully', async () => {
    const db = createMockDb();
    db.auditTrail.create.mockRejectedValue(new Error('DB down'));
    const result = await recordAuditEntry({
      actorId: 'a', actionType: 'test', targetType: 'user', targetId: 'u',
    }, db);
    expect(result).toBeNull();
  });
});
