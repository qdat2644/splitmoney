// Analytics.jsx — Charts and statistics page
import { motion } from 'framer-motion';
import { BarChart3, PieChart, TrendingUp, Download } from 'lucide-react';
import { useApp } from '../context/AppContext';
import {
  ExpenseByPersonChart,
  CategoryPieChart,
  ExpenseTimelineChart,
} from '../components/charts/ChartsSection';
import { formatCurrency } from '../utils/formatters';
import { CATEGORIES } from '../data/mockData';
import { exportExpensesToCsv } from '../utils/exportCsv';
import PredictionWidget from '../components/dashboard/PredictionWidget';
import { SkeletonPage } from '../components/ui/Skeleton';

function ChartCard({ title, icon: Icon, children, index = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, type: 'spring', stiffness: 280, damping: 25 }}
      className="glass-card p-5"
    >
      <h3 className="text-sm font-semibold text-gray-300 mb-4 flex items-center gap-2">
        <Icon className="w-4 h-4 text-blue-400" />
        {title}
      </h3>
      {children}
    </motion.div>
  );
}

export default function Analytics() {
  const { stats, members, expenses, loadingRoom, toast } = useApp();

  const handleExport = () => {
    exportExpensesToCsv(expenses, members);
    toast.success('Đã xuất file CSV!');
  };

  // Category breakdown
  const categoryData = Object.entries(stats.byCategory)
    .map(([catId, amount]) => {
      const cat = CATEGORIES.find((c) => c.id === catId) || CATEGORIES[CATEGORIES.length - 1];
      return { ...cat, amount, pct: stats.totalExpenses > 0 ? (amount / stats.totalExpenses) * 100 : 0 };
    })
    .sort((a, b) => b.amount - a.amount);

  return (
    <div className="space-y-5 max-w-5xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-2xl font-bold text-white">Thống kê</h1>
          <p className="text-gray-500 text-sm mt-0.5">Phân tích chi tiêu nhóm</p>
        </div>
        <button onClick={handleExport} className="btn-secondary flex items-center gap-1.5 text-sm">
          <Download className="w-4 h-4" />
          Xuất CSV
        </button>
      </motion.div>

      {loadingRoom ? (
        <SkeletonPage />
      ) : (
        <>
          {/* Charts grid */}
          <div className="grid lg:grid-cols-2 gap-4">
        <ChartCard title="Chi tiêu theo người" icon={BarChart3} index={0}>
          <ExpenseByPersonChart />
        </ChartCard>
        <ChartCard title="Chi tiêu theo danh mục" icon={PieChart} index={1}>
          <CategoryPieChart />
        </ChartCard>
      </div>

      <PredictionWidget />

      <ChartCard title="Chi tiêu theo thời gian" icon={TrendingUp} index={2}>
        <ExpenseTimelineChart />
      </ChartCard>

      {/* Category breakdown table */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        className="glass-card p-5"
      >
        <h3 className="text-sm font-semibold text-gray-300 mb-4">Chi tiết danh mục</h3>
        <div className="space-y-3">
          {categoryData.map((cat, i) => (
            <div key={cat.id}>
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="flex items-center gap-2 text-gray-300">
                  <span className="text-base">{cat.icon}</span>
                  {cat.label}
                </span>
                <div className="flex items-center gap-3">
                  <span className="text-gray-500 text-xs">{cat.pct.toFixed(1)}%</span>
                  <span className="font-semibold text-white w-20 text-right">{formatCurrency(cat.amount, true)}</span>
                </div>
              </div>
              <div className="h-1.5 bg-dark-600 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${cat.pct}%` }}
                  transition={{ delay: 0.4 + i * 0.05, duration: 0.6, ease: 'easeOut' }}
                  className={`h-full rounded-full ${cat.bg.replace('/10', '')} bg-gradient-to-r from-blue-500 to-purple-500`}
                />
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Per-member summary table */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45 }}
        className="glass-card overflow-hidden"
      >
        <div className="px-5 py-4 border-b border-white/5">
          <h3 className="text-sm font-semibold text-gray-300">Tổng kết thành viên</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5">
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-500">Thành viên</th>
                <th className="px-5 py-3 text-right text-xs font-medium text-gray-500">Đã trả</th>
                <th className="px-5 py-3 text-right text-xs font-medium text-gray-500">Phần của mình</th>
                <th className="px-5 py-3 text-right text-xs font-medium text-gray-500">Số dư</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {stats.perMember.map((m) => {
                const member = members.find((mem) => mem.id === m.id);
                const share = stats.totalExpenses / Math.max(1, members.length);
                const isPos = m.balance > 1;
                const isNeg = m.balance < -1;
                return (
                  <tr key={m.id} className="hover:bg-white/2 transition-colors">
                    <td className="px-5 py-3 text-gray-300 font-medium">{m.name}</td>
                    <td className="px-5 py-3 text-right text-white font-semibold">{formatCurrency(m.paid, true)}</td>
                    <td className="px-5 py-3 text-right text-gray-400">{formatCurrency(share, true)}</td>
                    <td className={`px-5 py-3 text-right font-bold ${isPos ? 'text-emerald-400' : isNeg ? 'text-red-400' : 'text-gray-500'}`}>
                      {isPos ? '+' : ''}{formatCurrency(m.balance, true)}
                    </td>
                  </tr>
                );
              })}
              <tr className="bg-white/2">
                <td className="px-5 py-3 text-xs font-semibold text-gray-400">Tổng cộng</td>
                <td className="px-5 py-3 text-right text-white font-bold">{formatCurrency(stats.totalExpenses, true)}</td>
                <td className="px-5 py-3 text-right text-gray-400">—</td>
                <td className="px-5 py-3 text-right text-gray-500">—</td>
              </tr>
            </tbody>
          </table>
        </div>
      </motion.div>
        </>
      )}
    </div>
  );
}
