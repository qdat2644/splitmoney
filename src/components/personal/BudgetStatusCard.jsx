// BudgetStatusCard.jsx — Shows current month budget usage on Personal Dashboard
import { motion } from 'framer-motion';
import { PiggyBank, AlertTriangle, CheckCircle, TrendingUp } from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';

const CATEGORY_LABELS = {
  food: 'Ăn uống', transport: 'Di chuyển', shopping: 'Mua sắm',
  entertainment: 'Giải trí', health: 'Sức khỏe', travel: 'Du lịch',
  accommodation: 'Lưu trú', utilities: 'Tiện ích', overall: 'Tổng chi',
  other: 'Khác',
};

function UsageBar({ pct, overBudget }) {
  const clamped = Math.min(pct, 100);
  return (
    <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
      <motion.div
        className={`h-full rounded-full ${overBudget ? 'bg-red-500' : pct > 80 ? 'bg-amber-400' : 'bg-emerald-400'}`}
        initial={{ width: 0 }}
        animate={{ width: `${clamped}%` }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
      />
    </div>
  );
}

export default function BudgetStatusCard({ status }) {
  if (!status?.hasData || status.budgets.length === 0) return null;

  const overCount = status.budgets.filter(b => b.overBudget).length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="glass-card p-5 border border-white/5"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
            <PiggyBank className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Ngân sách tháng này</h3>
            <p className="text-xs text-gray-500">Tháng {status.month}/{status.year}</p>
          </div>
        </div>
        {overCount > 0 ? (
          <span className="flex items-center gap-1 text-xs text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full">
            <AlertTriangle className="w-3 h-3" /> {overCount} vượt hạn mức
          </span>
        ) : (
          <span className="flex items-center gap-1 text-xs text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
            <CheckCircle className="w-3 h-3" /> Trong hạn mức
          </span>
        )}
      </div>

      {/* Budget rows */}
      <div className="space-y-3">
        {status.budgets.map(b => (
          <div key={b.id}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-gray-400">{CATEGORY_LABELS[b.category] ?? b.category}</span>
              <div className="flex items-center gap-2">
                <span className={`text-xs font-medium ${b.overBudget ? 'text-red-400' : 'text-white'}`}>
                  {formatCurrency(b.actual, true)}
                </span>
                <span className="text-xs text-gray-600">/ {formatCurrency(b.budget, true)}</span>
                <span className={`text-xs font-bold ${b.overBudget ? 'text-red-400' : b.usagePct > 80 ? 'text-amber-400' : 'text-emerald-400'}`}>
                  {b.usagePct}%
                </span>
              </div>
            </div>
            <UsageBar pct={b.usagePct} overBudget={b.overBudget} />
            {b.overBudget && (
              <p className="text-xs text-red-400/80 mt-0.5">
                Vượt {formatCurrency(Math.abs(b.remaining), true)}
              </p>
            )}
          </div>
        ))}
      </div>
    </motion.div>
  );
}
