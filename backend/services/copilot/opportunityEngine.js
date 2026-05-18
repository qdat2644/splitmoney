import { serializeRecommendation } from './copilotSerializer.js';

export function buildOpportunityRecommendations({ analytics, createdAt }) {
  const recommendations = [];

  const topCategory = analytics.topCategories?.[0];
  const existingBudget = analytics.budgetHealth?.budgets?.find((budget) => budget.category === topCategory?.category);
  if (topCategory && !existingBudget) {
    const suggestedLimit = roundToNearest(topCategory.amount * 1.1, 100000);
    recommendations.push(serializeRecommendation({
      id: `budget-suggestion:${topCategory.category}`,
      type: 'budget_suggestion',
      title: `Tạo ngân sách cho ${formatCategoryLabel(topCategory.category)}`,
      description: `Gần đây bạn chi khoảng ${topCategory.amount} cho danh mục này. Hạn mức ${suggestedLimit} sẽ giúp theo dõi với một khoảng dự phòng vừa phải.`,
      severity: 'info',
      confidence: Math.min(0.9, 0.5 + Math.min((analytics.monthlyTrend?.length ?? 0) / 12, 0.4)),
      evidence: [
        `${analytics.monthlyTrend?.length ?? 0} tháng dữ liệu đã theo dõi`,
        `Danh mục cao nhất ${topCategory.amount}`,
      ],
      action: {
        type: 'create_budget',
        label: 'Tạo ngân sách',
        to: '/budget',
        prefill: { category: topCategory.category, amount: suggestedLimit },
      },
      createdAt,
    }));
  }

  for (const recurring of analytics.recurringCandidates ?? []) {
    recommendations.push(serializeRecommendation({
      id: `recurring:${normalize(recurring.title)}:${recurring.frequency}`,
      type: 'recurring_expense',
      title: `${recurring.title} có vẻ là khoản lặp lại`,
      description: `Phát hiện nhịp ${translateFrequency(recurring.frequency)} quanh mức ${recurring.estimatedAmount}.`,
      severity: 'info',
      confidence: recurring.confidence,
      evidence: [
        'Ít nhất 3 khoản chi tương đồng',
        `Chu kỳ ${translateFrequency(recurring.frequency)}`,
      ],
      action: {
        type: 'create_recurring_budget',
        label: 'Tạo ngân sách',
        to: '/budget',
        prefill: { category: recurring.category, amount: recurring.estimatedAmount },
      },
      createdAt,
    }));
  }

  return recommendations;
}

function normalize(value) {
  return String(value || '').trim().toLowerCase().replace(/\s+/g, '-');
}

function roundToNearest(value, unit) {
  return Math.max(unit, Math.round(value / unit) * unit);
}

function translateFrequency(value) {
  return {
    weekly: 'hàng tuần',
    monthly: 'hàng tháng',
    irregular: 'không đều',
  }[value] ?? value;
}

function formatCategoryLabel(category) {
  return {
    food: 'ăn uống',
    drinks: 'đồ uống',
    transport: 'di chuyển',
    housing: 'lưu trú',
    accommodation: 'lưu trú',
    entertainment: 'giải trí',
    shopping: 'mua sắm',
    other: 'khác',
  }[category] ?? category;
}
