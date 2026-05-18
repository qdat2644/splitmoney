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

  // 1. Spending comparison
  const thisMonthTotal = thisMonthExpenses.reduce((s, e) => s + e.amount, 0);
  const lastMonthTotal = lastMonthExpenses.reduce((s, e) => s + e.amount, 0);
  
  if (lastMonthTotal > 0) {
    const percentChange = ((thisMonthTotal - lastMonthTotal) / lastMonthTotal * 100).toFixed(0);
    if (percentChange > 10) {
      insights.push(`Chi tiêu tháng này đã tăng ${percentChange}% so với tháng trước.`);
    } else if (percentChange < -10) {
      insights.push(`Tuyệt vời! Chi tiêu tháng này giảm ${Math.abs(percentChange)}% so với tháng trước.`);
    }
  }

  // 2. Category spike (e.g. cafe, food)
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
        let catName = cat;
        if (cat === 'cafe') catName = 'Cafe/Trà sữa';
        if (cat === 'food') catName = 'Ăn uống';
        insights.push(`Chú ý: Chi tiêu cho ${catName} đang tăng đột biến (${spike.toFixed(0)}%).`);
      }
    }
  });

  // 3. Current User vs Average
  if (currentUser && members.length > 0) {
    const userPaid = thisMonthExpenses.filter(e => e.paidBy === currentUser.id).reduce((s, e) => s + e.amount, 0);
    const avgPaid = thisMonthTotal / members.length;
    if (userPaid > avgPaid * 1.5 && userPaid > 0) {
      insights.push(`Bạn đang trả tiền nhiều hơn mức trung bình của nhóm trong tháng này.`);
    }
  }

  // 4. Weekend vs Weekday
  let weekendTotal = 0;
  let weekdayTotal = 0;
  thisMonthExpenses.forEach(e => {
    const day = new Date(e.date).getDay();
    if (day === 0 || day === 6) weekendTotal += e.amount;
    else weekdayTotal += e.amount;
  });
  
  if (weekendTotal > weekdayTotal && weekendTotal > 0) {
    insights.push(`Hầu hết chi tiêu của nhóm diễn ra vào cuối tuần.`);
  }

  // 5. Smart Suggestions (Frequency based)
  if (thisMonthExpenses.length > 5) {
    const titleCounts = {};
    thisMonthExpenses.forEach(e => {
      const titleLower = e.title.toLowerCase();
      titleCounts[titleLower] = (titleCounts[titleLower] || 0) + 1;
    });

    for (const [title, count] of Object.entries(titleCounts)) {
      if (count >= 3) {
        insights.push(`Gợi ý: Nhóm bạn thường xuyên chi tiêu cho "${title}" (${count} lần). Bạn có muốn tạo Kế hoạch chi tiêu cho mục này?`);
        break; // just one suggestion to not overwhelm
      }
    }
  }

  return insights;
}
