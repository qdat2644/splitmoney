const ALLOWED_SEVERITY = new Set(['info', 'warning', 'critical']);

export function serializeRecommendation(input) {
  return {
    id: input.id,
    type: input.type,
    title: input.title,
    description: input.description,
    severity: ALLOWED_SEVERITY.has(input.severity) ? input.severity : 'info',
    confidence: clampConfidence(input.confidence),
    evidence: Array.isArray(input.evidence) ? input.evidence.filter(Boolean) : [],
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
    opportunities: recommendations.filter((item) => ['budget_suggestion', 'recurring_expense'].includes(item.type)),
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
    },
    generatedAt: new Date().toISOString(),
  };
}

function clampConfidence(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return Number(Math.min(1, Math.max(0, numeric)).toFixed(2));
}
