import prisma from '../utils/db.js';
import { computeUserBalance } from '../utils/settlement.js';
import { buildBudgetComparisonFromData } from './budgetService.js';
import { buildPersonalFinanceSnapshot } from './personalFinanceSnapshotService.js';

const MONTH_WINDOW = 12;

export async function buildPersonalAnalytics(userId, snapshot = null) {
  const finance = snapshot ?? await buildPersonalFinanceSnapshot(userId);
  const { memberships, claimedGuestIds, myExpenses, allPayments, allExpenses, isMe } = finance;
  if (memberships.length === 0) return emptyAnalytics();

  const now = new Date();
  const monthSeries = recentMonthKeys(MONTH_WINDOW);
  const monthly = initSeries(monthSeries);
  const categorySeries = {};
  const roomSeries = {};
  const paymentSeries = initSeries(monthSeries);
  const categoryTotals = {};
  const roomTotals = {};
  const roomNames = {};
  const currentMonthExpenses = [];
  const participantShares = [];

  for (const expense of myExpenses) {
    const month = monthKey(expense.date);
    if (!(month in monthly)) continue;
    const participant = expense.participants.find((entry) => isMe(entry.userId, entry.guestMemberId));
    if (!participant) continue;

    const share = participant.shareAmount;
    const category = expense.category || 'other';
    monthly[month] += share;
    categorySeries[category] ??= initSeries(monthSeries);
    categorySeries[category][month] += share;
    roomSeries[expense.roomId] ??= initSeries(monthSeries);
    roomSeries[expense.roomId][month] += share;
    roomNames[expense.roomId] = expense.room.name;
    categoryTotals[category] = (categoryTotals[category] || 0) + share;
    roomTotals[expense.roomId] = (roomTotals[expense.roomId] || 0) + share;
    participantShares.push({ expense, share });

    if (sameMonth(expense.date, now)) currentMonthExpenses.push({ expense, share });
  }

  for (const payment of allPayments) {
    const month = monthKey(payment.paidAt);
    if (!(month in paymentSeries)) continue;
    const affectsMe = isMe(payment.fromUserId, payment.fromGuestMemberId) || isMe(payment.toUserId, payment.toGuestMemberId);
    if (affectsMe) paymentSeries[month] += payment.amount;
  }

  const currentMonthBudgets = await prisma.budget.findMany({
    where: { userId, month: now.getMonth() + 1, year: now.getFullYear() },
  });
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  const currentMonthAllExpenses = allExpenses.filter((expense) => expense.date >= monthStart && expense.date <= monthEnd);
  const currentBudgetComparison = buildBudgetComparisonFromData({
    budgets: currentMonthBudgets,
    expenses: currentMonthAllExpenses,
    userId,
    claimedGuestIds,
  });

  const monthlyTrend = toSeries(monthly);
  const categoryTrend = Object.entries(categorySeries).map(([category, values]) => ({
    category,
    points: toSeries(values),
  }));
  const roomTrend = Object.entries(roomSeries).map(([roomId, values]) => ({
    roomId,
    roomName: roomNames[roomId],
    points: toSeries(values),
  }));
  const paymentTrend = toSeries(paymentSeries);
  const topCategories = topEntries(categoryTotals, 'category');
  const topRooms = Object.entries(roomTotals)
    .map(([roomId, amount]) => ({ roomId, roomName: roomNames[roomId], amount: Math.round(amount) }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5);

  const debtHealth = buildDebtHealth({ monthlyTrend, allPayments, myExpenses, userId, claimedGuestIds });
  const forecast = buildForecast({
    monthlyTrend,
    categoryTrend,
    roomTrend,
    currentMonthExpenses,
    currentBudgetComparison,
    debtHealth,
    now,
  });
  const recurringCandidates = detectRecurringCandidates(participantShares);
  const anomalies = detectAnomalies({
    monthlyTrend,
    categoryTrend,
    roomTrend,
    currentMonthExpenses,
    debtHealth,
  });
  const spendingVelocity = buildSpendingVelocity(currentMonthExpenses, now);
  const budgetHealth = buildBudgetHealth(currentBudgetComparison, forecast);

  return {
    monthlyTrend,
    categoryTrend,
    roomTrend,
    paymentTrend,
    topCategories,
    topRooms,
    spendingVelocity,
    budgetHealth,
    debtHealth,
    forecast,
    recurringCandidates,
    anomalies,
  };
}

function buildForecast({ monthlyTrend, categoryTrend, roomTrend, currentMonthExpenses, currentBudgetComparison, debtHealth, now }) {
  const daysElapsed = Math.max(1, now.getDate());
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const monthToDate = currentMonthExpenses.reduce((sum, entry) => sum + entry.share, 0);
  const recentCompleted = monthlyTrend.slice(-4, -1).map((point) => point.amount).filter((amount) => amount > 0);
  const movingAverage = average(recentCompleted);
  const extrapolated = Math.round((monthToDate / daysElapsed) * daysInMonth);
  const forecastMonthTotal = Math.round(extrapolated || movingAverage || monthToDate);
  const confidence = Math.min(0.9, Math.max(0.35, (recentCompleted.length / 3) * 0.5 + Math.min(daysElapsed / daysInMonth, 1) * 0.4));

  const forecastByCategory = categoryTrend.map((series) => {
    const current = series.points.at(-1)?.amount ?? 0;
    const historicAverage = average(series.points.slice(-4, -1).map((point) => point.amount).filter((amount) => amount > 0));
    const forecastAmount = Math.round(current ? (current / daysElapsed) * daysInMonth : historicAverage);
    return { category: series.category, forecastAmount };
  }).sort((a, b) => b.forecastAmount - a.forecastAmount);

  const forecastByRoom = roomTrend.map((series) => {
    const current = series.points.at(-1)?.amount ?? 0;
    const historicAverage = average(series.points.slice(-4, -1).map((point) => point.amount).filter((amount) => amount > 0));
    const forecastAmount = Math.round(current ? (current / daysElapsed) * daysInMonth : historicAverage);
    return { roomId: series.roomId, roomName: series.roomName, forecastAmount };
  }).sort((a, b) => b.forecastAmount - a.forecastAmount);

  const riskCategories = currentBudgetComparison
    .filter((budget) => budget.category !== 'overall')
    .map((budget) => {
      const categoryForecast = forecastByCategory.find((entry) => entry.category === budget.category)?.forecastAmount ?? 0;
      return { category: budget.category, forecastAmount: categoryForecast, budget: budget.budget };
    })
    .filter((entry) => entry.forecastAmount > entry.budget)
    .sort((a, b) => (b.forecastAmount - b.budget) - (a.forecastAmount - a.budget));

  return {
    forecastMonthTotal,
    forecastByCategory,
    forecastByRoom,
    riskCategories,
    riskRooms: forecastByRoom.filter((room) => {
      const roomBudget = currentBudgetComparison.find((budget) => budget.roomId === room.roomId && budget.category === 'overall');
      return roomBudget && room.forecastAmount > roomBudget.budget;
    }),
    debtTrendDirection: debtHealth.direction,
    confidence: Number(confidence.toFixed(2)),
    assumptions: [
      'Dua tren chi tieu tu dau thang den hien tai.',
      'Doi chieu voi trung binh toi da 3 thang gan nhat.',
      'Du bao chi mang tinh chi bao, khong phai cam ket.',
    ],
  };
}

function detectRecurringCandidates(participantShares) {
  const groups = {};
  for (const { expense, share } of participantShares) {
    const key = `${normalizeTitle(expense.title)}::${expense.category || 'other'}`;
    groups[key] ??= [];
    groups[key].push({ date: new Date(expense.date), share, title: expense.title, category: expense.category || 'other' });
  }

  return Object.values(groups)
    .filter((items) => items.length >= 3)
    .map((items) => {
      const sorted = items.sort((a, b) => a.date - b.date);
      const gaps = sorted.slice(1).map((item, index) => dayDiff(sorted[index].date, item.date));
      const avgGap = average(gaps);
      const frequency = avgGap >= 24 && avgGap <= 36 ? 'monthly' : avgGap >= 5 && avgGap <= 10 ? 'weekly' : 'irregular';
      const amountVariance = coefficientOfVariation(sorted.map((item) => item.share));
      const cadenceScore = frequency === 'irregular' ? 0.45 : 0.75;
      const confidence = Math.min(0.95, cadenceScore + Math.max(0, 0.2 - amountVariance));
      return {
        title: sorted.at(-1).title,
        category: sorted.at(-1).category,
        estimatedAmount: Math.round(average(sorted.map((item) => item.share))),
        frequency,
        confidence: Number(confidence.toFixed(2)),
      };
    })
    .filter((candidate) => candidate.confidence >= 0.55)
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 6);
}

