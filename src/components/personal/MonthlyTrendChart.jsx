// MonthlyTrendChart.jsx — Bar chart showing monthly spending trend
import { motion } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { formatCurrency } from '../../utils/formatters';

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-card px-3 py-2 text-xs border border-white/10">
      <p className="text-gray-400 mb-1">{label}</p>
      <p className="text-white font-bold">{formatCurrency(payload[0].value, true)}</p>
    </div>
  );
};

export default function MonthlyTrendChart({ data }) {
  if (!data || data.length === 0) {
    return (
      <div className="glass-card p-5 flex flex-col gap-2">
        <h3 className="text-sm font-semibold text-gray-300">Xu hướng chi tiêu (6 tháng)</h3>
        <p className="text-gray-500 text-xs py-4 text-center">Chưa có dữ liệu</p>
      </div>
    );
  }

  const formatted = data.map(d => ({
    ...d,
    label: d.month.slice(5), // "YYYY-MM" → "MM"
  }));

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.25 }}
      className="glass-card p-5 flex flex-col gap-4"
    >
      <h3 className="text-sm font-semibold text-gray-300">Xu hướng chi tiêu (6 tháng)</h3>
      <div className="h-44">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={formatted} barSize={28}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fill: '#6b7280', fontSize: 11 }}
              axisLine={false} tickLine={false}
            />
            <YAxis
              tick={{ fill: '#6b7280', fontSize: 10 }}
              axisLine={false} tickLine={false}
              tickFormatter={v => v >= 1000000 ? `${(v/1000000).toFixed(1)}M` : v >= 1000 ? `${(v/1000).toFixed(0)}k` : v}
              width={40}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
            <Bar dataKey="amount" fill="url(#barGrad)" radius={[6, 6, 0, 0]} />
            <defs>
              <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.9} />
                <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.6} />
              </linearGradient>
            </defs>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}
