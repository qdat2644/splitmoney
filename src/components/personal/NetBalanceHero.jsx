// NetBalanceHero.jsx — Big hero card showing net financial position
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';

export default function NetBalanceHero({ netBalance, totalIOwe, totalOwedToMe }) {
  const isPositive = netBalance > 500;
  const isNegative = netBalance < -500;

  const config = isPositive
    ? { icon: TrendingUp,   label: 'Người khác đang nợ bạn', grad: 'from-emerald-500/20 to-teal-500/10',    border: 'border-emerald-500/30', text: 'text-emerald-400', iconBg: 'bg-emerald-500/20' }
    : isNegative
    ? { icon: TrendingDown, label: 'Bạn đang nợ người khác',  grad: 'from-red-500/20 to-rose-500/10',        border: 'border-red-500/30',     text: 'text-red-400',     iconBg: 'bg-red-500/20' }
    : { icon: Minus,        label: 'Số dư cân bằng',          grad: 'from-white/5 to-white/3',               border: 'border-white/10',       text: 'text-gray-300',    iconBg: 'bg-white/10' };

  const { icon: Icon } = config;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', stiffness: 280, damping: 24 }}
      className={`relative overflow-hidden rounded-2xl border ${config.border} bg-gradient-to-br ${config.grad} p-6`}
    >
      {/* Decorative glow */}
      <div className={`absolute -top-8 -right-8 w-40 h-40 rounded-full opacity-20 blur-3xl ${isPositive ? 'bg-emerald-500' : isNegative ? 'bg-red-500' : 'bg-white'}`} />

      <div className="relative flex items-start justify-between gap-4">
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-widest mb-2">Số dư tổng</p>
          <p className={`text-4xl font-extrabold tracking-tight ${config.text}`}>
            {isPositive ? '+' : ''}{formatCurrency(netBalance, true)}
          </p>
          <p className="text-sm text-gray-400 mt-2">{config.label}</p>
        </div>
        <div className={`w-12 h-12 rounded-2xl ${config.iconBg} flex items-center justify-center shrink-0`}>
          <Icon className={`w-6 h-6 ${config.text}`} />
        </div>
      </div>

      {/* Sub breakdown */}
      <div className="mt-5 pt-4 border-t border-white/5 grid grid-cols-2 gap-4">
        <div>
          <p className="text-[10px] text-gray-600 uppercase tracking-wider">Tôi đang nợ</p>
          <p className="text-base font-bold text-red-400 mt-0.5">{formatCurrency(totalIOwe, true)}</p>
        </div>
        <div>
          <p className="text-[10px] text-gray-600 uppercase tracking-wider">Đang được nợ</p>
          <p className="text-base font-bold text-emerald-400 mt-0.5">{formatCurrency(totalOwedToMe, true)}</p>
        </div>
      </div>
    </motion.div>
  );
}
