const MIN_MONTHLY_EXPENSES = 6;
const MIN_WINDOW_EXPENSES = 3;
const MIN_WEEKEND_EXPENSES = 8;
const IMPORT_BACKDATE_DAYS = 14;

export function buildTemporalSignals({ expenses = [], budgets = [], userId = null, now = new Date() } = {}) {
  const entries = normalizeExpenses(expenses, userId)
    .filter((entry) => entry.amount > 0 && entry.date <= now)
    .sort((left, right) => left.date - right.date);

  const monthSeries = buildMonthSeries(entries);
  const importedHistory = detectImportedHistory(entries);
  const importBehaviorShift = detectImportBehaviorShift(entries, importedHistory);
  const monthOverMonth = detectMonthOverMonth(monthSeries, entries, importedHistory);
  const rolling7DayTrend = detectRollingTrend(entries, now, importedHistory);
  const weekendPattern = detectWeekendPattern(entries, importedHistory);
  const endOfMonthPattern = detectEndOfMonthPattern(entries, importedHistory);
  const recurringPatterns = detectRecurringPatterns(entries, importedHistory);
  const categoryMomentum = detectCategoryMomentum(entries, importedHistory);
  const volatilityTrend = detectVolatilityTrend(entries, now, importedHistory);
  const budgetAdherenceTrend = detectBudgetAdherenceTrend({ budgets, entries, importedHistory });

  const improvingAreas = [
    ...categoryMomentum.filter((item) => item.direction === 'down').map((item) => ({
      type: 'category_decline',
      category: item.category,
      label: `Chi tiêu ${formatCategoryLabel(item.category)} đang thấp hơn trước`,
      confidence: item.confidence,
    })),
    ...(volatilityTrend.direction === 'stabilizing' ? [{
      type: 'stabilization',
      label: 'Mức biến động gần đây ổn định hơn',
      confidence: volatilityTrend.confidence,
    }] : []),
    ...(monthOverMonth.direction === 'down' ? [{
      type: 'month_decline',
      label: 'Tổng chi tháng này thấp hơn tháng trước',
      confidence: monthOverMonth.confidence,
    }] : []),
  ].filter((item) => item.confidence >= 0.55).slice(0, 4);

  const worseningAreas = [
    ...categoryMomentum.filter((item) => item.direction === 'up').map((item) => ({
      type: 'category_growth',
      category: item.category,
      label: `Chi tiêu ${formatCategoryLabel(item.category)} đang tăng dần`,
      confidence: item.confidence,
    })),
    ...(rolling7DayTrend.direction === 'up' ? [{
      type: 'acceleration',
      label: '7 ngày gần đây đang chi nhanh hơn tuần trước',
      confidence: rolling7DayTrend.confidence,
    }] : []),
    ...(monthOverMonth.direction === 'up' ? [{
      type: 'month_growth',
      label: 'Tổng chi tháng này cao hơn tháng trước',
      confidence: monthOverMonth.confidence,
    }] : []),
  ].filter((item) => item.confidence >= 0.55).slice(0, 4);

  return {
    generatedAt: new Date(now).toISOString(),
    dataQuality: {
      expenseCount: entries.length,
      monthCount: monthSeries.length,
      isSparse: entries.length < MIN_MONTHLY_EXPENSES || monthSeries.length < 2,
      importedHistory,
    },
    recentTrendSummary: buildRecentTrendSummary({ monthOverMonth, rolling7DayTrend, volatilityTrend }),
    improvingAreas,
    worseningAreas,
    recurringPatterns,
    spendingRhythm: {
      weekdayWeekend: weekendPattern,
      endOfMonth: endOfMonthPattern,
    },
    historicalComparisons: {
      monthOverMonth,
      rolling7DayTrend,
      volatilityTrend,
      budgetAdherenceTrend,
      importBehaviorShift,
      categoryMomentum,
    },
    insightCandidates: buildInsightCandidates({
      monthOverMonth,
      rolling7DayTrend,
      weekendPattern,
      endOfMonthPattern,
      recurringPatterns,
      categoryMomentum,
      volatilityTrend,
      importBehaviorShift,
    }),
  };
}

