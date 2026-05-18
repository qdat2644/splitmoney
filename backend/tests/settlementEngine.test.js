import { describe, expect, it } from 'vitest';
import { computeBalanceMap, computeSettlements, resolveShares } from '../utils/settlement.js';

const IDS = ['u-dat', 'u-tea', 'u-tuan', 'g-minh'];
const participants = (...ids) => ids.map((id) => ({ id }));
const expense = (paidById, amount, ids, splitType = 'equal') => ({
  paidById,
  amount,
  participants: resolveShares(amount, splitType, participants(...ids)),
});
const sum = (balances) => Object.values(balances).reduce((total, value) => total + value, 0);

describe('settlement engine regression', () => {
  it('case 1: equal split keeps correct debt direction and zero-sum balance', () => {
    const balances = computeBalanceMap(IDS, [expense('u-dat', 300000, ['u-dat', 'u-tea', 'u-tuan'])]);
    expect(balances).toMatchObject({ 'u-dat': 200000, 'u-tea': -100000, 'u-tuan': -100000 });
    expect(sum(balances)).toBe(0);
    expect(computeSettlements(balances)).toEqual([
      { from: 'u-tea', to: 'u-dat', amount: 100000 },
      { from: 'u-tuan', to: 'u-dat', amount: 100000 },
    ]);
  });

  it('case 2: partial payment reduces debt without inverting direction', () => {
    const balances = computeBalanceMap(
      IDS,
      [expense('u-dat', 200000, ['u-dat', 'u-tea'])],
      [{ id: 'p-1', fromId: 'u-tea', toId: 'u-dat', amount: 40000 }],
    );
    expect(balances['u-dat']).toBe(60000);
    expect(balances['u-tea']).toBe(-60000);
  });

  it('case 3: exact settlement clears both balances', () => {
    const balances = computeBalanceMap(
      IDS,
      [expense('u-dat', 200000, ['u-dat', 'u-tea'])],
      [{ id: 'p-1', fromId: 'u-tea', toId: 'u-dat', amount: 100000 }],
    );
    expect(balances['u-dat']).toBe(0);
    expect(balances['u-tea']).toBe(0);
  });

  it('case 4: overpayment flips balances instead of clamping them', () => {
    const balances = computeBalanceMap(
      IDS,
      [expense('u-dat', 200000, ['u-dat', 'u-tea'])],
      [{ id: 'p-1', fromId: 'u-tea', toId: 'u-dat', amount: 150000 }],
    );
    expect(balances['u-tea']).toBe(50000);
    expect(balances['u-dat']).toBe(-50000);
  });

  it('case 5: multiple expenses preserve money conservation', () => {
    const balances = computeBalanceMap(IDS, [
      expense('u-dat', 300000, ['u-dat', 'u-tea', 'u-tuan']),
      expense('u-tea', 150000, ['u-dat', 'u-tea']),
      expense('u-tuan', 90000, ['u-tuan']),
    ]);
    expect(sum(balances)).toBe(0);
  });

  it('case 6: guest participants are included in balance integrity', () => {
    const balances = computeBalanceMap(IDS, [
      expense('u-dat', 400000, ['u-dat', 'u-tea', 'g-minh', 'u-tuan']),
    ]);
    expect(balances['g-minh']).toBe(-100000);
    expect(sum(balances)).toBe(0);
  });

  it('fails invalid split arrays safely', () => {
    expect(() => resolveShares(100000, 'exact', [
      { id: 'u-dat', shareAmount: 60000 },
      { id: 'u-tea', shareAmount: 30000 },
    ])).toThrow();
    expect(() => resolveShares(100000, 'equal', [])).toThrow();
  });
});
