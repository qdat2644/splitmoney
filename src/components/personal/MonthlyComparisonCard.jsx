// MonthlyComparisonCard.jsx — Monthly comparison and trend indicators
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus, CalendarDays } from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';

/**
 * Props:
 *   monthlyTrend — array of { month: 'YYYY-MM', amount: number }
 */
export default function MonthlyComparisonCard({ monthlyTrend }) {
  if (!monthlyTrend || monthlyTrend.length < 2) return null;

  const sorted = [...monthlyTrend].sort((a, b) => a.month.localeCompare(b.month));
  const current = sorted[sorted.length - 1];
  const prev    = sorted[sorted.length - 2];

  const delta    = current.amount - prev.amount;
  const deltaPct = prev.amount > 0 ? Math.round((delta / prev.amount) * 100) : null;

  const isUp   = delta > 0;
  const isDown = delta < 0;

  const currentLabel = current.month.slice(5);
  const prevLabel    = prev.month.slice(5);

  // Find highest-spend month for callout
  const peak = sorted.reduce((max, m) => m.amount > max.amount ? m : max, sorted[0]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="glass-card p-5 border border-white/5"
    >
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
          <CalendarDays className="w-4 h-4 text-blue-400" />
        </div>
        <h3 className="text-sm font-semibold text-white">So sánh tháng</h3>
      </div>

      {/* Current vs Previous */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-white/4 rounded-xl p-3 border border-white/5">
          <p className="text-xs text-gray-500 mb-1">Tháng {currentLabel} (hiện tại)</p>
          <p className="text-lg font-bold text-white">{formatCurrency(current.amount, true)}</p>
        </div>
        <div className="bg-white/4 rounded-xl p-3 border border-white/5">
          <p className="text-xs text-gray-500 mb-1">Tháng {prevLabel} (trước)</p>
          <p className="text-lg font-bold text-gray-400">{formatCurrency(prev.amount, true)}</p>
        </div>
      </div>

      {/* Trend indicator */}
      <div className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border ${
        isDown
          ? 'bg-emerald-500/10 border-emerald-500/20'
          : isUp
          ? 'bg-red-500/10 border-red-500/20'
          : 'bg-white/5 border-white/8'
      }`}>
        {isDown
          ? <TrendingDown className="w-5 h-5 text-emerald-400 shrink-0" />
          : isUp
          ? <TrendingUp className="w-5 h-5 text-red-400 shrink-0" />
          : <Minus className="w-5 h-5 text-gray-400 shrink-0" />}
        <div>
          <p className={`text-sm font-semibold ${isDown ? 'text-emerald-400' : isUp ? 'text-red-400' : 'text-gray-400'}`}>
            {isDown
              ? `Giảm ${formatCurrency(Math.abs(delta), true)} ${deltaPct != null ? `(${Math.abs(deltaPct)}%)` : ''}`
              : isUp
              ? `Tăng ${formatCurrency(Math.abs(delta), true)} ${deltaPct != null ? `(${Math.abs(deltaPct)}%)` : ''}`
              : 'Không thay đổi'}
          </p>
          <p className="text-xs text-gray-500">
            so với tháng {prevLabel}
            {isDown ? ' 🎉 Tiêu ít hơn!' : isUp ? ' ⚠️ Tiêu nhiều hơn' : ''}
          </p>
        </div>
      </div>

      {/* Peak month */}
      {peak && sorted.length >= 3 && (
        <div className="mt-3 flex items-center gap-1.5 text-xs text-gray-500">
          <span>Tháng chi cao nhất:</span>
          <span className="text-orange-400 font-semibold">Tháng {peak.month.slice(5)}</span>
          <span>({formatCurrency(peak.amount, true)})</span>
        </div>
      )}
    </motion.div>
  );
}
