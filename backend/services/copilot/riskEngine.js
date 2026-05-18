import { serializeRecommendation } from './copilotSerializer.js';

export function buildRiskRecommendations({ analytics, summary, createdAt }) {
  const recommendations = [];
  const { forecast, anomalies, spendingVelocity, debtHealth } = analytics;

  for (const risk of forecast.riskCategories ?? []) {
    const overshootPct = risk.budget > 0 ? Math.round(((risk.forecastAmount - risk.budget) / risk.budget) * 100) : 0;
    recommendations.push(serializeRecommendation({
      id: `budget-risk:${risk.category}`,
      type: 'budget_risk',
      title: `Ngân sách ${formatCategoryLabel(risk.category)} có thể bị vượt`,
      description: `Dự báo chi tiêu cao hơn hạn mức hiện tại ${overshootPct}%.`,
      severity: overshootPct >= 25 ? 'critical' : 'warning',
      confidence: forecast.confidence,
      evidence: [
        `Dự báo ${risk.forecastAmount}`,
        `Ngân sách ${risk.budget}`,
        `Đã qua ${spendingVelocity.daysElapsed}/${spendingVelocity.daysInMonth} ngày`,
      ],
      action: { type: 'open_budget', label: 'Xem ngân sách', to: '/budget' },
      createdAt,
    }));
  }

  const categorySpike = anomalies.find((item) => item.type === 'category_spike');
  if (categorySpike) {
    recommendations.push(serializeRecommendation({
      id: `overspending:${categorySpike.title}`,
      type: 'overspending_warning',
      title: categorySpike.title,
      description: categorySpike.message,
      severity: categorySpike.severity,
      confidence: categorySpike.confidence,
      evidence: ['Chi tiêu danh mục tháng này so với trung bình gần đây'],
      action: { type: 'open_analytics', label: 'Xem phân tích', to: '/forecasts' },
      createdAt,
    }));
  }

  if (debtHealth.direction === 'worsening' && summary.totalIOwe > 0) {
    recommendations.push(serializeRecommendation({
      id: 'debt-attention',
      type: 'debt_attention',
      title: 'Xu hướng công nợ cần chú ý',
      description: 'Vị thế công nợ ròng đang xấu hơn so với tháng trước.',
      severity: summary.totalIOwe > summary.totalOwedToMe ? 'warning' : 'info',
      confidence: 0.72,
      evidence: [
        `Số dư ròng hiện tại ${debtHealth.currentNetBalance}`,
        'Xu hướng công nợ 3 tháng',
      ],
      action: { type: 'review_settlements', label: 'Xem thanh toán', to: '/rooms' },
      createdAt,
    }));
  }

  const currentMonth = analytics.monthlyTrend.at(-1)?.amount ?? 0;
  const priorAmounts = analytics.monthlyTrend.slice(-4, -1).map((item) => item.amount).filter((amount) => amount > 0);
  const priorAverage = priorAmounts.length ? priorAmounts.reduce((sum, amount) => sum + amount, 0) / priorAmounts.length : 0;
  if (priorAverage > 0 && currentMonth > priorAverage * 1.25) {
    recommendations.push(serializeRecommendation({
      id: 'spending-velocity',
      type: 'spending_velocity',
      title: 'Nhịp chi đang cao hơn bình thường',
      description: `Chi tiêu từ đầu tháng cao hơn trung bình gần đây ${Math.round(((currentMonth - priorAverage) / priorAverage) * 100)}%.`,
      severity: currentMonth > priorAverage * 1.5 ? 'warning' : 'info',
      confidence: Math.min(0.9, Math.max(forecast.confidence, 0.65)),
      evidence: [
        `${priorAmounts.length} tháng gần nhất đã hoàn tất`,
        `Chi tiêu tháng này ${currentMonth}`,
      ],
      action: { type: 'open_forecasts', label: 'Xem dự báo', to: '/forecasts' },
      createdAt,
    }));
  }

  return recommendations;
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
