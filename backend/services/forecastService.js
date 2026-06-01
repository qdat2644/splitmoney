import { buildPersonalAnalytics } from './analyticsService.js';
import { buildPersonalFinanceSnapshot } from './personalFinanceSnapshotService.js';

const MIN_EXPENSES_FOR_FORECAST = 5;
const MIN_DAYS_FOR_FORECAST = 7;

export async function buildUserForecast(userId) {
  const snapshot = await buildPersonalFinanceSnapshot(userId);
  const analytics = await buildPersonalAnalytics(userId, snapshot);
  return buildUserForecastFromAnalytics({ userId, snapshot, analytics });
}

export function buildUserForecastFromAnalytics({ userId, snapshot, analytics, now = new Date() }) {
  const personalEntries = extractPersonalEntries({ snapshot, userId });
  const dataProfile = buildDataProfile(personalEntries, now);
  const confidence = buildConfidence(dataProfile, analytics);
  const categoryForecasts = buildCategoryForecasts(analytics);
  const budgetOutlook = buildBudgetOutlook(analytics);
  const recurringForecasts = buildRecurringForecasts(analytics);
  const earlyWarnings = buildEarlyWarnings({ analytics, budgetOutlook, confidence });
  const summary = buildSummary({ analytics, categoryForecasts, budgetOutlook, confidence });

  return {
    summary,
    categoryForecasts,
    recurringForecasts,
    budgetOutlook,
    earlyWarnings,
    meta: {
      generatedAt: new Date(now).toISOString(),
      dataQuality: dataProfile.quality,
      monthsAnalyzed: dataProfile.monthsAnalyzed,
    },
  };
}

function buildSummary({ analytics, categoryForecasts, budgetOutlook, confidence }) {
  const projectedMonthlySpend = Math.round(analytics?.forecast?.forecastMonthTotal || 0);
  const currentMonthSpend = Math.round(analytics?.spendingVelocity?.spentToDate || 0);
  const dailyAverage = Math.round(analytics?.spendingVelocity?.dailyAverage || 0);
  const topProjectedCategory = categoryForecasts.find((item) => item.projectedSpend > 0)?.category ?? null;
  const projectedBudgetRisk = summarizeBudgetRisk(budgetOutlook);

  return {
    projectedMonthlySpend,
    currentMonthSpend,
    dailyAverage,
    projectedBudgetRisk,
    topProjectedCategory,
    confidence,
  };
}

function buildCategoryForecasts(analytics) {
  const forecastByCategory = analytics?.forecast?.forecastByCategory ?? [];
  const categoryTrend = analytics?.categoryTrend ?? [];
  const budgetRisks = new Map((analytics?.forecast?.riskCategories ?? []).map((item) => [item.category, item]));

  return forecastByCategory
    .map((forecast) => {
      const series = categoryTrend.find((item) => item.category === forecast.category);
      const points = series?.points ?? [];
      const currentSpend = Math.round(points.at(-1)?.amount || 0);
      const previousMonthSpend = Math.round(points.at(-2)?.amount || 0);
      const projectedSpend = Math.round(forecast.forecastAmount || 0);
      const trend = inferTrend(currentSpend, previousMonthSpend);
      const budget = budgetRisks.get(forecast.category)?.budget || 0;
      const riskLevel = inferCategoryRisk({ projectedSpend, currentSpend, budget, trend });

      return {
        category: forecast.category,
        currentSpend,
        projectedSpend,
        previousMonthSpend,
        trend,
        riskLevel,
        confidence: categoryConfidence({ currentSpend, previousMonthSpend, projectedSpend }),
        reason: categoryReason({ category: forecast.category, currentSpend, previousMonthSpend, projectedSpend, budget, trend }),
      };
    })
    .filter((item) => item.currentSpend > 0 || item.projectedSpend > 0 || item.previousMonthSpend > 0)
    .sort((left, right) => right.projectedSpend - left.projectedSpend)
    .slice(0, 8);
}

function buildRecurringForecasts(analytics) {
  return (analytics?.recurringCandidates ?? []).map((item) => ({
    title: item.title,
    category: item.category,
    estimatedAmount: Math.round(item.estimatedAmount || 0),
    cadence: item.frequency === 'weekly' || item.frequency === 'monthly' ? item.frequency : 'irregular',
    nextExpectedWindow: nextExpectedWindow(item.frequency),
    confidence: clamp01(item.confidence || 0),
  }));
}

