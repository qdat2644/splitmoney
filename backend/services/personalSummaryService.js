import { computeUserBalance } from '../utils/settlement.js';
import { buildPersonalFinanceSnapshot } from './personalFinanceSnapshotService.js';

export async function buildPersonalSummary(userId, snapshot = null) {
  const finance = snapshot ?? await buildPersonalFinanceSnapshot(userId);
  const { memberships, claimedGuestIds, allPayments, myExpenses, isMe } = finance;

  if (memberships.length === 0) return emptyResult();

  const { totalIOwe, totalOwedToMe, netBalance } = computeUserBalance(
    userId,
    claimedGuestIds,
    myExpenses,
    allPayments
  );

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  let totalSpentThisMonth = 0;
  const categoryTotals = {};
  const roomTotals = {};
  const monthlyTotals = {};
  const recentExpenses = [];

  for (const expense of myExpenses) {
    const { participants } = expense;
    if (!participants?.length) continue;

    const iAmParticipant = participants.some((participant) => isMe(participant.userId, participant.guestMemberId));
    const paidByMe = isMe(expense.paidByUserId, expense.paidByGuestMemberId);
    if (!iAmParticipant && !paidByMe) continue;

    const myParticipant = participants.find((participant) => isMe(participant.userId, participant.guestMemberId));
    const myShare = myParticipant ? myParticipant.shareAmount : 0;
    const expDate = new Date(expense.date);
    const monthKey = `${expDate.getFullYear()}-${String(expDate.getMonth() + 1).padStart(2, '0')}`;

    if (iAmParticipant) {
      if (expDate.getFullYear() === currentYear && expDate.getMonth() === currentMonth) totalSpentThisMonth += myShare;

      const category = expense.category || 'other';
      categoryTotals[category] = (categoryTotals[category] || 0) + myShare;

      const roomId = expense.room.id;
      if (!roomTotals[roomId]) roomTotals[roomId] = { name: expense.room.name, amount: 0 };
      roomTotals[roomId].amount += myShare;
      monthlyTotals[monthKey] = (monthlyTotals[monthKey] || 0) + myShare;
    }

    if (recentExpenses.length < 10) {
      recentExpenses.push({
        id: expense.id,
        roomId: expense.room.id,
        roomName: expense.room.name,
        title: expense.title,
        amount: expense.amount,
        splitType: expense.splitType || 'equal',
        category: expense.category || 'other',
        date: expense.date.toISOString().split('T')[0],
        paidByMe,
        myShareAmount: iAmParticipant ? Math.round(myShare) : 0,
      });
    }
  }

  const categoryBreakdown = Object.entries(categoryTotals)
    .map(([category, amount]) => ({ category, amount: Math.round(amount) }))
    .sort((a, b) => b.amount - a.amount);
  const roomBreakdown = Object.entries(roomTotals)
    .map(([roomId, room]) => ({ roomId, roomName: room.name, amount: Math.round(room.amount) }))
    .sort((a, b) => b.amount - a.amount);
  const monthlyTrend = Object.entries(monthlyTotals)
    .map(([month, amount]) => ({ month, amount: Math.round(amount) }))
    .sort((a, b) => a.month.localeCompare(b.month))
    .slice(-6);

  return {
    totalSpentThisMonth: Math.round(totalSpentThisMonth),
    totalIOwe,
    totalOwedToMe,
    netBalance,
    activeRoomsCount: memberships.length,
    highestSpendingCategory: categoryBreakdown[0]?.category ?? null,
    highestSpendingRoom: roomBreakdown[0]?.roomName ?? null,
    categoryBreakdown,
    roomBreakdown,
    monthlyTrend,
    recentExpenses,
  };
}

function emptyResult() {
  return {
    totalSpentThisMonth: 0,
    totalIOwe: 0,
    totalOwedToMe: 0,
    netBalance: 0,
    activeRoomsCount: 0,
    highestSpendingCategory: null,
    highestSpendingRoom: null,
    categoryBreakdown: [],
    roomBreakdown: [],
    monthlyTrend: [],
    recentExpenses: [],
  };
}
