// NetBalanceHero.jsx - Calm narrative hero for personal finance status
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';

export default function NetBalanceHero({ netBalance, totalIOwe, totalOwedToMe, eyebrow, headline, guidance }) {
  const isPositive = netBalance > 500;
  const isNegative = netBalance < -500;

  const config = isPositive
    ? { icon: TrendingUp, label: 'Bạn đang có dư nợ ròng', border: 'border-emerald-500/10', bg: 'bg-emerald-950/10', text: 'text-emerald-400', iconBg: 'bg-emerald-500/10' }
    : isNegative
      ? { icon: TrendingDown, label: 'Bạn đang có nợ ròng', border: 'border-red-500/10', bg: 'bg-red-950/10', text: 'text-red-400', iconBg: 'bg-red-500/10' }
      : { icon: Minus, label: 'Số dư cân bằng', border: 'border-white/5', bg: 'bg-dark-800', text: 'text-gray-300', iconBg: 'bg-white/5' };

  const { icon: Icon } = config;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.99 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', stiffness: 280, damping: 24 }}
      className={`relative overflow-hidden rounded-xl border ${config.border} ${config.bg} p-5`}
    >
      <div className="relative flex items-start justify-between gap-4">
        <div className="space-y-1.5">
          <p className="text-[11px] font-medium text-gray-500">{eyebrow || 'Số dư tổng quan'}</p>
          {headline && <h2 className="max-w-xl text-lg font-semibold leading-snug text-white">{headline}</h2>}
          <p className={`text-2xl font-bold tracking-tight ${config.text}`}>
            {isPositive ? '+' : ''}{formatCurrency(netBalance, true)}
          </p>
          <p className="text-xs font-medium text-gray-400">{guidance || config.label}</p>
        </div>
        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded border ${config.border} ${config.iconBg}`}>
          <Icon className={`h-4 w-4 ${config.text}`} />
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4 border-t border-white/5 pt-4">
        <div>
          <p className="text-[10px] font-medium text-gray-500">Bạn nợ người khác</p>
          <p className="mt-0.5 text-sm font-bold text-red-400">{formatCurrency(totalIOwe, true)}</p>
        </div>
        <div>
          <p className="text-[10px] font-medium text-gray-500">Người khác nợ bạn</p>
          <p className="mt-0.5 text-sm font-bold text-emerald-400">{formatCurrency(totalOwedToMe, true)}</p>
        </div>
      </div>
    </motion.div>
  );
}
