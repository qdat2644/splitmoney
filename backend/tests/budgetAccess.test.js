import { describe, expect, it } from 'vitest';
import { buildBudgetComparisonFromData } from '../services/budgetService.js';

describe('budget access regression', () => {
  it('case 11: room budgets only read expenses from their own room', () => {
    const [budget] = buildBudgetComparisonFromData({
      budgets: [{ id: 'b-1', roomId: 'room-a', category: null, amount: 1000000, month: 5, year: 2026 }],
      expenses: [
        { roomId: 'room-a', category: 'food', participants: [{ userId: 'u-dat', guestMemberId: null, shareAmount: 250000 }] },
        { roomId: 'room-b', category: 'food', participants: [{ userId: 'u-dat', guestMemberId: null, shareAmount: 900000 }] },
      ],
      userId: 'u-dat',
      claimedGuestIds: [],
    });
    expect(budget.actual).toBe(250000);
  });

  it('case 12: personal budgets only include the requesting user shares', () => {
    const [budget] = buildBudgetComparisonFromData({
      budgets: [{ id: 'b-1', roomId: null, category: null, amount: 1000000, month: 5, year: 2026 }],
      expenses: [{
        roomId: 'room-a',
        category: 'food',
        participants: [
          { userId: 'u-dat', guestMemberId: null, shareAmount: 250000 },
          { userId: 'u-tea', guestMemberId: null, shareAmount: 750000 },
        ],
      }],
      userId: 'u-dat',
      claimedGuestIds: [],
    });
    expect(budget.actual).toBe(250000);
  });
});