function detectAnomalies({ monthlyTrend, categoryTrend, roomTrend, currentMonthExpenses, debtHealth }) {
  const anomalies = [];
  const currentMonth = monthlyTrend.at(-1)?.amount ?? 0;
  const priorMonths = monthlyTrend.slice(-4, -1).map((point) => point.amount).filter((amount) => amount > 0);
  const priorAverage = average(priorMonths);
  if (priorAverage > 0 && currentMonth > priorAverage * 1.5) {
    anomalies.push({
      type: 'large_expense',
      title: 'Chi tieu thang nay tang manh',
      message: `Tong chi thang nay cao hon trung binh gan day ${Math.round(((currentMonth - priorAverage) / priorAverage) * 100)}%.`,
      severity: 'warning',
      confidence: 0.82,
    });
  }

  for (const series of categoryTrend) {
    const current = series.points.at(-1)?.amount ?? 0;
    const previous = average(series.points.slice(-4, -1).map((point) => point.amount).filter((amount) => amount > 0));
    if (previous > 0 && current > previous * 1.6) {
      anomalies.push({
        type: 'category_spike',
        title: `Danh muc ${series.category} tang dot bien`,
        message: `Chi tieu ${series.category} cao hon trung binh gan day ${Math.round(((current - previous) / previous) * 100)}%.`,
        severity: 'warning',
        confidence: 0.84,
      });
    }
  }

  for (const series of roomTrend) {
    const current = series.points.at(-1)?.amount ?? 0;
    const previous = average(series.points.slice(-4, -1).map((point) => point.amount).filter((amount) => amount > 0));
    if (previous > 0 && current > previous * 1.6) {
      anomalies.push({
        type: 'room_spike',
        title: `Phong ${series.roomName} tang chi tieu`,
        message: `Chi tieu phong nay cao hon trung binh gan day ${Math.round(((current - previous) / previous) * 100)}%.`,
        severity: 'warning',
        confidence: 0.82,
      });
    }
  }

  const values = currentMonthExpenses.map((entry) => entry.share);
  const currentAverage = average(values);
  for (const entry of currentMonthExpenses) {
    if (currentAverage > 0 && entry.share > currentAverage * 2.5 && entry.share > 100000) {
      anomalies.push({
        type: 'large_expense',
        title: entry.expense.title,
        message: 'Khoan chi nay lon hon dang ke so voi muc chi thong thuong gan day.',
        severity: 'info',
        confidence: 0.76,
      });
    }
  }

  if (debtHealth.direction === 'worsening') {
    anomalies.push({
      type: 'debt_spike',
      title: 'No dang tang',
      message: 'Dong tien thanh toan gan day cho thay so no dang xau di.',
      severity: 'warning',
      confidence: 0.72,
    });
  }

  return anomalies.slice(0, 8);
}

