import { describe, expect, it } from 'vitest';
import { buildBudgetComparisonFromData } from '../services/budgetService.js';
import { computeBalanceMap, computeUserBalance, resolveShares } from '../utils/settlement.js';

const ids = ['u-dat', 'u-tea', 'u-tuan', 'g-minh'];
const total = (balances) => Object.values(balances).reduce((sum, value) => sum + value, 0);

describe('financial integrity regression', () => {
  it('case 15: all balances sum to zero', () => {
    const balances = computeBalanceMap(ids, [{
      paidById: 'u-dat',
      amount: 300000,
      participants: resolveShares(300000, 'equal', [{ id: 'u-dat' }, { id: 'u-tea' }, { id: 'u-tuan' }]),
    }]);
    expect(total(balances)).toBe(0);
  });

  it('case 16: balance calculation never emits NaN, Infinity, or undefined', () => {
    const balances = computeBalanceMap(ids, [{
      paidById: 'u-dat',
      amount: 100000,
      participants: null,
    }], undefined);
    Object.values(balances).forEach((value) => {
      expect(Number.isFinite(value)).toBe(true);
      expect(value).not.toBeUndefined();
    });
  });

  it('case 17: repeated operations avoid meaningful floating point drift', () => {
    const expenses = Array.from({ length: 30 }, (_, index) => ({
      paidById: index % 2 === 0 ? 'u-dat' : 'u-tea',
      amount: 100,
      participants: resolveShares(100, 'percentage', [
        { id: 'u-dat', sharePercent: 33.33 },
        { id: 'u-tea', sharePercent: 33.33 },
        { id: 'u-tuan', sharePercent: 33.34 },
      ]),
    }));
    const balances = computeBalanceMap(ids, expenses, [
      { id: 'p-1', fromId: 'u-tuan', toId: 'u-dat', amount: 10 },
      { id: 'p-2', fromId: 'u-tea', toId: 'u-dat', amount: 20 },
    ]);
    expect(total(balances)).toBeCloseTo(0, 5);
  });

  it('case 18: sparse data returns stable zero-state objects', () => {
    expect(computeBalanceMap(ids, [], undefined)).toEqual({
      'u-dat': 0,
      'u-tea': 0,
      'u-tuan': 0,
      'g-minh': 0,
    });
    expect(computeUserBalance('u-dat', [], [], undefined)).toEqual({
      totalIOwe: 0,
      totalOwedToMe: 0,
      netBalance: 0,
      signedBalance: 0,
    });
  });

  it('runtime safety: null guest ids and missing participant arrays do not crash', () => {
    expect(() => computeUserBalance('u-dat', [], [{
      amount: 100000,
      paidByUserId: 'u-dat',
      paidByGuestMemberId: null,
      participants: [{ userId: 'u-dat', guestMemberId: null, shareAmount: 100000 }],
    }], [])).not.toThrow();

    expect(() => buildBudgetComparisonFromData({
      budgets: [{ id: 'b-1', roomId: null, category: null, amount: 100000, month: 5, year: 2026 }],
      expenses: [{ roomId: 'room-a', category: 'food', participants: undefined }],
      userId: 'u-dat',
      claimedGuestIds: [],
    })).not.toThrow();
  });
});
