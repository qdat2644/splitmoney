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

const { convertPlanExpenseToReal, updatePlanExpense } = await import('../services/planningService.js');

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
});