function buildSpendingVelocity(currentMonthExpenses, now) {
  const spentToDate = Math.round(currentMonthExpenses.reduce((sum, entry) => sum + entry.share, 0));
  const dayOfMonth = Math.max(1, now.getDate());
  const dailyAverage = Math.round(spentToDate / dayOfMonth);
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  return {
    spentToDate,
    dailyAverage,
    projectedMonthEnd: dailyAverage * daysInMonth,
    daysElapsed: dayOfMonth,
    daysInMonth,
  };
}

function buildBudgetHealth(currentBudgetComparison, forecast) {
  const overBudgetCount = currentBudgetComparison.filter((budget) => budget.overBudget).length;
  const atRiskCount = forecast.riskCategories.length + forecast.riskRooms.length;
  return {
    trackedBudgets: currentBudgetComparison.length,
    overBudgetCount,
    atRiskCount,
    status: overBudgetCount > 0 ? 'over' : atRiskCount > 0 ? 'risk' : 'healthy',
    budgets: currentBudgetComparison,
  };
}

function buildDebtHealth({ monthlyTrend, allPayments, myExpenses, userId, claimedGuestIds }) {
  const latestThree = monthlyTrend.slice(-3).map((point) => point.month);
  const monthlyDebt = latestThree.map((month) => {
    const expenses = myExpenses.filter((expense) => monthKey(expense.date) <= month);
    const payments = allPayments.filter((payment) => monthKey(payment.paidAt) <= month);
    return {
      month,
      netBalance: computeUserBalance(userId, claimedGuestIds, expenses, payments).netBalance,
    };
  });
  const current = monthlyDebt.at(-1)?.netBalance ?? 0;
  const previous = monthlyDebt.at(-2)?.netBalance ?? current;
  return {
    currentNetBalance: current,
    direction: current > previous ? 'improving' : current < previous ? 'worsening' : 'stable',
    monthlyDebt,
  };
}

