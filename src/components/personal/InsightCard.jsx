// InsightCard.jsx — Single AI insight card with severity styling
import { motion } from 'framer-motion';
import {
  AlertTriangle, CheckCircle2, Info,
  TrendingUp, TrendingDown, Lightbulb, CreditCard
} from 'lucide-react';

const TYPE_ICON = {
  spending:   CreditCard,
  debt:       TrendingDown,
  trend:      TrendingUp,
  suggestion: Lightbulb,
  positive:   CheckCircle2,
  warning:    AlertTriangle,
};

const SEVERITY_STYLE = {
  positive: {
    border:  'border-emerald-500/25',
    bg:      'bg-emerald-500/10',
    icon:    'text-emerald-400',
    iconBg:  'bg-emerald-500/15',
    badge:   'bg-emerald-500/15 text-emerald-400',
  },
  warning: {
    border:  'border-amber-500/25',
    bg:      'bg-amber-500/10',
    icon:    'text-amber-400',
    iconBg:  'bg-amber-500/15',
    badge:   'bg-amber-500/15 text-amber-400',
  },
  info: {
    border:  'border-blue-500/20',
    bg:      'bg-blue-500/10',
    icon:    'text-blue-400',
    iconBg:  'bg-blue-500/10',
    badge:   'bg-blue-500/15 text-blue-400',
  },
};

export default function InsightCard({ insight, index }) {
  const style = SEVERITY_STYLE[insight.severity] || SEVERITY_STYLE.info;
  const Icon = TYPE_ICON[insight.type] || Info;

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.07, type: 'spring', stiffness: 300, damping: 26 }}
      className={`flex gap-3 p-4 rounded-xl border ${style.border} ${style.bg}`}
    >
      {/* Icon */}
      <div className={`w-8 h-8 rounded-lg ${style.iconBg} flex items-center justify-center shrink-0 mt-0.5`}>
        <Icon className={`w-4 h-4 ${style.icon}`} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-white leading-tight">{insight.title}</p>
        <p className="text-xs text-gray-400 mt-1 leading-relaxed">{insight.message}</p>
      </div>

      {/* Confidence badge — only show if AI-generated and high confidence */}
      {insight.confidence >= 0.85 && (
        <div className={`text-[10px] px-2 py-0.5 rounded-full h-fit shrink-0 font-medium ${style.badge}`}>
          {Math.round(insight.confidence * 100)}%
        </div>
      )}
    </motion.div>
  );
}
