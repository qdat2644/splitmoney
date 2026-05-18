// SummaryCard.jsx — Rebuilt to represent a flat workspace element.
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown } from 'lucide-react';

export default function SummaryCard({ 
  icon: Icon, 
  label, 
  value, 
  subtext, 
  trend, 
  colorClass = 'text-blue-400', 
  index = 0 
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, type: 'spring', stiffness: 300, damping: 25 }}
      className="glass-card p-4 flex flex-col justify-between gap-3 bg-dark-800 border border-white/5"
    >
      <div className="w-8 h-8 rounded bg-dark-900 border border-white/5 flex items-center justify-center">
        <Icon className={`w-4 h-4 ${colorClass}`} />
      </div>

      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 mb-0.5">{label}</p>
        <p className="text-base font-bold text-white tracking-tight">{value}</p>

        {subtext && (
          <p className="text-[10px] text-gray-500/80 mt-1 font-medium flex items-center gap-1">
            {trend === 'up' && <TrendingUp className="w-3 h-3 text-emerald-400" />}
            {trend === 'down' && <TrendingDown className="w-3 h-3 text-red-400" />}
            {subtext}
          </p>
        )}
      </div>
    </motion.div>
  );
}
