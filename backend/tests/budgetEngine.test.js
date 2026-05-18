import { beforeEach, describe, expect, it, vi } from 'vitest';

const prisma = {
  budget: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    update: vi.fn(),
    create: vi.fn(),
  },
};

vi.mock('../utils/db.js', () => ({ default: prisma }));

const { buildBudgetComparisonFromData, upsertBudget } = await import('../services/budgetService.js');

describe('budget engine regression', () => {
  beforeEach(() => vi.clearAllMocks());

  it('case 10: personal food budget reports 75 percent usage', () => {
    const [result] = buildBudgetComparisonFromData({
      budgets: [{ id: 'b-1', roomId: null, category: 'food', amount: 2000000, month: 5, year: 2026 }],
      expenses: [{
        roomId: 'room-a',
        category: 'food',
        participants: [{ userId: 'u-dat', guestMemberId: null, shareAmount: 1500000 }],
      }],
      userId: 'u-dat',
      claimedGuestIds: [],
    });
    expect(result.actual).toBe(1500000);
    expect(result.usagePct).toBe(75);
  });

  it('case 11: room budgets ignore expenses from other rooms', () => {
    const [result] = buildBudgetComparisonFromData({
      budgets: [{ id: 'b-1', roomId: 'room-a', category: null, amount: 2000000, month: 5, year: 2026 }],
      expenses: [
        { roomId: 'room-a', category: 'food', participants: [{ userId: 'u-dat', guestMemberId: null, shareAmount: 500000 }] },
        { roomId: 'room-b', category: 'food', participants: [{ userId: 'u-dat', guestMemberId: null, shareAmount: 900000 }] },
      ],
      userId: 'u-dat',
      claimedGuestIds: [],
    });
    expect(result.actual).toBe(500000);
  });

  it('case 12: updating an existing budget reuses the row', async () => {
    prisma.budget.findFirst.mockResolvedValue({ id: 'b-1' });
    prisma.budget.update.mockResolvedValue({ id: 'b-1', amount: 2500000 });
    const result = await upsertBudget('u-dat', {
      roomId: null,
      category: 'food',
      amount: 2500000,
      month: 5,
      year: 2026,
    });
    expect(prisma.budget.update).toHaveBeenCalledWith({ where: { id: 'b-1' }, data: { amount: 2500000 } });
    expect(prisma.budget.create).not.toHaveBeenCalled();
    expect(result.id).toBe('b-1');
  });
});
