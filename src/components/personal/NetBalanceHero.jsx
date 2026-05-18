// NetBalanceHero.jsx — Big hero card showing net financial position
// Rebuilt to follow modern calm, minimal, SaaS workspace standards.
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';

export default function NetBalanceHero({ netBalance, totalIOwe, totalOwedToMe }) {
  const isPositive = netBalance > 500;
  const isNegative = netBalance < -500;

  const config = isPositive
    ? { icon: TrendingUp,   label: 'Bạn đang có dư nợ ròng', border: 'border-emerald-500/10', bg: 'bg-emerald-950/10', text: 'text-emerald-400', iconBg: 'bg-emerald-500/10' }
    : isNegative
    ? { icon: TrendingDown, label: 'Bạn đang có nợ ròng',    border: 'border-red-500/10',     bg: 'bg-red-950/10',     text: 'text-red-400',     iconBg: 'bg-red-500/10' }
    : { icon: Minus,        label: 'Số dư cân bằng',          border: 'border-white/5',        bg: 'bg-dark-800',       text: 'text-gray-300',    iconBg: 'bg-white/5' };

  const { icon: Icon } = config;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.99 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', stiffness: 280, damping: 24 }}
      className={`relative overflow-hidden rounded-xl border ${config.border} ${config.bg} p-5`}
    >
      <div className="relative flex items-start justify-between gap-4">
        <div className="space-y-1">
          <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Số dư tổng quan</p>
          <p className={`text-2xl font-bold tracking-tight ${config.text}`}>
            {isPositive ? '+' : ''}{formatCurrency(netBalance, true)}
          </p>
          <p className="text-xs text-gray-400 font-medium">{config.label}</p>
        </div>
        <div className={`w-9 h-9 rounded flex items-center justify-center shrink-0 border ${config.border} ${config.iconBg}`}>
          <Icon className={`w-4 h-4 ${config.text}`} />
        </div>
      </div>

      {/* Sub breakdown */}
      <div className="mt-4 pt-4 border-t border-white/5 grid grid-cols-2 gap-4">
        <div>
          <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Bạn nợ người khác</p>
          <p className="text-sm font-bold text-red-400 mt-0.5">{formatCurrency(totalIOwe, true)}</p>
        </div>
        <div>
          <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Người khác nợ bạn</p>
          <p className="text-sm font-bold text-emerald-400 mt-0.5">{formatCurrency(totalOwedToMe, true)}</p>
        </div>
      </div>
    </motion.div>
  );
}
