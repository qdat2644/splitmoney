import { formatCurrency } from '../../utils/currencyFormatter.js';
import { serializeRecommendation } from './copilotSerializer.js';

export function buildOpportunityRecommendations({ analytics, createdAt }) {
  const recommendations = [];

  const topCategory = analytics.topCategories?.[0];
  const existingBudget = analytics.budgetHealth?.budgets?.find((budget) => budget.category === topCategory?.category);
  if (topCategory && !existingBudget) {
    const suggestedLimit = roundToNearest(topCategory.amount * 1.1, 100000);
    const categoryLabel = formatCategoryLabel(topCategory.category);

    recommendations.push(serializeRecommendation({
      id: `budget-suggestion:${topCategory.category}`,
      type: 'budget_suggestion',
      category: topCategory.category,
      personality: 'opportunity_suggestion',
      title: `Danh mục “${categoryLabel}” đang chi tiêu khá cao`,
      description: `Bạn đang chi khoảng ${formatCurrency(topCategory.amount)} cho danh mục này. Một hạn mức riêng quanh ${formatCurrency(suggestedLimit)} sẽ giúp theo dõi dễ hơn mà vẫn có khoảng đệm.`,
      severity: 'info',
      confidence: Math.min(0.9, 0.5 + Math.min((analytics.monthlyTrend?.length ?? 0) / 12, 0.4)),
      evidence: [
        `${analytics.monthlyTrend?.length ?? 0} tháng dữ liệu đã theo dõi`,
        `Chi khoảng ${formatCurrency(topCategory.amount)} gần đây`,
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
    const frequencyLabel = translateFrequency(recurring.frequency);
    recommendations.push(serializeRecommendation({
      id: `recurring:${normalize(recurring.title)}:${recurring.frequency}`,
      type: 'recurring_expense',
      category: recurring.category,
      personality: 'supportive_guidance',
      title: `${recurring.title} đang xuất hiện khá đều`,
      description: `Bạn đang chi cho mục này ${frequencyLabel}, khoảng ${formatCurrency(recurring.estimatedAmount)} mỗi lần. Đặt hạn mức riêng có thể giúp theo dõi nhẹ nhàng hơn.`,
      severity: 'info',
      confidence: recurring.confidence,
      evidence: [
        'Ít nhất 3 khoản chi tương đồng',
        recurring.frequency === 'weekly' ? 'Xuất hiện đều mỗi tuần' : `Chu kỳ ${frequencyLabel}`,
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
    weekly: 'mỗi tuần',
    monthly: 'mỗi tháng',
    irregular: 'chưa thật đều',
  }[value] ?? value;
}

function formatCategoryLabel(category) {
  return {
    food: 'Ăn uống',
    drinks: 'Đồ uống',
    transport: 'Di chuyển',
    housing: 'Lưu trú',
    accommodation: 'Lưu trú',
    entertainment: 'Giải trí',
    shopping: 'Mua sắm',
    other: 'Khác',
  }[category] ?? category;
}
