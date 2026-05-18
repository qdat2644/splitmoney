// BudgetList.jsx — Budget management list with edit/delete actions
import { motion, AnimatePresence } from 'framer-motion';
import { Pencil, Trash2, PiggyBank, Plus } from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';

const CATEGORY_LABELS = {
  food: '🍜 Ăn uống', transport: '🚗 Di chuyển', shopping: '🛒 Mua sắm',
  entertainment: '🎮 Giải trí', health: '💊 Sức khỏe', travel: '✈️ Du lịch',
  accommodation: '🏠 Chỗ ở', utilities: '⚡ Tiện ích',
  overall: '💰 Tổng chi', other: '📦 Khác',
};

const MONTH_NAMES = ['', 'T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9', 'T10', 'T11', 'T12'];

function UsageBar({ pct, overBudget }) {
  const clamped = Math.min(pct, 100);
  return (
    <div className="h-1.5 bg-white/8 rounded-full overflow-hidden mt-2">
      <motion.div
        className={`h-full rounded-full transition-colors ${overBudget ? 'bg-red-500' : pct > 80 ? 'bg-amber-400' : 'bg-emerald-400'}`}
        initial={{ width: 0 }}
        animate={{ width: `${clamped}%` }}
        transition={{ duration: 0.7, ease: 'easeOut' }}
      />
    </div>
  );
}

export default function BudgetList({ budgets, statusMap, onEdit, onDelete, onAdd, roomNameMap = {} }) {
  if (budgets.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}
        className="glass-card p-12 flex flex-col items-center gap-5 text-center border-dashed border-2 border-white/5"
      >
        <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 shadow-[0_0_30px_rgba(16,185,129,0.2)]">
          <PiggyBank className="w-8 h-8 text-emerald-400" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-white mb-1">Chưa có ngân sách nào</h2>
          <p className="text-gray-400 text-sm max-w-sm mx-auto">Thiết lập hạn mức chi tiêu để kiểm soát ngân sách nhóm hiệu quả hơn.</p>
        </div>
        <button onClick={onAdd} className="btn-primary text-sm flex items-center gap-2">
          <Plus className="w-4 h-4" /> Tạo ngân sách đầu tiên
        </button>
      </motion.div>
    );
  }

  return (
    <AnimatePresence mode="popLayout">
      {budgets.map(budget => {
        const st = statusMap?.[budget.id];
        const actual = st?.actual ?? 0;
        const pct = budget.amount > 0 ? Math.round((actual / budget.amount) * 100) : 0;
        const overBudget = actual > budget.amount;

        return (
          <motion.div
            key={budget.id}
            layout
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="glass-card p-4 border border-white/5 hover:border-white/10 transition-colors"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold text-white">
                    {CATEGORY_LABELS[budget.category ?? 'overall'] ?? budget.category}
                  </span>
                  <span className="text-xs text-gray-500">
                    {MONTH_NAMES[budget.month]}/{budget.year}
                  </span>
                  <span className="text-xs px-1.5 py-0.5 rounded-full bg-white/8 text-gray-300">
                    {budget.roomId ? 'Phòng' : 'Cá nhân'}
                  </span>
                  {budget.roomId && (
                    <span className="text-xs text-gray-500">
                      {roomNameMap[budget.roomId] ?? budget.roomId}
                    </span>
                  )}
                  {overBudget && (
                    <span className="text-xs px-1.5 py-0.5 rounded-full bg-red-500/15 text-red-400">
                      Vượt hạn mức
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 mt-1">
                  <span className={`text-sm font-bold ${overBudget ? 'text-red-400' : 'text-white'}`}>
                    {formatCurrency(actual, true)}
                  </span>
                  <span className="text-xs text-gray-500">/ {formatCurrency(budget.amount, true)}</span>
                  <span className={`text-xs font-semibold ml-auto ${
                    overBudget ? 'text-red-400' : pct > 80 ? 'text-amber-400' : 'text-emerald-400'
                  }`}>{pct}%</span>
                </div>

                <UsageBar pct={pct} overBudget={overBudget} />

                {!overBudget && (
                  <p className="text-xs text-gray-500 mt-1">
                    Còn lại: {formatCurrency(budget.amount - actual, true)}
                  </p>
                )}
                {overBudget && (
                  <p className="text-xs text-red-400/80 mt-1">
                    Vượt: {formatCurrency(actual - budget.amount, true)}
                  </p>
                )}
              </div>

              <div className="flex gap-1 shrink-0">
                <button
                  onClick={() => onEdit(budget)}
                  className="btn-icon w-7 h-7 text-blue-400/70 hover:text-blue-400 hover:bg-blue-500/10"
                  title="Chỉnh sửa"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => onDelete(budget.id)}
                  className="btn-icon w-7 h-7 text-red-400/60 hover:text-red-400 hover:bg-red-500/10"
                  title="Xoá"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </motion.div>
        );
      })}
    </AnimatePresence>
  );
}
