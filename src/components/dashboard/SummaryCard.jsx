// SummaryCard.jsx — Stats card for dashboard
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown } from 'lucide-react';

export default function SummaryCard({ icon: Icon, label, value, subtext, trend, colorClass = 'text-blue-400', bgClass = 'bg-blue-500/10', index = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.07, type: 'spring', stiffness: 300, damping: 25 }}
      className="glass-card-hover p-5 relative overflow-hidden"
    >
      {/* Glow blob */}
      <div className={`absolute -top-4 -right-4 w-20 h-20 rounded-full ${bgClass} blur-2xl opacity-60`} />

      <div className="relative z-10">
        <div className={`inline-flex p-2 rounded-xl ${bgClass} mb-4`}>
          <Icon className={`w-5 h-5 ${colorClass}`} />
        </div>

        <p className="stat-label mb-1">{label}</p>
        <p className="stat-value mb-1">{value}</p>

        {subtext && (
          <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
            {trend === 'up' && <TrendingUp className="w-3 h-3 text-emerald-400" />}
            {trend === 'down' && <TrendingDown className="w-3 h-3 text-red-400" />}
            {subtext}
          </p>
        )}
      </div>
    </motion.div>
  );
}
