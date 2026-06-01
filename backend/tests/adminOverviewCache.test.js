import { beforeEach, describe, expect, it, vi } from 'vitest';

const prisma = {
  user: { count: vi.fn() },
  room: { count: vi.fn() },
  expense: { count: vi.fn() },
  payment: { count: vi.fn() },
  budget: { count: vi.fn() },
  roomMember: { count: vi.fn() },
  guestMember: { count: vi.fn() },
  financialProfile: { findMany: vi.fn() },
  operationalEvent: { findMany: vi.fn() },
};

vi.mock('../utils/db.js', () => ({ default: prisma }));

const { buildAdminOverview, clearAdminOverviewCache } = await import('../services/adminOperationsService.js');

describe('admin overview cache', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearAdminOverviewCache();
    prisma.user.count.mockResolvedValue(10);
    prisma.room.count.mockResolvedValue(3);
    prisma.expense.count.mockResolvedValue(1);
    prisma.payment.count.mockResolvedValue(2);
    prisma.budget.count.mockResolvedValue(4);
    prisma.roomMember.count.mockResolvedValue(5);
    prisma.guestMember.count.mockResolvedValue(6);
    prisma.financialProfile.findMany.mockResolvedValue([]);
    prisma.operationalEvent.findMany.mockResolvedValue([]);
  });

  it('returns cached overview data within the short TTL', async () => {
    const first = await buildAdminOverview();
    const second = await buildAdminOverview();

    expect(first).toBe(second);
    expect(prisma.user.count).toHaveBeenCalledTimes(1);
    expect(prisma.operationalEvent.findMany).toHaveBeenCalledTimes(2);
  });

  it('can be cleared after admin mutations', async () => {
    await buildAdminOverview();
    clearAdminOverviewCache();
    await buildAdminOverview();

    expect(prisma.user.count).toHaveBeenCalledTimes(2);
  });
});
