export function generateRuleBasedInsights(summary, analytics = null) {
  const insights = [];
  const totalParticipated = summary.categoryBreakdown.reduce((sum, item) => sum + item.amount, 0);

  if (summary.recentExpenses.length === 0) {
    return [{
      type: 'suggestion',
      title: 'Bắt đầu theo dõi chi tiêu',
      message: 'Bạn chưa có khoản chi nào để phân tích tài chính.',
      severity: 'info',
      confidence: 1,
    }];
  }

  const foodTotal = summary.categoryBreakdown
    .filter((item) => item.category === 'food' || item.category === 'drinks')
    .reduce((sum, item) => sum + item.amount, 0);
  if (totalParticipated > 0 && foodTotal / totalParticipated > 0.4) {
    insights.push({
      type: 'warning',
      title: 'Chi tiêu ăn uống cao',
      message: `Ăn uống chiếm ${Math.round((foodTotal / totalParticipated) * 100)}% tổng chi tiêu của bạn.`,
      severity: 'warning',
      confidence: 0.9,
    });
  }

  if (summary.totalIOwe > summary.totalOwedToMe * 2 && summary.totalIOwe > 50000) {
    insights.push({
      type: 'debt',
      title: 'Công nợ đang cao',
      message: `Bạn đang nợ ${(summary.totalIOwe / 1000).toFixed(0)}k, cao hơn đáng kể so với số tiền được nợ.`,
      severity: 'warning',
      confidence: 0.85,
    });
  }

  if (analytics?.forecast?.riskCategories?.length) {
    const topRisk = analytics.forecast.riskCategories[0];
    insights.push({
      type: 'warning',
      title: 'Nguy cơ vượt ngân sách',
      message: `Danh mục ${formatCategoryLabel(topRisk.category)} có nguy cơ vượt hạn mức trong tháng này.`,
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
        title: 'Chi tiêu tăng mạnh',
        message: `Chi tiêu tháng này cao hơn trung bình gần đây ${Math.round(((latest - average) / average) * 100)}%.`,
        severity: 'warning',
        confidence: 0.8,
      });
    }
  }

  if (insights.length === 0) {
    insights.push({
      type: 'positive',
      title: 'Tài chính đang ổn định',
      message: 'Dữ liệu hiện tại chưa cho thấy rủi ro lớn bất thường.',
      severity: 'positive',
      confidence: 0.7,
    });
  }

  return insights.slice(0, 5);
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
