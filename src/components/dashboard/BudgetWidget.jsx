import { useMemo } from 'react';
import { Target, AlertTriangle } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { CATEGORIES } from '../../data/mockData';

export default function BudgetWidget() {
  const { budgets = [], expenses = [] } = useApp();

  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  const monthlyBudgets = useMemo(() => {
    return budgets.filter(b => b.month === currentMonth && b.year === currentYear);
  }, [budgets, currentMonth, currentYear]);

  // If no budgets exist, just return null for now.
  // In a real app we would have a way to add them, but here we just show existing or default.
  // Wait, let's create a default total budget if none exists.
  const displayBudgets = monthlyBudgets.length > 0 ? monthlyBudgets : [{ id: 'default', category: 'all', amount: 5000000, title: 'Tổng ngân sách' }];

  const budgetStats = useMemo(() => {
    const stats = [];
    const thisMonthExpenses = expenses.filter(e => {
      const d = new Date(e.date);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });

    displayBudgets.forEach(b => {
      let spent = 0;
      if (b.category === 'all') {
        spent = thisMonthExpenses.reduce((s, e) => s + e.amount, 0);
      } else {
        spent = thisMonthExpenses.filter(e => e.category === b.category).reduce((s, e) => s + e.amount, 0);
      }
      const percent = Math.min((spent / b.amount) * 100, 100);
      stats.push({ ...b, spent, percent });
    });
    return stats;
  }, [displayBudgets, expenses, currentMonth, currentYear]);

  return (
    <div className="space-y-3 mt-6">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-white flex items-center gap-2">
          <Target className="w-4 h-4 text-emerald-400" />
          Ngân sách tháng {currentMonth + 1}
        </h2>
      </div>
      <div className="space-y-3">
        {budgetStats.map(b => (
          <div key={b.id} className="glass-card p-4 space-y-2">
            <div className="flex justify-between items-end">
              <span className="text-sm font-medium text-gray-200">
                {b.category === 'all' ? b.title : CATEGORIES.find(c => c.id === b.category)?.label || 'Khác'}
              </span>
              <span className="text-xs text-gray-400">
                <span className={b.percent > 80 ? "text-orange-400 font-bold" : "text-gray-300"}>{b.spent.toLocaleString('vi-VN')}đ</span> / {b.amount.toLocaleString('vi-VN')}đ
              </span>
            </div>
            {/* Progress bar */}
            <div className="h-2 w-full bg-dark-700 rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-500 ${b.percent > 90 ? 'bg-red-500' : b.percent > 75 ? 'bg-orange-400' : 'bg-emerald-500'}`}
                style={{ width: `${b.percent}%` }}
              />
            </div>
            {b.percent > 80 && (
              <p className="text-xs text-orange-400 flex items-center gap-1 mt-1">
                <AlertTriangle className="w-3 h-3" /> Đã dùng {b.percent.toFixed(0)}% ngân sách
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
