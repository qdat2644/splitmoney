import { formatCurrencyText } from '../../utils/currencyFormatter.js';

const ALLOWED_SEVERITY = new Set(['info', 'warning', 'critical']);
const ALLOWED_PERSONALITY = new Set([
  'gentle_warning',
  'supportive_guidance',
  'positive_reinforcement',
  'opportunity_suggestion',
]);

export function serializeRecommendation(input) {
  return {
    id: input.id,
    type: input.type,
    category: input.category ?? null,
    title: formatCurrencyText(input.title),
    description: formatCurrencyText(input.description),
    severity: ALLOWED_SEVERITY.has(input.severity) ? input.severity : 'info',
    personality: ALLOWED_PERSONALITY.has(input.personality) ? input.personality : null,
    confidence: clampConfidence(input.confidence),
    priorityBoost: clampPriorityBoost(input.priorityBoost),
    evidence: Array.isArray(input.evidence) ? input.evidence.filter(Boolean).map((item) => formatCurrencyText(item)) : [],
    action: input.action ?? null,
    dismissible: input.dismissible !== false,
    createdAt: input.createdAt ?? new Date().toISOString(),
  };
}

export function serializeCopilotPayload({ recommendations, analytics, profile, plans }) {
  return {
    recommendations,
    forecastSnapshot: {
      forecastMonthTotal: analytics.forecast.forecastMonthTotal,
      confidence: analytics.forecast.confidence,
      spendingVelocity: analytics.spendingVelocity,
      budgetHealth: analytics.budgetHealth,
      debtHealth: analytics.debtHealth,
    },
    opportunities: recommendations.filter((item) => [
      'budget_suggestion',
      'recurring_expense',
      'temporal_improvement',
      'temporal_recurring_rhythm',
      'temporal_category_growth',
    ].includes(item.type)),
    planningIntelligence: {
      activePlans: plans
        .filter((plan) => plan.status === 'active')
        .map((plan) => ({
          id: plan.id,
          name: plan.name,
          estimatedTotal: plan.estimatedTotal,
          convertedItems: (plan.expenses ?? []).filter((expense) => expense.convertedToExpenseId).length,
          itemCount: plan.expenses?.length ?? 0,
        })),
    },
    financialMemory: {
      spendingStyle: profile?.traits?.spendingStyle ?? null,
      volatility: profile?.traits?.volatility ?? null,
      budgetDiscipline: profile?.traits?.budgetDiscipline ?? null,
      topCategories: profile?.traits?.categoryPreferences?.topCategories ?? [],
      recentTrendSummary: profile?.temporalMemory?.recentTrendSummary ?? null,
      improvingAreas: profile?.temporalMemory?.improvingAreas ?? [],
      worseningAreas: profile?.temporalMemory?.worseningAreas ?? [],
      recurringPatterns: profile?.temporalMemory?.recurringPatterns ?? [],
      spendingRhythm: profile?.temporalMemory?.spendingRhythm ?? null,
      historicalComparisons: profile?.temporalMemory?.historicalComparisons ?? null,
      dataQuality: profile?.temporalMemory?.dataQuality ?? null,
    },
    generatedAt: new Date().toISOString(),
  };
}

function clampConfidence(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return Number(Math.min(1, Math.max(0, numeric)).toFixed(2));
}

function clampPriorityBoost(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return Number(Math.min(0.5, Math.max(-0.3, numeric)).toFixed(2));
}
