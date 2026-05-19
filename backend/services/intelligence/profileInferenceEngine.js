import * as signals from './profileSignals.js';
import { buildTemporalSignals } from './temporalSignals.js';

/**
 * Aggregates deterministic signals into a normalized JSON profile structure.
 */
function inferProfile(data) {
  const { userId, expenses = [], budgets = [], plans = [], payments = { from: [], to: [] } } = data;

  const profile = {
    userId,
    generatedAt: new Date().toISOString(),
    metrics: {
      totalExpensesCount: expenses.length,
      totalBudgetsCount: budgets.length,
      totalPlansCount: plans.length,
      totalPaymentsMade: payments.from.length
    },
    traits: {
      spendingStyle: signals.inferSpendingStyle(expenses, userId),
      volatility: signals.inferVolatility(expenses),
      categoryPreferences: signals.inferCategoryPreferences(expenses),
      budgetDiscipline: signals.inferBudgetDiscipline(budgets, expenses, userId),
      paymentReliability: signals.inferPaymentReliability(payments.from),
      planningAccuracy: signals.inferPlanningAccuracy(plans)
    },
    temporalMemory: buildTemporalSignals({ expenses, budgets, userId })
  };

  return profile;
}

export {
  inferProfile
};
