import { formatCurrency } from './currencyFormatter.js';

export function generateRuleBasedInsights(summary, analytics = null, temporalMemory = null) {
  const insights = [];
  const totalParticipated = summary.categoryBreakdown.reduce((sum, item) => sum + item.amount, 0);

  if (summary.recentExpenses.length === 0) {
    return [{
      type: 'suggestion',
      title: 'Bắt đầu theo dõi chi tiêu',
      message: 'Khi có thêm vài khoản chi, Zyra sẽ nhận ra nhịp chi và gợi ý rõ hơn cho bạn.',
      severity: 'info',
      confidence: 1,
    }];
  }

  for (const candidate of temporalMemory?.insightCandidates ?? []) {
    if (candidate.confidence < 0.55) continue;
    insights.push({
      type: mapTemporalInsightType(candidate.type),
      title: candidate.title,
      message: candidate.message,
      severity: candidate.type === 'worsening' || candidate.type === 'anomaly_shift' ? 'warning' : candidate.type === 'improvement' || candidate.type === 'stabilization' || candidate.type === 'habit_reinforcement' ? 'positive' : 'info',
      confidence: candidate.confidence,
    });
    if (insights.length >= 2) break;
  }

  const foodTotal = summary.categoryBreakdown
    .filter((item) => item.category === 'food' || item.category === 'drinks')
    .reduce((sum, item) => sum + item.amount, 0);
  if (totalParticipated > 0 && foodTotal / totalParticipated > 0.4) {
    insights.push({
      type: 'warning',
      title: 'Ăn uống đang chiếm tỷ trọng lớn',
      message: `Ăn uống chiếm khoảng ${Math.round((foodTotal / totalParticipated) * 100)}% tổng chi tiêu gần đây. Đặt một hạn mức riêng có thể giúp bạn dễ theo dõi hơn.`,
      severity: 'warning',
      confidence: 0.9,
    });
  }

  if (summary.totalIOwe > summary.totalOwedToMe * 2 && summary.totalIOwe > 50000) {
    insights.push({
      type: 'debt',
      title: 'Công nợ nhóm cần theo dõi thêm',
      message: `Bạn đang cần thanh toán khoảng ${formatCurrency(summary.totalIOwe)}. Xem lại các khoản đến hạn sẽ giúp dòng tiền rõ ràng hơn.`,
      severity: 'warning',
      confidence: 0.85,
    });
  }

  if (analytics?.forecast?.riskCategories?.length) {
    const topRisk = analytics.forecast.riskCategories[0];
    insights.push({
      type: 'warning',
      title: 'Một ngân sách có thể vượt hạn mức',
      message: `Danh mục ${formatCategoryLabel(topRisk.category)} đang tiến gần hạn mức tháng này. Bạn có thể xem lại trước khi chi thêm.`,
      severity: 'warning',
      confidence: analytics.forecast.confidence || 0.7,
    });
  }

  if (analytics?.anomalies?.length) {
    const anomaly = analytics.anomalies[0];
    insights.push({
      type: 'warning',
      title: anomaly.title,
      message: anomaly.message,
      severity: anomaly.severity,
      confidence: anomaly.confidence,
    });
  }

  if (summary.monthlyTrend.length >= 3) {
    const latest = summary.monthlyTrend.at(-1).amount;
    const previous = summary.monthlyTrend.slice(0, -1);
    const average = previous.reduce((sum, item) => sum + item.amount, 0) / previous.length;
    if (average > 0 && latest > average * 1.3) {
      insights.push({
        type: 'trend',
        title: 'Nhịp chi tháng này cao hơn thường lệ',
        message: `Tháng này đang cao hơn mức gần đây khoảng ${Math.round(((latest - average) / average) * 100)}%. Bạn có thể kiểm tra lại các khoản lớn nhất.`,
        severity: 'warning',
        confidence: 0.8,
      });
    }
  }

  if (insights.length === 0) {
    insights.push({
      type: 'positive',
      title: 'Chi tiêu đang khá ổn định',
      message: 'Dữ liệu hiện tại chưa cho thấy điểm cần chú ý lớn. Bạn đang kiểm soát khoản này khá tốt.',
      severity: 'positive',
      confidence: 0.7,
    });
  }

  return dedupeInsights(insights).slice(0, 5);
}

function mapTemporalInsightType(type) {
  return {
    improvement: 'improvement',
    worsening: 'worsening',
    recurring_rhythm: 'recurring_rhythm',
    stabilization: 'stabilization',
    anomaly_shift: 'anomaly_shift',
    habit_reinforcement: 'habit_reinforcement',
  }[type] ?? 'trend';
}

function dedupeInsights(insights) {
  const seen = new Set();
  return insights.filter((insight) => {
    const key = `${insight.type}:${normalize(insight.title)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function normalize(value) {
  return String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim();
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
