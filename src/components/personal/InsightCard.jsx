// InsightCard.jsx — Single AI insight card with severity styling
import { motion } from 'framer-motion';
import {
  AlertTriangle, CheckCircle2, Info,
  TrendingUp, TrendingDown, Lightbulb, CreditCard
} from 'lucide-react';
import { formatCurrencyText } from '../../utils/formatters';

const TYPE_ICON = {
  spending:   CreditCard,
  debt:       TrendingDown,
  trend:      TrendingUp,
  suggestion: Lightbulb,
  positive:   CheckCircle2,
  warning:    AlertTriangle,
  improvement: CheckCircle2,
  worsening: AlertTriangle,
  recurring_rhythm: TrendingUp,
  stabilization: CheckCircle2,
  anomaly_shift: AlertTriangle,
  habit_reinforcement: CheckCircle2,
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

const TEMPORAL_LABELS = {
  improvement: 'So với trước',
  worsening: 'Tăng dần',
  recurring_rhythm: 'Theo chu kỳ',
  stabilization: 'Ổn định hơn',
  anomaly_shift: 'Có thay đổi',
  habit_reinforcement: 'Duy trì tốt',
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
        <p className="text-sm font-semibold text-white leading-tight">{formatCurrencyText(insight.title)}</p>
        <p className="text-xs text-gray-400 mt-1 leading-relaxed">{formatCurrencyText(insight.message)}</p>
      </div>

      <div className="flex shrink-0 flex-col items-end gap-1">
        {TEMPORAL_LABELS[insight.type] && (
          <div className={`h-fit rounded-full px-2 py-0.5 text-[10px] font-medium ${style.badge}`}>
            {TEMPORAL_LABELS[insight.type]}
          </div>
        )}
        {insight.confidence >= 0.85 && (
          <div className={`h-fit rounded-full px-2 py-0.5 text-[10px] font-medium ${style.badge}`}>
            {Math.round(insight.confidence * 100)}%
          </div>
        )}
      </div>
    </motion.div>
  );
}
