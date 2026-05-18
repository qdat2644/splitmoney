export function generateRuleBasedInsights(summary, analytics = null) {
  const insights = [];
  const totalParticipated = summary.categoryBreakdown.reduce((sum, item) => sum + item.amount, 0);

  if (summary.recentExpenses.length === 0) {
    return [{
      type: 'suggestion',
      title: 'Bat dau theo doi chi tieu',
      message: 'Ban chua co khoan chi nao de phan tich tai chinh.',
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
      title: 'Chi tieu an uong cao',
      message: `An uong chiem ${Math.round((foodTotal / totalParticipated) * 100)}% tong chi tieu cua ban.`,
      severity: 'warning',
      confidence: 0.9,
    });
  }

  if (summary.totalIOwe > summary.totalOwedToMe * 2 && summary.totalIOwe > 50000) {
    insights.push({
      type: 'debt',
      title: 'No dang cao',
      message: `Ban dang no ${(summary.totalIOwe / 1000).toFixed(0)}k, cao hon dang ke so voi so tien duoc no.`,
      severity: 'warning',
      confidence: 0.85,
    });
  }

  if (analytics?.forecast?.riskCategories?.length) {
    const topRisk = analytics.forecast.riskCategories[0];
    insights.push({
      type: 'warning',
      title: 'Nguy co vuot ngan sach',
      message: `Danh muc ${topRisk.category} co nguy co vuot han muc trong thang nay.`,
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
        title: 'Chi tieu tang manh',
        message: `Chi tieu thang nay cao hon trung binh gan day ${Math.round(((latest - average) / average) * 100)}%.`,
        severity: 'warning',
        confidence: 0.8,
      });
    }
  }

  if (insights.length === 0) {
    insights.push({
      type: 'positive',
      title: 'Tai chinh dang on dinh',
      message: 'Du lieu hien tai chua cho thay rui ro lon bat thuong.',
      severity: 'positive',
      confidence: 0.7,
    });
  }

  return insights.slice(0, 5);
}
