// SettlementList.jsx — Debt settlement display
import { motion } from 'framer-motion';
import { ArrowRight, Wallet } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import Avatar from '../ui/Avatar';
import { formatCurrency } from '../../utils/formatters';

export function SettlementItem({ settlement, index = 0, onMark, markLabel = 'Trả tiền' }) {
  const { members } = useApp();
  const from = members.find((m) => m.id === settlement.from);
  const to = members.find((m) => m.id === settlement.to);

  if (!from || !to) return null;

  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.06, type: 'spring', stiffness: 300, damping: 28 }}
      className="glass-card-hover p-4 flex items-center gap-3 group"
    >
      {/* From */}
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <Avatar member={from} size="sm" />
        <div className="min-w-0">
          <p className="text-xs text-gray-500">Người trả</p>
          <p className="text-sm font-semibold text-white truncate">{from.name}</p>
        </div>
      </div>

      {/* Arrow & amount */}
      <div className="flex flex-col items-center shrink-0">
        <p className="text-base font-bold text-white">{formatCurrency(settlement.amount, true)}</p>
        <div className="flex items-center gap-1 mt-1">
          <div className="w-8 h-px bg-gradient-to-r from-blue-500 to-purple-500" />
          <ArrowRight className="w-3.5 h-3.5 text-purple-400" />
        </div>
      </div>

      {/* To */}
      <div className="flex items-center gap-2 flex-1 min-w-0 justify-end text-right">
        <div className="min-w-0">
          <p className="text-xs text-gray-500">Người nhận</p>
          <p className="text-sm font-semibold text-white truncate">{to.name}</p>
        </div>
        <Avatar member={to} size="sm" />
      </div>

      {/* Pay button */}
      {onMark && (
        <button
          onClick={() => onMark(settlement)}
          className="ml-2 flex items-center gap-1.5 px-3 py-1.5 rounded-lg opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-all duration-200 text-xs font-medium text-blue-400 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20"
        >
          <Wallet className="w-3.5 h-3.5" />
          {markLabel}
        </button>
      )}
    </motion.div>
  );
}

export default function SettlementList({ settlements, onMark, markLabel }) {
  if (settlements.length === 0) {
    return (
      <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="glass-card p-12 flex flex-col items-center gap-5 text-center border-dashed border-2 border-emerald-500/10 bg-emerald-500/5">
        <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 shadow-[0_0_30px_rgba(16,185,129,0.2)]">
          <Wallet className="w-8 h-8 text-emerald-400" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-emerald-400 mb-1">Tất cả đã cân bằng!</h2>
          <p className="text-gray-400 text-sm max-w-sm mx-auto">Không có khoản nợ nào cần thanh toán giữa các thành viên.</p>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="space-y-2">
      {settlements.map((s, i) => (
        <SettlementItem
          key={`${s.from}-${s.to}`}
          settlement={s}
          index={i}
          onMark={onMark}
          markLabel={markLabel}
        />
      ))}
    </div>
  );
}
