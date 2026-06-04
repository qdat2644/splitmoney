import { beforeEach, describe, expect, it, vi } from 'vitest';

const prisma = {
  planParticipant: {
    findFirst: vi.fn(),
  },
  plan: {
    findUnique: vi.fn(),
  },
  planExpense: {
    findUnique: vi.fn(),
  },
  planSpending: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
};

vi.mock('../utils/db.js', () => ({ default: prisma }));

const {
  addPlanSpending,
  buildPlanTrackingSummary,
  deletePlanSpending,
  listPlanSpendings,
  updatePlanSpending,
} = await import('../services/planningService.js');

describe('plan spending regression', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prisma.planParticipant.findFirst.mockResolvedValue({ id: 'pp-1' });
    prisma.plan.findUnique.mockResolvedValue({ id: 'plan-1', createdByUserId: 'u-dat' });
  });

  it('case 19: creates plan spending without a room', async () => {
    prisma.planExpense.findUnique.mockResolvedValue({ id: 'pe-food', planId: 'plan-1' });
    prisma.planSpending.create.mockResolvedValue({ id: 'ps-1', title: 'Mi Quang', amount: 180000 });

    const result = await addPlanSpending('plan-1', 'u-dat', {
      title: 'Mi Quang',
      amount: 180000,
      category: 'food',
      linkedPlanExpenseId: 'pe-food',
      spentAt: '2026-06-04',
    });

    expect(prisma.planSpending.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        planId: 'plan-1',
        linkedPlanExpenseId: 'pe-food',
        title: 'Mi Quang',
        amount: 180000,
        category: 'food',
      }),
    }));
    expect(result.id).toBe('ps-1');
  });

  it('case 20: lists plan spendings for accessible plan', async () => {
    prisma.planSpending.findMany.mockResolvedValue([{ id: 'ps-1' }]);
    const result = await listPlanSpendings('plan-1', 'u-dat');
    expect(prisma.planSpending.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { planId: 'plan-1' } }));
    expect(result).toEqual([{ id: 'ps-1' }]);
  });

  it('case 21: updates plan spending', async () => {
    prisma.planSpending.findUnique.mockResolvedValue({ id: 'ps-1', planId: 'plan-1', title: 'Old', amount: 100000 });
    prisma.planSpending.update.mockResolvedValue({ id: 'ps-1', title: 'Grab', amount: 90000 });
    const result = await updatePlanSpending('plan-1', 'ps-1', 'u-dat', { title: 'Grab', amount: 90000 });
    expect(prisma.planSpending.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'ps-1' },
      data: expect.objectContaining({ title: 'Grab', amount: 90000 }),
    }));
    expect(result.amount).toBe(90000);
  });

  it('case 22: deletes plan spending', async () => {
    prisma.planSpending.findUnique.mockResolvedValue({ id: 'ps-1', planId: 'plan-1' });
    prisma.planSpending.delete.mockResolvedValue({ id: 'ps-1' });
    await expect(deletePlanSpending('plan-1', 'ps-1', 'u-dat')).resolves.toEqual({ success: true });
    expect(prisma.planSpending.delete).toHaveBeenCalledWith({ where: { id: 'ps-1' } });
  });

  it('case 23: rejects spending for inaccessible plan', async () => {
    prisma.planParticipant.findFirst.mockResolvedValue(null);
    prisma.plan.findUnique.mockResolvedValue({ id: 'plan-1', createdByUserId: 'u-owner', roomId: null });
    await expect(addPlanSpending('plan-1', 'u-stranger', { title: 'Taxi', amount: 90000 })).rejects.toMatchObject({ status: 403 });
  });

  it('case 24: rejects linked estimate from another plan', async () => {
    prisma.planExpense.findUnique.mockResolvedValue({ id: 'pe-other', planId: 'plan-other' });
    await expect(addPlanSpending('plan-1', 'u-dat', {
      title: 'Ticket',
      amount: 250000,
      linkedPlanExpenseId: 'pe-other',
    })).rejects.toMatchObject({ status: 400 });
  });

  it('case 25: tracking actual total uses plan spendings before room expenses', () => {
    const summary = buildPlanTrackingSummary({
      targetBudgetAmount: 6000000,
      expenses: [{ id: 'pe-food', title: 'Food', category: 'food', estimatedAmount: 1000000 }],
      spendings: [{ id: 'ps-food', linkedPlanExpenseId: 'pe-food', category: 'food', amount: 180000 }],
    }, [
      { id: 'room-expense', sourcePlanExpenseId: 'pe-food', category: 'food', amount: 1000000 },
    ]);

    expect(summary.actualTotal).toBe(180000);
    expect(summary.remainingAmount).toBe(5820000);
    expect(summary.spendingCount).toBe(1);
  });

  it('case 26: category and item variance use plan spendings', () => {
    const summary = buildPlanTrackingSummary({
      targetBudgetAmount: null,
      expenses: [
        { id: 'pe-food', title: 'An uong', category: 'food', estimatedAmount: 1000000 },
        { id: 'pe-transport', title: 'Grab', category: 'transport', estimatedAmount: 500000 },
      ],
      spendings: [
        { id: 'ps-food', linkedPlanExpenseId: 'pe-food', category: 'food', amount: 180000 },
        { id: 'ps-grab', linkedPlanExpenseId: 'pe-transport', category: 'transport', amount: 90000 },
      ],
    });

    expect(summary.categoryBreakdown.find((item) => item.category === 'food')).toMatchObject({
      plannedAmount: 1000000,
      actualAmount: 180000,
      varianceAmount: -820000,
    });
    expect(summary.itemBreakdown.find((item) => item.id === 'pe-food')).toMatchObject({
      actualAmount: 180000,
      varianceAmount: -820000,
    });
  });
});
