export function getSpendingPredictions(expenses) {
  // Simple statistical prediction: average spending per day over the last 30 days
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  
  const recentExpenses = expenses.filter(e => new Date(e.date) >= thirtyDaysAgo);
  const totalRecent = recentExpenses.reduce((sum, e) => sum + e.amount, 0);
  
  // Calculate average daily spending
  const dailyAverage = totalRecent / 30;
  
  // Predict for the rest of the current month
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const daysLeft = daysInMonth - now.getDate();
  
  const predictedRemaining = dailyAverage * daysLeft;
  
  // Predict per category
  const categoryStats = {};
  recentExpenses.forEach(e => {
    categoryStats[e.category] = (categoryStats[e.category] || 0) + e.amount;
  });
  
  const predictedCategories = Object.entries(categoryStats).map(([cat, amount]) => ({
    category: cat,
    predictedMonthTotal: (amount / 30) * daysInMonth
  }));

  return {
    dailyAverage,
    predictedRemaining,
    predictedTotal: totalRecent + predictedRemaining,
    predictedCategories
  };
}
