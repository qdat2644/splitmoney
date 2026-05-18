// CategoryBreakdown.jsx — Pie chart + legend for spending by category
import { motion } from 'framer-motion';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { formatCurrency } from '../../utils/formatters';
import { CATEGORIES } from '../../data/mockData';

const CHART_COLORS = ['#3b82f6','#a855f7','#10b981','#f59e0b','#ef4444','#06b6d4','#8b5cf6','#ec4899'];

function getCatMeta(id) {
  return CATEGORIES.find(c => c.id === id) || { label: id, icon: '📦', color: 'text-gray-400' };
}

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const { name, value } = payload[0];
  return (
    <div className="glass-card px-3 py-2 text-xs border border-white/10">
      <p className="text-gray-300 font-medium">{getCatMeta(name).icon} {getCatMeta(name).label}</p>
      <p className="text-white font-bold">{formatCurrency(value, true)}</p>
    </div>
  );
};

export default function CategoryBreakdown({ data }) {
  if (!data || data.length === 0) {
    return (
      <div className="glass-card p-5 flex flex-col gap-2">
        <h3 className="text-sm font-semibold text-gray-300">Chi tiêu theo danh mục</h3>
        <p className="text-gray-500 text-xs py-4 text-center">Chưa có dữ liệu</p>
      </div>
    );
  }

  const total = data.reduce((s, d) => s + d.amount, 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="glass-card p-5 flex flex-col gap-4"
    >
      <h3 className="text-sm font-semibold text-gray-300">Chi tiêu theo danh mục</h3>

      <div className="flex flex-col sm:flex-row items-center gap-4">
        {/* Pie */}
        <div className="w-full sm:w-44 h-44 shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="amount"
                nameKey="category"
                cx="50%" cy="50%"
                innerRadius={50} outerRadius={80}
                paddingAngle={3}
              >
                {data.map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Legend */}
        <div className="flex-1 w-full space-y-2">
          {data.map((item, i) => {
            const meta = getCatMeta(item.category);
            const pct = total > 0 ? ((item.amount / total) * 100).toFixed(0) : 0;
            return (
              <div key={item.category} className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                <span className="text-xs text-gray-400 flex-1 truncate">{meta.icon} {meta.label}</span>
                <span className="text-xs text-gray-500">{pct}%</span>
                <span className="text-xs font-medium text-white ml-1 shrink-0">{formatCurrency(item.amount, true)}</span>
              </div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}
