// RecentExpensesList.jsx - 10 most recent expenses across all rooms
import { motion } from 'framer-motion';
import { ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';
import { CATEGORIES } from '../../data/mockData';

function getCatMeta(id) {
  return CATEGORIES.find((category) => category.id === id) || { label: id, icon: '📦' };
}

export default function RecentExpensesList({ data }) {
  if (!data || data.length === 0) {
    return (
      <div className="glass-card p-5">
        <h3 className="mb-3 text-sm font-semibold text-gray-300">Giao dịch gần đây</h3>
        <p className="py-6 text-center text-xs text-gray-500">
          Chưa có hoạt động gần đây. Các khoản chi mới sẽ xuất hiện ở đây để bạn theo dõi mạch tài chính.
        </p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.35 }}
      className="glass-card flex flex-col gap-3 p-5"
    >
      <h3 className="text-sm font-semibold text-gray-300">Giao dịch gần đây</h3>
      <div className="space-y-1">
        {data.map((expense, index) => {
          const category = getCatMeta(expense.category);
          return (
            <motion.div
              key={expense.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.38 + index * 0.04 }}
              className="flex items-center gap-3 rounded-xl px-2 py-2.5 transition-colors hover:bg-white/3"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/5 text-base">
                {category.icon}
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-white">{expense.title}</p>
                <p className="truncate text-xs text-gray-500">{expense.roomName} · {expense.date}</p>
              </div>

              <div className="shrink-0 text-right">
                <p className={`text-sm font-bold ${expense.paidByMe ? 'text-emerald-400' : 'text-gray-200'}`}>
                  {expense.paidByMe ? '+' : ''}{formatCurrency(expense.amount, true)}
                </p>
                <div className="mt-0.5 flex items-center justify-end gap-1">
                  {expense.paidByMe ? (
                    <>
                      <ArrowUpRight className="h-2.5 w-2.5 text-emerald-500" />
                      <span className="text-[10px] text-emerald-600">Trả</span>
                    </>
                  ) : (
                    <>
                      <ArrowDownLeft className="h-2.5 w-2.5 text-gray-500" />
                      <span className="text-[10px] text-gray-600">Phần: {formatCurrency(expense.myShareAmount, true)}</span>
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
