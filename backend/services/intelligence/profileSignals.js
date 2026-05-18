/**
 * Deterministic rules to compute financial signals from raw data.
 * All functions return an object with the inferred value and a confidence score [0, 1].
 */

function inferSpendingStyle(expenses, userId) {
  if (expenses.length === 0) return { type: 'unknown', confidence: 0 };
  
  // Calculate average expense amount
  const totalSpend = expenses.reduce((sum, exp) => sum + exp.amount, 0);
  const avg = totalSpend / expenses.length;
  
  // For context, we define arbitrary bounds for a Vietnamese currency (VND) context
  // e.g. < 100k: frugal, 100k-500k: balanced, > 500k: comfort
  let type = 'balanced';
  if (avg < 100000) type = 'frugal';
  else if (avg > 500000) type = 'comfort';

  // Confidence increases with more expenses (capped at 50 expenses -> 0.9 confidence)
  const confidence = Math.min(0.9, expenses.length / 50 + 0.1);

  return { type, confidence: Number(confidence.toFixed(2)), avgSpend: avg };
}

function inferCategoryPreferences(expenses) {
  if (expenses.length === 0) return { topCategories: [], confidence: 0 };

  const catCounts = {};
  expenses.forEach(e => {
    catCounts[e.category] = (catCounts[e.category] || 0) + 1;
  });

  const sortedCats = Object.entries(catCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([cat, count]) => ({ category: cat, frequency: count }));

  const confidence = Math.min(0.8, expenses.length / 30);
  
  return { 
    topCategories: sortedCats.slice(0, 3).map(c => c.category), 
    confidence: Number(confidence.toFixed(2)) 
  };
}

function inferBudgetDiscipline(budgets, expenses, userId) {
  if (budgets.length === 0) return { level: 'unknown', confidence: 0 };

  let overspendMonths = 0;
  let totalMonths = 0;

  // Simple check: compare month budget to month expense total
  budgets.forEach(budget => {
    totalMonths++;
    const monthExpenses = expenses.filter(e => {
      const d = new Date(e.date);
      return d.getMonth() + 1 === budget.month && d.getFullYear() === budget.year;
    });

    const monthSpend = monthExpenses.reduce((sum, e) => sum + e.amount, 0);
    if (monthSpend > budget.amount) {
      overspendMonths++;
    }
  });

  let level = 'medium';
  const overspendRatio = overspendMonths / totalMonths;
  if (overspendRatio > 0.6) level = 'low'; // low discipline
  else if (overspendRatio < 0.2) level = 'high';

  const confidence = Math.min(0.85, totalMonths / 6);
  return { level, confidence: Number(confidence.toFixed(2)) };
}

function inferPaymentReliability(paymentsFrom) {
  // If we had due dates vs paidAt we could measure reliability exactly.
  // With current data, we can just say frequent payments = good.
  if (paymentsFrom.length === 0) return { level: 'unknown', confidence: 0 };
  
  const confidence = Math.min(0.7, paymentsFrom.length / 20);
  return { level: 'reliable', confidence: Number(confidence.toFixed(2)) };
}

function inferPlanningAccuracy(plans) {
  if (plans.length === 0) return { level: 'unknown', confidence: 0 };

  // estimate vs actual logic could go here. For now we use the fact that they plan at all.
  let activePlans = plans.filter(p => p.status !== 'draft');
  if (activePlans.length === 0) return { level: 'unknown', confidence: 0.1 };

  return { level: 'high', confidence: Math.min(0.8, activePlans.length / 10) };
}

function inferVolatility(expenses) {
  if (expenses.length < 5) return { level: 'unknown', confidence: 0 };

  const amounts = expenses.map(e => e.amount);
  const avg = amounts.reduce((a,b)=>a+b, 0) / amounts.length;
  const variance = amounts.reduce((a,b) => a + Math.pow(b - avg, 2), 0) / amounts.length;
  const stdDev = Math.sqrt(variance);

  // CoV = stdDev / avg
  const cov = stdDev / (avg || 1);
  let level = 'moderate';
  if (cov > 1.5) level = 'high';
  else if (cov < 0.5) level = 'low';

  const confidence = Math.min(0.8, expenses.length / 40);
  return { level, confidence: Number(confidence.toFixed(2)), cov: Number(cov.toFixed(2)) };
}

export {
  inferSpendingStyle,
  inferCategoryPreferences,
  inferBudgetDiscipline,
  inferPaymentReliability,
  inferPlanningAccuracy,
  inferVolatility
};
