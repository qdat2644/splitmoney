import { describe, expect, it, vi } from 'vitest';
import { serializeProfileForPrompt } from '../services/intelligence/profileSerializer.js';

const prisma = {
  roomMember: { findMany: vi.fn() },
  guestMember: { findMany: vi.fn() },
  expense: { findMany: vi.fn() },
  payment: { findMany: vi.fn() },
};
vi.mock('../utils/db.js', () => ({ default: prisma }));
const { buildPersonalFinanceSnapshot } = await import('../services/personalFinanceSnapshotService.js');

describe('ai and memory privacy regression', () => {
  it('case 15: serialized AI profile context excludes direct secrets and identifiers', () => {
    const text = serializeProfileForPrompt({
      email: 'dat@example.com',
      passwordHash: 'hash',
      token: 'secret',
      traits: {
        spendingStyle: { confidence: 1, type: 'balanced' },
        volatility: { confidence: 1, level: 'low' },
        categoryPreferences: { confidence: 1, topCategories: ['food'] },
      },
    });
    expect(text).not.toContain('dat@example.com');
    expect(text).not.toContain('hash');
    expect(text).not.toContain('secret');
  });

  it('case 16 and 17: snapshot scope is built only from authorized memberships', async () => {
    prisma.roomMember.findMany.mockResolvedValue([{ room: { id: 'room-a', name: 'Room A' } }]);
    prisma.guestMember.findMany.mockResolvedValue([]);
    prisma.expense.findMany.mockResolvedValue([]);
    prisma.payment.findMany.mockResolvedValue([]);
    const snapshot = await buildPersonalFinanceSnapshot('u-dat');
    expect(snapshot.roomIds).toEqual(['room-a']);
    expect(prisma.expense.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ roomId: { in: ['room-a'] } }),
    }));
  });
});
