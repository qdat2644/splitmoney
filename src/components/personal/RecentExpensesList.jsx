// RecentExpensesList.jsx — 10 most recent expenses across all rooms
import { motion } from 'framer-motion';
import { ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';
import { CATEGORIES } from '../../data/mockData';

function getCatMeta(id) {
  return CATEGORIES.find(c => c.id === id) || { label: id, icon: '📦' };
}

export default function RecentExpensesList({ data }) {
  if (!data || data.length === 0) {
    return (
      <div className="glass-card p-5">
        <h3 className="text-sm font-semibold text-gray-300 mb-3">Giao dịch gần đây</h3>
        <p className="text-gray-500 text-xs py-6 text-center">Chưa có giao dịch nào</p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.35 }}
      className="glass-card p-5 flex flex-col gap-3"
    >
      <h3 className="text-sm font-semibold text-gray-300">Giao dịch gần đây</h3>
      <div className="space-y-1">
        {data.map((exp, i) => {
          const cat = getCatMeta(exp.category);
          return (
            <motion.div
              key={exp.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.38 + i * 0.04 }}
              className="flex items-center gap-3 py-2.5 px-2 rounded-xl hover:bg-white/3 transition-colors"
            >
              {/* Category icon */}
              <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center text-base shrink-0">
                {cat.icon}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{exp.title}</p>
                <p className="text-xs text-gray-500 truncate">{exp.roomName} · {exp.date}</p>
              </div>

              {/* Amount + direction */}
              <div className="text-right shrink-0">
                <p className={`text-sm font-bold ${exp.paidByMe ? 'text-emerald-400' : 'text-gray-200'}`}>
                  {exp.paidByMe ? '+' : ''}{formatCurrency(exp.amount, true)}
                </p>
                <div className="flex items-center justify-end gap-1 mt-0.5">
                  {exp.paidByMe
                    ? <><ArrowUpRight className="w-2.5 h-2.5 text-emerald-500" /><span className="text-[10px] text-emerald-600">Trả</span></>
                    : <><ArrowDownLeft className="w-2.5 h-2.5 text-gray-500" /><span className="text-[10px] text-gray-600">Phần: {formatCurrency(exp.myShareAmount, true)}</span></>
                  }
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
