// SummaryCard.jsx — Rebuilt to represent a flat workspace element.
import { motion } from 'framer-motion';

export default function SummaryCard({ label, value, icon: Icon, color = 'blue', index = 0 }) {
  const colorMap = {
    blue:    { text: 'text-blue-400' },
    emerald: { text: 'text-emerald-400' },
    red:     { text: 'text-red-400' },
    purple:  { text: 'text-purple-400' },
  };
  const c = colorMap[color] || colorMap.blue;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, type: 'spring', stiffness: 300, damping: 25 }}
      className="glass-card p-4 flex flex-col justify-between gap-3 bg-dark-800 border border-white/5"
    >
      <div className="w-8 h-8 rounded bg-dark-900 border border-white/5 flex items-center justify-center">
        <Icon className={`w-4 h-4 ${c.text}`} />
      </div>
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 mb-0.5">{label}</p>
        <p className="text-base font-bold text-white tracking-tight">{value}</p>
      </div>
    </motion.div>
  );
}