function normalizeExpenses(expenses, userId) {
  return expenses.map((expense) => {
    const date = new Date(expense.date);
    const createdAt = expense.createdAt ? new Date(expense.createdAt) : date;
    return {
      id: expense.id,
      title: String(expense.title || '').trim() || 'Khoản chi',
      category: expense.category || 'other',
      amount: Math.round(resolveRelevantAmount(expense, userId)),
      date,
      createdAt,
    };
  }).filter((entry) => Number.isFinite(entry.date.getTime()) && Number.isFinite(entry.createdAt.getTime()));
}

function resolveRelevantAmount(expense, userId) {
  if (userId && Array.isArray(expense.participants)) {
    const participant = expense.participants.find((entry) => entry.userId === userId);
    if (participant && Number.isFinite(Number(participant.shareAmount))) return Number(participant.shareAmount);
  }
  if (Number.isFinite(Number(expense.myShareAmount))) return Number(expense.myShareAmount);
  if (Number.isFinite(Number(expense.shareAmount))) return Number(expense.shareAmount);
  return Number(expense.amount || 0);
}

function buildMonthSeries(entries) {
  const totals = new Map();
  const counts = new Map();
  for (const entry of entries) {
    const key = monthKey(entry.date);
    totals.set(key, (totals.get(key) || 0) + entry.amount);
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return [...totals.entries()]
    .map(([month, amount]) => ({ month, amount: Math.round(amount), count: counts.get(month) || 0 }))
    .sort((left, right) => left.month.localeCompare(right.month));
}

function detectImportedHistory(entries) {
  const importedCount = entries.filter((entry) => dayDiff(entry.date, entry.createdAt) >= IMPORT_BACKDATE_DAYS).length;
  const oldest = entries[0]?.date;
  const newest = entries.at(-1)?.date;
  const spanDays = oldest && newest ? Math.max(0, dayDiff(oldest, newest)) : 0;
  const hasImportedHistory = importedCount >= 3 || (importedCount > 0 && spanDays >= 45);
  return {
    hasImportedHistory,
    importedExpenseCount: importedCount,
    historySpanDays: spanDays,
    confidenceBoost: hasImportedHistory ? Math.min(0.18, importedCount / 100) : 0,
  };
}

function detectMonthOverMonth(monthSeries, entries, importedHistory) {
  if (monthSeries.length < 2 || entries.length < MIN_MONTHLY_EXPENSES) return sparseSignal('month_over_month');
  const current = monthSeries.at(-1);
  const previous = monthSeries.at(-2);
  if (!previous.amount || previous.count < 2 || current.count < 2) return sparseSignal('month_over_month');

  const delta = current.amount - previous.amount;
  const deltaPct = delta / previous.amount;
  const absDeltaPct = Math.abs(deltaPct);
  const direction = absDeltaPct < 0.12 ? 'stable' : deltaPct > 0 ? 'up' : 'down';
  const confidence = confidenceFrom({ base: 0.38, count: previous.count + current.count, divisor: 24, importedHistory });
  return {
    type: 'month_over_month',
    period: `${previous.month}→${current.month}`,
    direction,
    currentAmount: current.amount,
    previousAmount: previous.amount,
    deltaAmount: Math.round(delta),
    deltaPct: Number((deltaPct * 100).toFixed(1)),
    confidence: direction === 'stable' ? Math.min(confidence, 0.75) : confidence,
  };
}

function detectRollingTrend(entries, now, importedHistory) {
  const recent = entries.filter((entry) => daysAgo(entry.date, now) >= 0 && daysAgo(entry.date, now) < 7);
  const prior = entries.filter((entry) => daysAgo(entry.date, now) >= 7 && daysAgo(entry.date, now) < 14);
  if (recent.length < MIN_WINDOW_EXPENSES || prior.length < MIN_WINDOW_EXPENSES) return sparseSignal('rolling_7_day');

  const recentTotal = sum(recent.map((entry) => entry.amount));
  const priorTotal = sum(prior.map((entry) => entry.amount));
  if (!priorTotal) return sparseSignal('rolling_7_day');

  const deltaPct = (recentTotal - priorTotal) / priorTotal;
  const direction = Math.abs(deltaPct) < 0.15 ? 'stable' : deltaPct > 0 ? 'up' : 'down';
  return {
    type: 'rolling_7_day',
    label: '7 ngày gần đây',
    direction,
    recentTotal: Math.round(recentTotal),
    priorTotal: Math.round(priorTotal),
    deltaPct: Number((deltaPct * 100).toFixed(1)),
    confidence: confidenceFrom({ base: 0.35, count: recent.length + prior.length, divisor: 18, importedHistory }),
  };
}

function detectWeekendPattern(entries, importedHistory) {
  if (entries.length < MIN_WEEKEND_EXPENSES) return sparseSignal('weekday_weekend');
  const weekend = entries.filter((entry) => isWeekend(entry.date));
  const weekday = entries.filter((entry) => !isWeekend(entry.date));
  if (weekend.length < 3 || weekday.length < 3) return sparseSignal('weekday_weekend');

  const weekendAverage = average(weekend.map((entry) => entry.amount));
  const weekdayAverage = average(weekday.map((entry) => entry.amount));
  const ratio = weekdayAverage > 0 ? weekendAverage / weekdayAverage : 0;
  const direction = ratio >= 1.25 ? 'weekend_higher' : ratio <= 0.8 ? 'weekday_higher' : 'balanced';
  return {
    type: 'weekday_weekend',
    direction,
    weekendAverage: Math.round(weekendAverage),
    weekdayAverage: Math.round(weekdayAverage),
    ratio: Number(ratio.toFixed(2)),
    confidence: confidenceFrom({ base: 0.32, count: entries.length, divisor: 36, importedHistory }),
  };
}

function detectEndOfMonthPattern(entries, importedHistory) {
  const byMonth = groupBy(entries, (entry) => monthKey(entry.date));
  const eligibleMonths = [...byMonth.values()].filter((items) => items.length >= 4);
  if (eligibleMonths.length < 2) return sparseSignal('end_of_month');

  const monthRatios = eligibleMonths.map((items) => {
    const endItems = items.filter((entry) => entry.date.getDate() >= 24);
    const otherItems = items.filter((entry) => entry.date.getDate() < 24);
    if (endItems.length === 0 || otherItems.length === 0) return null;
    return average(endItems.map((entry) => entry.amount)) / average(otherItems.map((entry) => entry.amount));
  }).filter(Boolean);
  if (monthRatios.length < 2) return sparseSignal('end_of_month');

  const ratio = average(monthRatios);
  return {
    type: 'end_of_month',
    direction: ratio >= 1.25 ? 'end_higher' : ratio <= 0.8 ? 'end_lower' : 'balanced',
    ratio: Number(ratio.toFixed(2)),
    confidence: confidenceFrom({ base: 0.3, count: eligibleMonths.length * 4, divisor: 24, importedHistory }),
  };
}

function detectRecurringPatterns(entries, importedHistory) {
  const groups = groupBy(entries, (entry) => `${normalizeTitle(entry.title)}::${entry.category}`);
  return [...groups.values()]
    .filter((items) => items.length >= 3)
    .map((items) => {
      const sorted = [...items].sort((left, right) => left.date - right.date);
      const gaps = sorted.slice(1).map((item, index) => dayDiff(sorted[index].date, item.date));
      const avgGap = average(gaps);
      const variance = coefficientOfVariation(sorted.map((item) => item.amount));
      const cadence = avgGap >= 24 && avgGap <= 36 ? 'monthly' : avgGap >= 5 && avgGap <= 10 ? 'weekly' : 'irregular';
      const confidence = Math.min(0.95, (cadence === 'irregular' ? 0.42 : 0.66) + Math.max(0, 0.18 - variance) + importedHistory.confidenceBoost);
      return {
        type: 'recurring_rhythm',
        title: sorted.at(-1).title,
        category: sorted.at(-1).category,
        cadence,
        averageAmount: Math.round(average(sorted.map((item) => item.amount))),
        occurrences: sorted.length,
        confidence: Number(confidence.toFixed(2)),
      };
    })
    .filter((item) => item.confidence >= 0.55)
    .sort((left, right) => right.confidence - left.confidence)
    .slice(0, 5);
}

function detectCategoryMomentum(entries, importedHistory) {
  const monthSeries = buildMonthSeries(entries);
  if (monthSeries.length < 2) return [];
  const currentMonth = monthSeries.at(-1).month;
  const previousMonth = monthSeries.at(-2).month;
  const current = categoryTotalsForMonth(entries, currentMonth);
  const previous = categoryTotalsForMonth(entries, previousMonth);

  return [...current.entries()]
    .map(([category, amount]) => {
      const previousAmount = previous.get(category) || 0;
      if (previousAmount <= 0 || amount < 50000) return null;
      const deltaPct = (amount - previousAmount) / previousAmount;
      if (Math.abs(deltaPct) < 0.2) return null;
      return {
        type: 'category_momentum',
        category,
        direction: deltaPct > 0 ? 'up' : 'down',
        currentAmount: Math.round(amount),
        previousAmount: Math.round(previousAmount),
        deltaPct: Number((deltaPct * 100).toFixed(1)),
        confidence: confidenceFrom({ base: 0.34, count: countCategory(entries, category, currentMonth, previousMonth), divisor: 16, importedHistory }),
      };
    })
    .filter((item) => item && item.confidence >= 0.5)
    .sort((left, right) => right.confidence - left.confidence)
    .slice(0, 6);
}

function detectVolatilityTrend(entries, now, importedHistory) {
  const recent = entries.filter((entry) => daysAgo(entry.date, now) >= 0 && daysAgo(entry.date, now) < 30);
  const prior = entries.filter((entry) => daysAgo(entry.date, now) >= 30 && daysAgo(entry.date, now) < 60);
  if (recent.length < 5 || prior.length < 5) return sparseSignal('volatility_trend');
  const recentCov = coefficientOfVariation(recent.map((entry) => entry.amount));
  const priorCov = coefficientOfVariation(prior.map((entry) => entry.amount));
  const ratio = priorCov > 0 ? recentCov / priorCov : 1;
  const direction = ratio <= 0.75 ? 'stabilizing' : ratio >= 1.25 ? 'more_variable' : 'stable';
  return {
    type: 'volatility_trend',
    direction,
    recentCov: Number(recentCov.toFixed(2)),
    priorCov: Number(priorCov.toFixed(2)),
    confidence: confidenceFrom({ base: 0.36, count: recent.length + prior.length, divisor: 32, importedHistory }),
  };
}

function detectBudgetAdherenceTrend({ budgets, entries, importedHistory }) {
  if (!budgets?.length || entries.length < MIN_MONTHLY_EXPENSES) return sparseSignal('budget_adherence');
  const comparisons = budgets.map((budget) => {
    const month = `${budget.year}-${String(budget.month).padStart(2, '0')}`;
    const spent = sum(entries
      .filter((entry) => monthKey(entry.date) === month && (!budget.category || budget.category === 'overall' || budget.category === entry.category))
      .map((entry) => entry.amount));
    return { month, spent, budget: Number(budget.amount || budget.budget || 0) };
  }).filter((item) => item.budget > 0);

  if (comparisons.length < 2) return sparseSignal('budget_adherence');
  const recent = comparisons.at(-1);
  const prior = comparisons.at(-2);
  const recentRatio = recent.spent / recent.budget;
  const priorRatio = prior.spent / prior.budget;
  const delta = recentRatio - priorRatio;
  return {
    type: 'budget_adherence',
    direction: Math.abs(delta) < 0.08 ? 'stable' : delta < 0 ? 'improving' : 'worsening',
    recentRatio: Number(recentRatio.toFixed(2)),
    priorRatio: Number(priorRatio.toFixed(2)),
    confidence: confidenceFrom({ base: 0.35, count: comparisons.length * 4, divisor: 24, importedHistory }),
  };
}

function buildRecentTrendSummary({ monthOverMonth, rolling7DayTrend, volatilityTrend }) {
  if (volatilityTrend.direction === 'stabilizing' && volatilityTrend.confidence >= 0.55) {
    return { type: 'stabilization', label: 'Gần đây ổn định hơn', confidence: volatilityTrend.confidence };
  }
  if (rolling7DayTrend.direction === 'up' && rolling7DayTrend.confidence >= 0.55) {
    return { type: 'acceleration', label: '7 ngày gần đây tăng dần', confidence: rolling7DayTrend.confidence };
  }
  if (monthOverMonth.direction === 'down' && monthOverMonth.confidence >= 0.55) {
    return { type: 'improvement', label: 'Thấp hơn tháng trước', confidence: monthOverMonth.confidence };
  }
  if (monthOverMonth.direction === 'up' && monthOverMonth.confidence >= 0.55) {
    return { type: 'worsening', label: 'Cao hơn tháng trước', confidence: monthOverMonth.confidence };
  }
  return { type: 'unknown', label: 'Cần thêm dữ liệu theo thời gian', confidence: 0 };
}

function detectImportBehaviorShift(entries, importedHistory) {
  if (!importedHistory.hasImportedHistory) return sparseSignal('import_behavior_shift');
  const importedEntries = entries.filter((entry) => dayDiff(entry.date, entry.createdAt) >= IMPORT_BACKDATE_DAYS);
  const nativeEntries = entries.filter((entry) => dayDiff(entry.date, entry.createdAt) < IMPORT_BACKDATE_DAYS);
  if (importedEntries.length < 3 || nativeEntries.length < 3) return sparseSignal('import_behavior_shift');

  const historicalAverage = average(importedEntries.map((entry) => entry.amount));
  const recentAverage = average(nativeEntries.slice(-Math.min(nativeEntries.length, 12)).map((entry) => entry.amount));
  if (!historicalAverage) return sparseSignal('import_behavior_shift');
  const deltaPct = (recentAverage - historicalAverage) / historicalAverage;
  return {
    type: 'import_behavior_shift',
    direction: Math.abs(deltaPct) < 0.15 ? 'stable' : deltaPct > 0 ? 'higher_after_import' : 'lower_after_import',
    historicalAverage: Math.round(historicalAverage),
    recentAverage: Math.round(recentAverage),
    deltaPct: Number((deltaPct * 100).toFixed(1)),
    confidence: confidenceFrom({ base: 0.36, count: importedEntries.length + nativeEntries.length, divisor: 28, importedHistory }),
  };
}

function buildInsightCandidates({ monthOverMonth, rolling7DayTrend, weekendPattern, endOfMonthPattern, recurringPatterns, categoryMomentum, volatilityTrend, importBehaviorShift }) {
  const candidates = [];

  if (monthOverMonth.confidence >= 0.55 && monthOverMonth.direction !== 'stable') {
    candidates.push({
      type: monthOverMonth.direction === 'down' ? 'improvement' : 'worsening',
      title: monthOverMonth.direction === 'down' ? 'Chi tiêu tháng này thấp hơn tháng trước' : 'Chi tiêu tháng này đang cao hơn tháng trước',
      message: monthOverMonth.direction === 'down'
        ? `Tổng chi thấp hơn khoảng ${Math.abs(Math.round(monthOverMonth.deltaPct))}% so với tháng trước.`
        : `Tổng chi cao hơn khoảng ${Math.abs(Math.round(monthOverMonth.deltaPct))}% so với tháng trước.`,
      confidence: monthOverMonth.confidence,
    });
  }

  if (rolling7DayTrend.confidence >= 0.55 && rolling7DayTrend.direction !== 'stable') {
    candidates.push({
      type: rolling7DayTrend.direction === 'down' ? 'improvement' : 'worsening',
      title: rolling7DayTrend.direction === 'down' ? '7 ngày gần đây nhẹ hơn tuần trước' : '7 ngày gần đây đang tăng tốc',
      message: rolling7DayTrend.direction === 'down'
        ? 'Nhịp chi tuần này thấp hơn tuần trước.'
        : 'Nhịp chi tuần này cao hơn tuần trước.',
      confidence: rolling7DayTrend.confidence,
    });
  }

  if (weekendPattern.confidence >= 0.55 && weekendPattern.direction === 'weekend_higher') {
    candidates.push({
      type: 'recurring_rhythm',
      title: 'Cuối tuần thường chi nhiều hơn',
      message: 'Có dấu hiệu chi tiêu tăng vào cuối tuần.',
      confidence: weekendPattern.confidence,
    });
  }

  if (endOfMonthPattern.confidence >= 0.55 && endOfMonthPattern.direction === 'end_higher') {
    candidates.push({
      type: 'recurring_rhythm',
      title: 'Cuối tháng thường chi mạnh hơn',
      message: 'Một số tháng cho thấy chi tiêu tăng vào giai đoạn cuối tháng.',
      confidence: endOfMonthPattern.confidence,
    });
  }

  if (volatilityTrend.confidence >= 0.55 && volatilityTrend.direction === 'stabilizing') {
    candidates.push({
      type: 'stabilization',
      title: 'Nhịp chi đang ổn định hơn',
      message: 'Mức biến động gần đây thấp hơn giai đoạn trước.',
      confidence: volatilityTrend.confidence,
    });
  }

  if (importBehaviorShift?.confidence >= 0.55 && importBehaviorShift.direction !== 'stable') {
    candidates.push({
      type: importBehaviorShift.direction === 'lower_after_import' ? 'improvement' : 'anomaly_shift',
      title: importBehaviorShift.direction === 'lower_after_import'
        ? 'Chi tiêu gần đây thấp hơn lịch sử đã nhập'
        : 'Chi tiêu gần đây cao hơn lịch sử đã nhập',
      message: importBehaviorShift.direction === 'lower_after_import'
        ? 'Dữ liệu sau khi nhập cho thấy mức chi gần đây đang nhẹ hơn trước.'
        : 'Dữ liệu sau khi nhập cho thấy mức chi gần đây cao hơn trước.',
      confidence: importBehaviorShift.confidence,
    });
  }

  for (const pattern of recurringPatterns.slice(0, 2)) {
    candidates.push({
      type: 'recurring_rhythm',
      title: `${pattern.title} gần như theo chu kỳ`,
      message: pattern.cadence === 'weekly'
        ? 'Khoản này xuất hiện khá đều mỗi tuần.'
        : pattern.cadence === 'monthly'
          ? 'Khoản này xuất hiện khá đều mỗi tháng.'
          : 'Khoản này lặp lại nhưng nhịp chưa thật đều.',
      confidence: pattern.confidence,
    });
  }

  for (const item of categoryMomentum.slice(0, 2)) {
    candidates.push({
      type: item.direction === 'down' ? 'improvement' : 'worsening',
      title: item.direction === 'down'
        ? `Chi tiêu ${formatCategoryLabel(item.category)} đang giảm`
        : `Chi tiêu ${formatCategoryLabel(item.category)} đang tăng dần`,
      message: item.direction === 'down'
        ? `Danh mục này thấp hơn tháng trước khoảng ${Math.abs(Math.round(item.deltaPct))}%.`
        : `Danh mục này cao hơn tháng trước khoảng ${Math.abs(Math.round(item.deltaPct))}%.`,
      confidence: item.confidence,
    });
  }

  return candidates
    .filter((item) => item.confidence >= 0.55)
    .sort((left, right) => right.confidence - left.confidence)
    .slice(0, 6);
}

function sparseSignal(type) {
  return { type, direction: 'unknown', confidence: 0, sparse: true };
}

function confidenceFrom({ base, count, divisor, importedHistory }) {
  return Number(Math.min(0.92, base + Math.min(0.36, count / divisor) + (importedHistory?.confidenceBoost || 0)).toFixed(2));
}

function categoryTotalsForMonth(entries, month) {
  const totals = new Map();
  for (const entry of entries.filter((item) => monthKey(item.date) === month)) {
    totals.set(entry.category, (totals.get(entry.category) || 0) + entry.amount);
  }
  return totals;
}

function countCategory(entries, category, ...months) {
  const monthSet = new Set(months);
  return entries.filter((entry) => entry.category === category && monthSet.has(monthKey(entry.date))).length;
}

function monthKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function dayDiff(left, right) {
  return Math.round((right - left) / (1000 * 60 * 60 * 24));
}

function daysAgo(date, now) {
  return Math.floor((startOfDay(now) - startOfDay(date)) / (1000 * 60 * 60 * 24));
}

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function isWeekend(date) {
  const day = date.getDay();
  return day === 0 || day === 6;
}

function sum(values) {
  return values.reduce((total, value) => total + value, 0);
}

function average(values) {
  if (!values.length) return 0;
  return sum(values) / values.length;
}

function coefficientOfVariation(values) {
  const avg = average(values);
  if (!avg) return 0;
  const variance = average(values.map((value) => (value - avg) ** 2));
  return Math.sqrt(variance) / avg;
}

function groupBy(items, getKey) {
  const groups = new Map();
  for (const item of items) {
    const key = getKey(item);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(item);
  }
  return groups;
}

function normalizeTitle(title) {
  return String(title || '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ');
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
    other: 'khác',
  }[category] ?? category;
}
