// budgetService.js — Budget CRUD + comparison against actual spending
import prisma from '../utils/db.js';

// ── Helpers ───────────────────────────────────────────────────────────────────

function thisMonth() {
  const now = new Date();
  return { month: now.getMonth() + 1, year: now.getFullYear() };
}

// ── List budgets for a user ───────────────────────────────────────────────────

export async function listBudgets(userId) {
  const budgets = await prisma.budget.findMany({
    where:   { userId },
    orderBy: [{ year: 'desc' }, { month: 'desc' }],
  });
  return budgets;
}

// ── Upsert (create or update) a budget ───────────────────────────────────────

export async function upsertBudget(userId, { id, roomId, category, amount, month, year }) {
  if (typeof amount !== 'number' || isNaN(amount) || amount <= 0)
    throw Object.assign(new Error('Số tiền ngân sách phải lớn hơn 0.'), { status: 400 });
  if (!month || month < 1 || month > 12)
    throw Object.assign(new Error('Tháng không hợp lệ.'), { status: 400 });
  if (!year || year < 2020 || year > 2100)
    throw Object.assign(new Error('Năm không hợp lệ.'), { status: 400 });

  if (id) {
    const existing = await prisma.budget.findUnique({ where: { id } });
    if (!existing || existing.userId !== userId)
      throw Object.assign(new Error('Không tìm thấy ngân sách.'), { status: 404 });
    return prisma.budget.update({
      where: { id },
      data: { roomId: roomId ?? null, category: category ?? null, amount, month, year },
    });
  }

  let budget = await prisma.budget.findFirst({
    where: {
      userId,
      roomId: roomId ?? null,
      category: category ?? null,
      month,
      year
    }
  });

  if (budget) {
    budget = await prisma.budget.update({
      where: { id: budget.id },
      data: { amount },
    });
  } else {
    budget = await prisma.budget.create({
      data: { userId, roomId: roomId ?? null, category: category ?? null, amount, month, year },
    });
  }
  return budget;
}

// ── Delete a budget ───────────────────────────────────────────────────────────

export async function deleteBudget(budgetId, userId) {
  const budget = await prisma.budget.findUnique({ where: { id: budgetId } });
  if (!budget || budget.userId !== userId)
    throw Object.assign(new Error('Không tìm thấy ngân sách.'), { status: 404 });
  await prisma.budget.delete({ where: { id: budgetId } });
  return { success: true };
}

// ── Compare budgets vs actual spending ───────────────────────────────────────

/**
 * Returns budget comparison for a user for the given month/year.
 * Actual spending is computed from expenses where user is a participant.
 */
export async function getBudgetComparison(userId, month, year) {
  const budgets = await prisma.budget.findMany({ where: { userId, month, year } });
  if (budgets.length === 0) return { budgets: [], hasData: false };

  // Claimed guest IDs
  const claimedGuests   = await prisma.guestMember.findMany({ where: { claimedByUserId: userId, status: 'claimed' } });
  const claimedGuestIds = claimedGuests.map(g => g.id);
  // Fetch all expenses in the target month
  const startDate = new Date(year, month - 1, 1);
  const endDate   = new Date(year, month, 0, 23, 59, 59);

  const memberships = await prisma.roomMember.findMany({ where: { userId, status: 'approved' } });
  const roomIds     = memberships.map(m => m.roomId);

  const expenses = await prisma.expense.findMany({
    where:   { roomId: { in: roomIds }, date: { gte: startDate, lte: endDate } },
    include: { participants: true },
  });

  const comparison = buildBudgetComparisonFromData({
    budgets,
    expenses,
    userId,
    claimedGuestIds,
  });

  return { budgets: comparison, hasData: true, month, year };
}

export function buildBudgetComparisonFromData({ budgets, expenses, userId, claimedGuestIds }) {
  const isMe = (uId, gId) => (uId && uId === userId) || (gId && claimedGuestIds.includes(gId));
  const actualByScope = {};

  for (const expense of expenses) {
    const myParticipant = expense.participants?.find(p => isMe(p.userId, p.guestMemberId));
    if (!myParticipant) continue;
    const myShare = myParticipant.shareAmount;
    const cat = expense.category || 'other';
    const roomScope = actualByScope[expense.roomId] ?? { total: 0, byCategory: {} };
    roomScope.total += myShare;
    roomScope.byCategory[cat] = (roomScope.byCategory[cat] || 0) + myShare;
    actualByScope[expense.roomId] = roomScope;
  }

  return budgets.map(b => {
    const scopes = b.roomId ? [actualByScope[b.roomId]].filter(Boolean) : Object.values(actualByScope);
    const actual = scopes.reduce((sum, scope) => (
      sum + (b.category ? (scope.byCategory[b.category] || 0) : scope.total)
    ), 0);
    const remaining = b.amount - actual;
    return {
      id:          b.id,
      category:    b.category ?? 'overall',
      roomId:      b.roomId,
      budget:      b.amount,
      actual:      Math.round(actual),
      remaining:   Math.round(remaining),
      usagePct:    b.amount > 0 ? Math.round((actual / b.amount) * 100) : 0,
      overBudget:  actual > b.amount,
      month:       b.month,
      year:        b.year,
    };
  });
}
