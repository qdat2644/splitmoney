import { describe, expect, it } from 'vitest';
import { buildRecommendations, compareRecommendationPriority, dedupeRecommendations } from '../services/copilot/recommendationEngine.js';
import { serializeRecommendation } from '../services/copilot/copilotSerializer.js';

const createdAt = '2026-05-18T00:00:00.000Z';

function makeContext() {
  return {
    createdAt,
    summary: {
      totalIOwe: 800000,
      totalOwedToMe: 100000,
    },
    analytics: {
      monthlyTrend: [
        { month: '2026-02', amount: 1000000 },
        { month: '2026-03', amount: 1100000 },
        { month: '2026-04', amount: 1200000 },
        { month: '2026-05', amount: 1800000 },
      ],
      topCategories: [{ category: 'food', amount: 2800000 }],
      spendingVelocity: { daysElapsed: 12, daysInMonth: 31 },
      budgetHealth: { budgets: [] },
      debtHealth: { direction: 'worsening', currentNetBalance: -700000 },
      forecast: {
        confidence: 0.82,
        riskCategories: [{ category: 'transport', forecastAmount: 1400000, budget: 1000000 }],
      },
      anomalies: [{
        type: 'category_spike',
        title: 'food spending is up',
        message: 'Food spending is 42% above recent average.',
        severity: 'warning',
        confidence: 0.84,
      }],
      recurringCandidates: [{
        title: 'Netflix',
        category: 'entertainment',
        estimatedAmount: 260000,
        frequency: 'monthly',
        confidence: 0.91,
      }],
    },
    profile: {},
    plans: [],
  };
}

describe('copilot recommendation engine', () => {
  it('generates deterministic forecast, debt, budget, and recurring recommendations', () => {
    const recommendations = buildRecommendations(makeContext());
    expect(recommendations.map((item) => item.type)).toEqual(expect.arrayContaining([
      'budget_risk',
      'overspending_warning',
      'debt_attention',
      'spending_velocity',
      'budget_suggestion',
      'recurring_expense',
    ]));
    expect(recommendations.find((item) => item.type === 'budget_risk')).toMatchObject({
      severity: 'critical',
      confidence: 0.82,
    });
  });

  it('sorts higher severity before lower severity, then by confidence', () => {
    const critical = serializeRecommendation({ id: 'c', type: 'x', title: 'c', description: '', severity: 'critical', confidence: 0.2, createdAt });
    const warning = serializeRecommendation({ id: 'w', type: 'x', title: 'w', description: '', severity: 'warning', confidence: 0.99, createdAt });
    const info = serializeRecommendation({ id: 'i', type: 'x', title: 'i', description: '', severity: 'info', confidence: 1, createdAt });
    expect([info, warning, critical].sort(compareRecommendationPriority).map((item) => item.id)).toEqual(['c', 'w', 'i']);
  });

  it('clamps confidence into the deterministic 0 to 1 range', () => {
    expect(serializeRecommendation({ id: 'hi', type: 'x', title: 'x', description: '', confidence: 5 }).confidence).toBe(1);
    expect(serializeRecommendation({ id: 'lo', type: 'x', title: 'x', description: '', confidence: -1 }).confidence).toBe(0);
  });

  it('suppresses duplicate recommendations by stable id', () => {
    const duplicateLow = serializeRecommendation({ id: 'same', type: 'x', title: 'a', description: '', severity: 'info', confidence: 0.5, createdAt });
    const duplicateHigh = serializeRecommendation({ id: 'same', type: 'x', title: 'b', description: '', severity: 'warning', confidence: 0.8, createdAt });
    expect(dedupeRecommendations([duplicateLow, duplicateHigh])).toEqual([duplicateHigh]);
  });

  it('keeps recurring suggestions explainable', () => {
    const recurring = buildRecommendations(makeContext()).find((item) => item.type === 'recurring_expense');
    expect(recurring.evidence).toEqual(expect.arrayContaining([
      'Ít nhất 3 khoản chi tương đồng',
      'Chu kỳ mỗi tháng',
    ]));
    expect(recurring.action.type).toBe('create_recurring_budget');
  });

  it('suppresses semantically similar recommendations by category and action', () => {
    const lowPriority = serializeRecommendation({
      id: 'budget-suggestion:food',
      type: 'budget_suggestion',
      category: 'food',
      title: 'Danh mục “Ăn uống” đang chi tiêu khá cao',
      description: '',
      severity: 'info',
      confidence: 0.7,
      action: { type: 'create_budget', to: '/budget' },
      createdAt,
    });
    const highPriority = serializeRecommendation({
      id: 'budget-risk:food',
      type: 'budget_risk',
      category: 'food',
      title: 'Danh mục “Ăn uống” có thể vượt hạn mức',
      description: '',
      severity: 'warning',
      confidence: 0.8,
      action: { type: 'open_budget', to: '/budget' },
      createdAt,
    });

    expect(dedupeRecommendations([lowPriority, highPriority])).toEqual([highPriority]);
  });

  it('turns temporal memory into explainable continuity recommendations', () => {
    const context = makeContext();
    context.profile = {
      temporalMemory: {
        dataQuality: { isSparse: false },
        improvingAreas: [],
        recurringPatterns: [],
        historicalComparisons: {
          rolling7DayTrend: { direction: 'up', confidence: 0.76 },
          categoryMomentum: [],
        },
      },
    };

    const temporal = buildRecommendations(context).find((item) => item.type === 'temporal_worsening');
    expect(temporal).toMatchObject({
      title: '7 ngày gần đây đang chi nhanh hơn',
      personality: 'gentle_warning',
      priorityBoost: 0.18,
    });
    expect(temporal.evidence).toEqual(expect.arrayContaining(['7 ngày gần đây', 'So với 7 ngày trước']));
  });
});
