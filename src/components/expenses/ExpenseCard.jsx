// ExpenseCard.jsx — Single expense display card
import { motion } from 'framer-motion';
import { Trash2, Edit3, Calendar, User } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import Avatar, { AvatarGroup } from '../ui/Avatar';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { CATEGORIES } from '../../data/mockData';

export default function ExpenseCard({ expense, onEdit, index = 0 }) {
  const { members, deleteExpense } = useApp();

  const payer = members.find((m) => m.id === expense.paidBy);
  const participantMembers = (expense.participants || [])
    .map((pid) => members.find((m) => m.id === pid))
    .filter(Boolean);
  const category = CATEGORIES.find((c) => c.id === expense.category) || CATEGORIES[CATEGORIES.length - 1];
  const perPerson = expense.participants?.length
    ? expense.amount / expense.participants.length
    : expense.amount;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, type: 'spring', stiffness: 300, damping: 28 }}
      className="glass-card-hover p-4 group"
    >
      <div className="flex items-start gap-3">
        {/* Category icon */}
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0 ${category.bg}`}>
          {category.icon}
        </div>

        <div className="flex-1 min-w-0">
          {/* Title row */}
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="font-semibold text-white text-sm truncate">{expense.title}</h3>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                <span className={`text-[10px] ${category.color} font-medium`}>{category.label}</span>
                <span className="text-[10px] text-gray-600">•</span>
                <span className="text-[10px] text-gray-500 flex items-center gap-1">
                  <Calendar className="w-2.5 h-2.5" />
                  {formatDate(expense.date)}
                </span>
              </div>
            </div>
            <div className="text-right shrink-0">
              <p className="text-base font-bold text-white">{formatCurrency(expense.amount, true)}</p>
              <p className="text-[10px] text-gray-500">{formatCurrency(perPerson, true)}/người</p>
            </div>
          </div>

          {/* Payer & participants */}
          <div className="flex items-center justify-between mt-3">
            <div className="flex items-center gap-2">
              {payer && (
                <div className="flex items-center gap-1.5">
                  <Avatar member={payer} size="xs" />
                  <span className="text-xs text-gray-400">
                    <span className="text-gray-500">trả bởi </span>
                    <span className="text-gray-300 font-medium">{payer.name}</span>
                  </span>
                </div>
              )}
            </div>
            <AvatarGroup members={participantMembers} max={5} size="xs" />
          </div>

          {expense.note && (
            <p className="mt-2 text-xs text-gray-600 italic truncate">"{expense.note}"</p>
          )}
        </div>
      </div>

      {/* Actions — appear on hover */}
      <div className="flex justify-end gap-1 mt-3 pt-3 border-t border-white/5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-200">
        {onEdit && (
          <button onClick={() => onEdit(expense)} className="btn-icon p-1.5 text-xs flex items-center gap-1">
            <Edit3 className="w-3.5 h-3.5" />
            <span>Sửa</span>
          </button>
        )}
        <button
          onClick={() => deleteExpense(expense.id)}
          className="btn-danger p-1.5 text-xs flex items-center gap-1"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Xoá</span>
        </button>
      </div>
    </motion.div>
  );
}
