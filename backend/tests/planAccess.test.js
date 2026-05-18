import { beforeEach, describe, expect, it, vi } from 'vitest';

const prisma = {
  planExpense: { findUnique: vi.fn() },
  planParticipant: { findFirst: vi.fn() },
  plan: { findUnique: vi.fn() },
};
vi.mock('../utils/db.js', () => ({ default: prisma }));

const { convertPlanExpenseToReal, updatePlanExpense } = await import('../services/planningService.js');

describe('plan access regression', () => {
  beforeEach(() => vi.clearAllMocks());

  it('case 9: outside users cannot convert another plan expense', async () => {
    prisma.planExpense.findUnique.mockResolvedValue({ id: 'pe-1', planId: 'plan-a', convertedToExpenseId: null, participants: '[]' });
    prisma.planParticipant.findFirst.mockResolvedValue(null);
    prisma.plan.findUnique.mockResolvedValue({ id: 'plan-a', createdByUserId: 'u-dat' });
    await expect(convertPlanExpenseToReal('pe-1', 'u-stranger', {})).rejects.toMatchObject({ status: 403 });
  });

  it('case 10: converted plan expenses cannot be edited again', async () => {
    prisma.planExpense.findUnique.mockResolvedValue({ id: 'pe-1', convertedToExpenseId: 'e-1' });
    await expect(updatePlanExpense('pe-1', 'u-dat', {})).rejects.toMatchObject({ status: 409 });
  });
});
