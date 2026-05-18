import { describe, expect, it } from 'vitest';
import { computeBalanceMap, resolveShares } from '../utils/settlement.js';

const ids = ['u-dat', 'u-tea'];
const baseExpense = {
  paidById: 'u-dat',
  amount: 200000,
  participants: resolveShares(200000, 'equal', [{ id: 'u-dat' }, { id: 'u-tea' }]),
};

describe('payment ledger regression', () => {
  it('case 7: payment direction reduces sender debt and receiver credit', () => {
    const before = computeBalanceMap(ids, [baseExpense]);
    const after = computeBalanceMap(ids, [baseExpense], [
      { id: 'p-1', fromId: 'u-tea', toId: 'u-dat', amount: 40000 },
    ]);
    expect(before).toMatchObject({ 'u-dat': 100000, 'u-tea': -100000 });
    expect(after).toMatchObject({ 'u-dat': 60000, 'u-tea': -60000 });
  });

  it('case 8: room-filtered ledgers stay isolated', () => {
    const roomA = computeBalanceMap(ids, [baseExpense], [
      { id: 'p-a', roomId: 'room-a', fromId: 'u-tea', toId: 'u-dat', amount: 40000 },
    ]);
    const roomB = computeBalanceMap(ids, [], [
      { id: 'p-b', roomId: 'room-b', fromId: 'u-dat', toId: 'u-tea', amount: 25000 },
    ]);
    expect(roomA).toMatchObject({ 'u-dat': 60000, 'u-tea': -60000 });
    expect(roomB).toMatchObject({ 'u-dat': 25000, 'u-tea': -25000 });
  });

  it('case 9: duplicate payment objects do not double count', () => {
    const payment = { id: 'p-1', fromId: 'u-tea', toId: 'u-dat', amount: 40000 };
    const balances = computeBalanceMap(ids, [baseExpense], [payment, payment]);
    expect(balances).toMatchObject({ 'u-dat': 60000, 'u-tea': -60000 });
  });
});
