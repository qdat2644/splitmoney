// SummaryCard.jsx — A single metric card for the hero stats row
import { motion } from 'framer-motion';

export default function SummaryCard({ label, value, icon: Icon, color = 'blue', index = 0 }) {
  const colorMap = {
    blue:    { text: 'text-blue-400',    bg: 'bg-blue-500/10',    border: 'border-blue-500/20' },
    emerald: { text: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
    red:     { text: 'text-red-400',     bg: 'bg-red-500/10',     border: 'border-red-500/20' },
    purple:  { text: 'text-purple-400',  bg: 'bg-purple-500/10',  border: 'border-purple-500/20' },
  };
  const c = colorMap[color] || colorMap.blue;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, type: 'spring', stiffness: 300, damping: 25 }}
      className={`glass-card p-5 border ${c.border} flex flex-col gap-3`}
    >
      <div className={`w-9 h-9 rounded-xl ${c.bg} flex items-center justify-center`}>
        <Icon className={`w-5 h-5 ${c.text}`} />
      </div>
      <div>
        <p className="text-xs text-gray-500 mb-0.5">{label}</p>
        <p className={`text-xl font-bold ${c.text}`}>{value}</p>
      </div>
    </motion.div>
  );
}