function buildBudgetOutlook(analytics) {
  const categoryForecasts = new Map((analytics?.forecast?.forecastByCategory ?? []).map((item) => [item.category, item.forecastAmount || 0]));
  const overallProjected = analytics?.forecast?.forecastMonthTotal || 0;

  return (analytics?.budgetHealth?.budgets ?? []).map((budget) => {
    const category = budget.category || 'overall';
    const projectedSpend = Math.round(category === 'overall' ? overallProjected : categoryForecasts.get(category) || budget.actual || 0);
    const budgetAmount = Math.round(budget.budget || 0);
    const currentSpend = Math.round(budget.actual || 0);
    const ratio = budgetAmount > 0 ? projectedSpend / budgetAmount : 0;
    const currentRatio = budgetAmount > 0 ? currentSpend / budgetAmount : 0;

    return {
      category,
      budgetAmount,
      currentSpend,
      projectedSpend,
      status: currentRatio >= 1 ? 'over' : ratio >= 1 ? 'at_risk' : ratio >= 0.8 ? 'watch' : 'safe',
    };
  }).sort((left, right) => statusWeight(right.status) - statusWeight(left.status));
}

function buildEarlyWarnings({ analytics, budgetOutlook, confidence }) {
  const warnings = [];

  for (const budget of budgetOutlook.filter((item) => item.status === 'over' || item.status === 'at_risk').slice(0, 3)) {
    warnings.push({
      type: 'budget_outlook',
      title: budget.status === 'over' ? 'Ngân sách đã vượt hạn mức' : 'Ngân sách có thể cần theo dõi',
      message: budget.status === 'over'
        ? `Danh mục ${formatCategoryLabel(budget.category)} đã vượt ngân sách trong tháng này.`
        : `Nếu giữ nhịp hiện tại, ${formatCategoryLabel(budget.category)} có thể vượt hạn mức trước cuối tháng.`,
      severity: budget.status === 'over' ? 'high' : 'medium',
      confidence: confidence.score,
    });
  }

  for (const item of (analytics?.anomalies ?? []).slice(0, 4 - warnings.length)) {
    warnings.push({
      type: item.type || 'spending_signal',
      title: item.title,
      message: item.message,
      severity: item.severity === 'warning' ? 'medium' : 'low',
      confidence: clamp01(item.confidence || confidence.score),
    });
  }

  if (warnings.length === 0 && confidence.level === 'low') {
    warnings.push({
      type: 'data_quality',
      title: 'Dữ liệu dự báo còn mỏng',
      message: 'Zyra cần thêm giao dịch hoặc thêm ngày theo dõi để đưa ra dự báo đáng tin cậy hơn.',
      severity: 'low',
      confidence: confidence.score,
    });
  }

  return warnings;
}

function buildDataProfile(entries, now) {
  const validEntries = entries.filter((entry) => entry.amount > 0 && entry.date <= now);
  const months = new Set(validEntries.map((entry) => monthKey(entry.date)));
  const usableDays = countUsableDays(validEntries);
  const expenseCount = validEntries.length;
  const monthsAnalyzed = months.size;

  let quality = 'strong';
  if (expenseCount < MIN_EXPENSES_FOR_FORECAST || usableDays < MIN_DAYS_FOR_FORECAST) quality = 'sparse';
  else if (expenseCount < 10 || monthsAnalyzed < 2) quality = 'limited';
  else if (expenseCount < 24 || monthsAnalyzed < 3 || usableDays < 21) quality = 'usable';

  return { expenseCount, usableDays, monthsAnalyzed, quality };
}

function buildConfidence(dataProfile, analytics) {
  const hasPriorMonth = (analytics?.monthlyTrend ?? []).slice(0, -1).some((item) => item.amount > 0);
  const hasBudgetData = (analytics?.budgetHealth?.trackedBudgets || 0) > 0;
  const qualityScore = { sparse: 0.18, limited: 0.42, usable: 0.66, strong: 0.82 }[dataProfile.quality] ?? 0.18;
  const score = clamp01(qualityScore + (hasPriorMonth ? 0.08 : -0.06) + (hasBudgetData ? 0.05 : -0.03));
  const level = score >= 0.7 ? 'high' : score >= 0.45 ? 'medium' : 'low';

  return {
    level,
    score: Number(score.toFixed(2)),
    reason: confidenceReason({ dataProfile, hasPriorMonth, hasBudgetData }),
  };
}

