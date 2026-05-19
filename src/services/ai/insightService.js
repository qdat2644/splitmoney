import { formatCurrency } from '../../utils/formatters';

const categoryLabels = {
  cafe: 'cafe/trà sữa',
  food: 'ăn uống',
  drinks: 'đồ uống',
  transport: 'di chuyển',
  shopping: 'mua sắm',
  entertainment: 'giải trí',
  other: 'khác',
};

export function generateInsights(expenses, members, currentUser) {
  const insights = [];

  if (!expenses.length) return insights;

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const thisMonthExpenses = expenses.filter(e => {
    const d = new Date(e.date);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });

  const lastMonthExpenses = expenses.filter(e => {
    const d = new Date(e.date);
    return d.getMonth() === (currentMonth - 1 < 0 ? 11 : currentMonth - 1) &&
           d.getFullYear() === (currentMonth - 1 < 0 ? currentYear - 1 : currentYear);
  });

  const thisMonthTotal = thisMonthExpenses.reduce((s, e) => s + e.amount, 0);
  const lastMonthTotal = lastMonthExpenses.reduce((s, e) => s + e.amount, 0);

  if (lastMonthTotal > 0) {
    const percentChange = ((thisMonthTotal - lastMonthTotal) / lastMonthTotal * 100).toFixed(0);
    if (percentChange > 10) {
      insights.push(`Chi tiêu tháng này đang cao hơn tháng trước khoảng ${percentChange}%. Bạn có thể xem lại vài khoản lớn nhất.`);
    } else if (percentChange < -10) {
      insights.push(`Chi tiêu tháng này giảm khoảng ${Math.abs(percentChange)}% so với tháng trước. Nhịp hiện tại đang khá ổn.`);
    }
  }

  const categoryCurrent = {};
  thisMonthExpenses.forEach(e => {
    categoryCurrent[e.category || 'other'] = (categoryCurrent[e.category || 'other'] || 0) + e.amount;
  });

  const categoryLast = {};
  lastMonthExpenses.forEach(e => {
    categoryLast[e.category || 'other'] = (categoryLast[e.category || 'other'] || 0) + e.amount;
  });

  Object.keys(categoryCurrent).forEach(cat => {
    if (categoryLast[cat] && categoryLast[cat] > 0) {
      const spike = ((categoryCurrent[cat] - categoryLast[cat]) / categoryLast[cat] * 100);
      if (spike > 50 && categoryCurrent[cat] > 200000) {
        const catName = categoryLabels[cat] ?? cat;
        insights.push(`Chi tiêu cho ${catName} đang cao hơn tháng trước khoảng ${spike.toFixed(0)}%. Có thể đáng để đặt hạn mức riêng.`);
      }
    }
  });

  if (currentUser && members.length > 0) {
    const userPaid = thisMonthExpenses.filter(e => e.paidBy === currentUser.id).reduce((s, e) => s + e.amount, 0);
    const avgPaid = thisMonthTotal / members.length;
    if (userPaid > avgPaid * 1.5 && userPaid > 0) {
      insights.push(`Bạn đang trả trước cho nhóm nhiều hơn mức trung bình. Tổng đã trả khoảng ${formatCurrency(userPaid)} trong tháng này.`);
    }
  }

  let weekendTotal = 0;
  let weekdayTotal = 0;
  thisMonthExpenses.forEach(e => {
    const day = new Date(e.date).getDay();
    if (day === 0 || day === 6) weekendTotal += e.amount;
    else weekdayTotal += e.amount;
  });

  if (weekendTotal > weekdayTotal && weekendTotal > 0) {
    insights.push('Chi tiêu của nhóm tập trung nhiều hơn vào cuối tuần. Điều này có thể hữu ích khi bạn lên kế hoạch trước.');
  }

  if (thisMonthExpenses.length > 5) {
    const titleCounts = {};
    thisMonthExpenses.forEach(e => {
      const titleLower = e.title.toLowerCase();
      titleCounts[titleLower] = (titleCounts[titleLower] || 0) + 1;
    });

    for (const [title, count] of Object.entries(titleCounts)) {
      if (count >= 3) {
        insights.push(`Bạn đang chi cho “${title}” khá đều (${count} lần). Một hạn mức nhỏ sẽ giúp theo dõi dễ hơn.`);
        break;
      }
    }
  }

  return insights;
}