function initSeries(months) {
  return Object.fromEntries(months.map((month) => [month, 0]));
}

function toSeries(values) {
  return Object.entries(values).map(([month, amount]) => ({ month, amount: Math.round(amount) }));
}

function recentMonthKeys(count) {
  return Array.from({ length: count }, (_, index) => {
    const date = new Date();
    date.setMonth(date.getMonth() - (count - 1 - index));
    return monthKey(date);
  });
}

function monthKey(value) {
  const date = new Date(value);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function sameMonth(a, b) {
  return monthKey(a) === monthKey(b);
}

function topEntries(values, key) {
  return Object.entries(values)
    .map(([name, amount]) => ({ [key]: name, amount: Math.round(amount) }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5);
}

function average(values) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function coefficientOfVariation(values) {
  const avg = average(values);
  if (!avg) return 1;
  const variance = average(values.map((value) => (value - avg) ** 2));
  return Math.sqrt(variance) / avg;
}

function dayDiff(a, b) {
  return Math.round((b - a) / (1000 * 60 * 60 * 24));
}

function normalizeTitle(title) {
  return title.trim().toLowerCase().replace(/\s+/g, ' ');
}

function emptyAnalytics() {
  return {
    monthlyTrend: [],
    categoryTrend: [],
    roomTrend: [],
    paymentTrend: [],
    topCategories: [],
    topRooms: [],
    spendingVelocity: {},
    budgetHealth: { trackedBudgets: 0, overBudgetCount: 0, atRiskCount: 0, status: 'healthy', budgets: [] },
    debtHealth: { currentNetBalance: 0, direction: 'stable', monthlyDebt: [] },
    forecast: {
      forecastMonthTotal: 0,
      forecastByCategory: [],
      forecastByRoom: [],
      riskCategories: [],
      riskRooms: [],
      debtTrendDirection: 'stable',
      confidence: 0,
      assumptions: [],
    },
    recurringCandidates: [],
    anomalies: [],
  };
}