function confidenceReason({ dataProfile, hasPriorMonth, hasBudgetData }) {
  if (dataProfile.quality === 'sparse') {
    return 'Cần thêm dữ liệu để tạo dự báo đáng tin cậy.';
  }
  if (!hasPriorMonth && !hasBudgetData) {
    return 'Dự báo dựa chủ yếu trên nhịp chi hiện tại vì chưa có đủ tháng trước và ngân sách để đối chiếu.';
  }
  if (!hasPriorMonth) {
    return 'Dự báo có ngân sách để đối chiếu nhưng còn thiếu dữ liệu tháng trước.';
  }
  if (!hasBudgetData) {
    return 'Dự báo có dữ liệu lịch sử nhưng chưa có ngân sách để đánh giá rủi ro.';
  }
  return 'Dự báo kết hợp nhịp chi hiện tại, dữ liệu tháng trước và ngân sách đang theo dõi.';
}

function extractPersonalEntries({ snapshot, userId }) {
  const claimedGuestIds = snapshot?.claimedGuestIds ?? [];
  const isMe = snapshot?.isMe ?? ((userRef, guestRef) => (userRef && userRef === userId) || (guestRef && claimedGuestIds.includes(guestRef)));

  return (snapshot?.myExpenses ?? []).map((expense) => {
    const participant = expense.participants?.find((entry) => isMe(entry.userId, entry.guestMemberId));
    return {
      id: expense.id,
      title: expense.title,
      category: expense.category || 'other',
      amount: Number(participant?.shareAmount || 0),
      date: new Date(expense.date),
    };
  }).filter((entry) => Number.isFinite(entry.date.getTime()));
}

function inferTrend(current, previous) {
  if (!previous && !current) return 'unknown';
  if (!previous) return 'unknown';
  const delta = (current - previous) / previous;
  if (Math.abs(delta) < 0.12) return 'stable';
  return delta > 0 ? 'up' : 'down';
}

function inferCategoryRisk({ projectedSpend, currentSpend, budget, trend }) {
  if (budget > 0) {
    if (currentSpend >= budget || projectedSpend >= budget) return 'high';
    if (projectedSpend >= budget * 0.8) return 'medium';
  }
  if (trend === 'up' && projectedSpend > 0) return 'medium';
  return 'low';
}

function categoryConfidence({ currentSpend, previousMonthSpend, projectedSpend }) {
  let score = 0.35;
  if (currentSpend > 0) score += 0.2;
  if (previousMonthSpend > 0) score += 0.2;
  if (projectedSpend > 0) score += 0.1;
  return Number(Math.min(0.85, score).toFixed(2));
}

function categoryReason({ category, currentSpend, previousMonthSpend, projectedSpend, budget, trend }) {
  const label = formatCategoryLabel(category);
  if (!previousMonthSpend) return `${label} được dự báo từ nhịp chi hiện tại vì chưa có đủ tháng trước để so sánh.`;
  if (budget && projectedSpend > budget) return `${label} có thể vượt ngân sách nếu nhịp hiện tại tiếp tục.`;
  if (trend === 'up') return `${label} đang cao hơn tháng trước, nên dự báo được nâng thận trọng.`;
  if (trend === 'down') return `${label} đang thấp hơn tháng trước.`;
  return `${label} đang khá gần với tháng trước.`;
}

function summarizeBudgetRisk(budgetOutlook) {
  if (!budgetOutlook.length) return 'unknown';
  if (budgetOutlook.some((item) => item.status === 'over' || item.status === 'at_risk')) return 'high';
  if (budgetOutlook.some((item) => item.status === 'watch')) return 'medium';
  return 'low';
}

function nextExpectedWindow(frequency) {
  if (frequency === 'weekly') return 'Trong khoảng 7 đến 10 ngày tới';
  if (frequency === 'monthly') return 'Trong chu kỳ tháng tiếp theo';
  return 'Khi nhịp chi tương tự lặp lại';
}

function statusWeight(status) {
  return { over: 4, at_risk: 3, watch: 2, safe: 1 }[status] ?? 0;
}

function countUsableDays(entries) {
  return new Set(entries.map((entry) => entry.date.toISOString().slice(0, 10))).size;
}

function monthKey(value) {
  const date = new Date(value);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function clamp01(value) {
  return Math.max(0, Math.min(1, Number(value) || 0));
}

function formatCategoryLabel(category) {
  return {
    food: 'ăn uống',
    drinks: 'đồ uống',
    transport: 'di chuyển',
    housing: 'nhà ở',
    accommodation: 'lưu trú',
    entertainment: 'giải trí',
    shopping: 'mua sắm',
    overall: 'tổng chi',
    other: 'khác',
  }[category] ?? category;
}
