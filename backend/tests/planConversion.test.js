import { beforeEach, describe, expect, it, vi } from 'vitest';

const prisma = {
  planExpense: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  planParticipant: {
    findFirst: vi.fn(),
  },
  plan: {
    findUnique: vi.fn(),
  },
  expense: {
    create: vi.fn(),
  },
};

vi.mock('../utils/db.js', () => ({ default: prisma }));

const { buildPlanTrackingSummary, convertPlanExpenseToReal, updatePlanExpense } = await import('../services/planningService.js');

describe('plan conversion regression', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prisma.planParticipant.findFirst.mockResolvedValue({ id: 'pp-1' });
    prisma.plan.findUnique.mockResolvedValue({ id: 'plan-1', createdByUserId: 'u-dat' });
  });

  it('case 13: conversion preserves payer, amount, and mapped participants without duplicates', async () => {
    prisma.planExpense.findUnique.mockResolvedValue({
      id: 'pe-1',
      planId: 'plan-1',
      title: 'Hotel',
      estimatedAmount: 300000,
      category: 'housing',
      splitType: 'equal',
      note: null,
      convertedToExpenseId: null,
      participants: JSON.stringify([
        { userId: 'u-dat', guestMemberId: null, type: 'user' },
        { userId: 'u-tea', guestMemberId: null, type: 'user' },
        { displayName: 'Minh', type: 'manual' },
      ]),
    });
    prisma.expense.create.mockResolvedValue({
      id: 'e-1',
      participants: [
        { userId: 'u-dat', guestMemberId: null, shareAmount: 100000 },
        { userId: 'u-tea', guestMemberId: null, shareAmount: 100000 },
        { userId: null, guestMemberId: 'g-minh', shareAmount: 100000 },
      ],
    });

    const result = await convertPlanExpenseToReal('pe-1', 'u-dat', {
      roomId: 'room-a',
      paidByUserId: 'u-dat',
      paidByGuestMemberId: null,
      participantMapping: { Minh: { type: 'guest', id: 'g-minh' } },
    });

    const createArgs = prisma.expense.create.mock.calls[0][0].data;
    expect(createArgs.amount).toBe(300000);
    expect(createArgs.planId).toBe('plan-1');
    expect(createArgs.sourcePlanExpenseId).toBe('pe-1');
    expect(createArgs.paidByUserId).toBe('u-dat');
    expect(createArgs.participants.create).toEqual([
      { userId: 'u-dat', guestMemberId: null, shareAmount: 100000 },
      { userId: 'u-tea', guestMemberId: null, shareAmount: 100000 },
      { userId: null, guestMemberId: 'g-minh', shareAmount: 100000 },
    ]);
    expect(result.expense.id).toBe('e-1');
  });

  it('case 14: converted plan expenses cannot be edited again', async () => {
    prisma.planExpense.findUnique.mockResolvedValue({ id: 'pe-1', convertedToExpenseId: 'e-1' });
    await expect(updatePlanExpense('pe-1', 'u-dat', {})).rejects.toMatchObject({ status: 409 });
  });

  it('case 15: summary uses planned total when no target budget is set', () => {
    const summary = buildPlanTrackingSummary({
      targetBudgetAmount: null,
      expenses: [
        { id: 'pe-food', title: 'Food', category: 'food', estimatedAmount: 200000 },
        { id: 'pe-hotel', title: 'Hotel', category: 'accommodation', estimatedAmount: 300000 },
      ],
    }, [
      { id: 'e-food', planId: 'plan-1', sourcePlanExpenseId: 'pe-food', category: 'food', amount: 150000 },
    ]);

    expect(summary.plannedTotal).toBe(500000);
    expect(summary.actualTotal).toBe(150000);
    expect(summary.remainingAmount).toBe(350000);
    expect(summary.status).toBe('under_budget');
    expect(summary.progressPercent).toBe(30);
  });

  it('case 16: summary uses target budget as ceiling when present', () => {
    const summary = buildPlanTrackingSummary({
      targetBudgetAmount: 600000,
      expenses: [{ id: 'pe-food', title: 'Food', category: 'food', estimatedAmount: 500000 }],
    }, [
      { id: 'e-food', planId: 'plan-1', sourcePlanExpenseId: 'pe-food', category: 'food', amount: 420000 },
    ]);

    expect(summary.plannedTotal).toBe(500000);
    expect(summary.actualTotal).toBe(420000);
    expect(summary.remainingAmount).toBe(180000);
    expect(summary.progressPercent).toBe(70);
    expect(summary.varianceAmount).toBe(-180000);
  });

  it('case 17: summary reports over-budget status', () => {
    const summary = buildPlanTrackingSummary({
      targetBudgetAmount: 400000,
      expenses: [{ id: 'pe-food', title: 'Food', category: 'food', estimatedAmount: 350000 }],
    }, [
      { id: 'e-food', planId: 'plan-1', sourcePlanExpenseId: 'pe-food', category: 'food', amount: 450000 },
    ]);

    expect(summary.status).toBe('over_budget');
    expect(summary.remainingAmount).toBe(-50000);
    expect(summary.progressPercent).toBe(112.5);
  });

  it('case 18: category variance compares planned and actual spend', () => {
    const summary = buildPlanTrackingSummary({
      targetBudgetAmount: null,
      expenses: [
        { id: 'pe-food', title: 'Food', category: 'food', estimatedAmount: 200000 },
        { id: 'pe-hotel', title: 'Hotel', category: 'accommodation', estimatedAmount: 300000 },
      ],
    }, [
      { id: 'e-food', planId: 'plan-1', sourcePlanExpenseId: 'pe-food', category: 'food', amount: 250000 },
      { id: 'e-hotel', planId: 'plan-1', sourcePlanExpenseId: 'pe-hotel', category: 'accommodation', amount: 200000 },
    ]);

    expect(summary.categoryBreakdown[0]).toMatchObject({
      category: 'accommodation',
      plannedAmount: 300000,
      actualAmount: 200000,
      varianceAmount: -100000,
    });
    expect(summary.categoryBreakdown[0].variancePercent).toBeCloseTo(-33.333, 3);
    expect(summary.categoryBreakdown[1]).toEqual({
      category: 'food',
      plannedAmount: 200000,
      actualAmount: 250000,
      varianceAmount: 50000,
      variancePercent: 25,
    });
    expect(summary.itemBreakdown.find((item) => item.id === 'pe-food').varianceAmount).toBe(50000);
  });
});
