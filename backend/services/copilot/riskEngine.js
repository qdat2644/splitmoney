import { formatCurrency } from '../../utils/currencyFormatter.js';
import { serializeRecommendation } from './copilotSerializer.js';

export function buildRiskRecommendations({ analytics, summary, createdAt }) {
  const recommendations = [];
  const { forecast, anomalies, spendingVelocity, debtHealth } = analytics;

  for (const risk of forecast.riskCategories ?? []) {
    const overshootPct = risk.budget > 0 ? Math.round(((risk.forecastAmount - risk.budget) / risk.budget) * 100) : 0;
    const categoryLabel = formatCategoryLabel(risk.category);

    recommendations.push(serializeRecommendation({
      id: `budget-risk:${risk.category}`,
      type: 'budget_risk',
      category: risk.category,
      personality: 'gentle_warning',
      title: `Danh mục “${categoryLabel}” có thể vượt hạn mức`,
      description: `Nếu nhịp chi hiện tại giữ nguyên, danh mục này có thể cao hơn ngân sách khoảng ${overshootPct}%.`,
      severity: overshootPct >= 25 ? 'critical' : 'warning',
      confidence: forecast.confidence,
      evidence: [
        `Dự báo khoảng ${formatCurrency(risk.forecastAmount)}`,
        `Ngân sách hiện tại ${formatCurrency(risk.budget)}`,
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
      category: categorySpike.category,
      personality: 'gentle_warning',
      title: categorySpike.title,
      description: categorySpike.message,
      severity: categorySpike.severity,
      confidence: categorySpike.confidence,
      evidence: ['Danh mục này đang cao hơn nhịp chi thường thấy'],
      action: { type: 'open_analytics', label: 'Xem phân tích', to: '/forecasts' },
      createdAt,
    }));
  }

  if (debtHealth.direction === 'worsening' && summary.totalIOwe > 0) {
    recommendations.push(serializeRecommendation({
      id: 'debt-attention',
      type: 'debt_attention',
      personality: 'supportive_guidance',
      title: 'Công nợ nhóm đang cần theo dõi thêm',
      description: 'Số dư ròng đang đi xuống so với tháng trước. Bạn có thể xem lại các khoản cần thanh toán để giữ dòng tiền gọn hơn.',
      severity: summary.totalIOwe > summary.totalOwedToMe ? 'warning' : 'info',
      confidence: 0.72,
      evidence: [
        `Số dư ròng hiện tại ${formatCurrency(debtHealth.currentNetBalance)}`,
        'So sánh công nợ trong 3 tháng gần đây',
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
      personality: 'supportive_guidance',
      title: 'Nhịp chi tháng này đang cao hơn thường lệ',
      description: `Chi tiêu từ đầu tháng cao hơn mức gần đây khoảng ${Math.round(((currentMonth - priorAverage) / priorAverage) * 100)}%. Có thể đáng để xem lại vài khoản lớn trước khi tháng kết thúc.`,
      severity: currentMonth > priorAverage * 1.5 ? 'warning' : 'info',
      confidence: Math.min(0.9, Math.max(forecast.confidence, 0.65)),
      evidence: [
        `${priorAmounts.length} tháng gần nhất để đối chiếu`,
        `Tháng này khoảng ${formatCurrency(currentMonth)}`,
      ],
      action: { type: 'open_forecasts', label: 'Xem dự báo', to: '/forecasts' },
      createdAt,
    }));
  }

  return recommendations;
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
