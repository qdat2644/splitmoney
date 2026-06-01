import { describe, expect, it } from 'vitest';
import { buildUserForecastFromAnalytics } from '../services/forecastService.js';

const now = new Date('2026-06-15T12:00:00.000Z');

function expense(id, date, category = 'food', shareAmount = 100000) {
  return {
    id,
    title: `${category}-${id}`,
    category,
    date: new Date(date),
    participants: [{ userId: 'u-1', guestMemberId: null, shareAmount }],
  };
}

function makeAnalytics(overrides = {}) {
  return {
    monthlyTrend: [
      { month: '2026-04', amount: 1800000 },
      { month: '2026-05', amount: 2100000 },
      { month: '2026-06', amount: 1500000 },
    ],
    categoryTrend: [
      {
        category: 'food',
        points: [
          { month: '2026-04', amount: 900000 },
          { month: '2026-05', amount: 1000000 },
          { month: '2026-06', amount: 1200000 },
        ],
      },
      {
        category: 'transport',
        points: [
          { month: '2026-04', amount: 350000 },
          { month: '2026-05', amount: 400000 },
          { month: '2026-06', amount: 300000 },
        ],
      },
    ],
    spendingVelocity: {
      spentToDate: 1500000,
      dailyAverage: 100000,
      projectedMonthEnd: 3000000,
      daysElapsed: 15,
      daysInMonth: 30,
    },
    budgetHealth: {
      trackedBudgets: 2,
      budgets: [
        { category: 'food', budget: 1800000, actual: 1200000 },
        { category: 'transport', budget: 900000, actual: 300000 },
      ],
    },
    forecast: {
      forecastMonthTotal: 3000000,
      forecastByCategory: [
        { category: 'food', forecastAmount: 2400000 },
        { category: 'transport', forecastAmount: 600000 },
      ],
      riskCategories: [{ category: 'food', forecastAmount: 2400000, budget: 1800000 }],
      confidence: 0.78,
    },
    recurringCandidates: [
      { title: 'Internet', category: 'housing', estimatedAmount: 250000, frequency: 'monthly', confidence: 0.82 },
    ],
    anomalies: [
      { type: 'category_spike', title: 'Ăn uống tăng nhẹ', message: 'Danh mục ăn uống cao hơn tháng trước.', severity: 'warning', confidence: 0.7 },
    ],
    ...overrides,
  };
}

function makeSnapshot(count = 12) {
  const expenses = Array.from({ length: count }, (_, index) => {
    const day = String((index % 15) + 1).padStart(2, '0');
    const month = index < 6 ? '05' : '06';
    return expense(`e-${index}`, `2026-${month}-${day}T00:00:00.000Z`, index % 2 ? 'food' : 'transport');
  });

  return {
    claimedGuestIds: [],
    myExpenses: expenses,
    isMe: (userId) => userId === 'u-1',
  };
}

describe('forecast service', () => {
  it('returns a safe sparse forecast when data is thin', () => {
    const forecast = buildUserForecastFromAnalytics({
      userId: 'u-1',
      snapshot: makeSnapshot(3),
      analytics: makeAnalytics({
        monthlyTrend: [{ month: '2026-06', amount: 300000 }],
        budgetHealth: { trackedBudgets: 0, budgets: [] },
      }),
      now,
    });

    expect(forecast.meta.dataQuality).toBe('sparse');
    expect(forecast.summary.confidence.level).toBe('low');
    expect(forecast.summary.confidence.reason).toContain('Cần thêm dữ liệu');
  });

  it('builds a normal current-month projection from existing analytics data', () => {
    const forecast = buildUserForecastFromAnalytics({
      userId: 'u-1',
      snapshot: makeSnapshot(12),
      analytics: makeAnalytics(),
      now,
    });

    expect(forecast.summary.currentMonthSpend).toBe(1500000);
    expect(forecast.summary.projectedMonthlySpend).toBe(3000000);
    expect(forecast.summary.dailyAverage).toBe(100000);
    expect(forecast.meta.monthsAnalyzed).toBe(2);
  });

  it('projects categories and marks upward budget risk explainably', () => {
    const forecast = buildUserForecastFromAnalytics({
      userId: 'u-1',
      snapshot: makeSnapshot(12),
      analytics: makeAnalytics(),
      now,
    });

    const food = forecast.categoryForecasts.find((item) => item.category === 'food');
    expect(food).toMatchObject({
      currentSpend: 1200000,
      previousMonthSpend: 1000000,
      projectedSpend: 2400000,
      trend: 'up',
      riskLevel: 'high',
    });
    expect(food.reason).toContain('vượt ngân sách');
  });

  it('builds budget outlook risk states from projected spend', () => {
    const forecast = buildUserForecastFromAnalytics({
      userId: 'u-1',
      snapshot: makeSnapshot(12),
      analytics: makeAnalytics(),
      now,
    });

    expect(forecast.budgetOutlook.find((item) => item.category === 'food')).toMatchObject({
      budgetAmount: 1800000,
      currentSpend: 1200000,
      projectedSpend: 2400000,
      status: 'at_risk',
    });
    expect(forecast.summary.projectedBudgetRisk).toBe('high');
  });

  it('maps recurring candidates into recurring forecasts', () => {
    const forecast = buildUserForecastFromAnalytics({
      userId: 'u-1',
      snapshot: makeSnapshot(12),
      analytics: makeAnalytics(),
      now,
    });

    expect(forecast.recurringForecasts[0]).toMatchObject({
      title: 'Internet',
      cadence: 'monthly',
      estimatedAmount: 250000,
      confidence: 0.82,
    });
  });

  it('calculates confidence from data quality, prior month, and budgets', () => {
    const forecast = buildUserForecastFromAnalytics({
      userId: 'u-1',
      snapshot: makeSnapshot(30),
      analytics: makeAnalytics(),
      now,
    });

    expect(forecast.summary.confidence.level).toBe('high');
    expect(forecast.summary.confidence.score).toBeGreaterThanOrEqual(0.45);
    expect(forecast.summary.confidence.score).toBeLessThanOrEqual(1);
  });
});
