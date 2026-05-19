import { AlertTriangle, ArrowRight, CircleAlert, Info, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { formatCurrencyText } from '../../utils/formatters';
import AppButton from '../ui/AppButton';

const severityStyle = {
  critical: {
    icon: CircleAlert,
    badge: 'text-red-300 bg-red-500/10',
    border: 'border-red-500/20',
  },
  warning: {
    icon: AlertTriangle,
    badge: 'text-amber-300 bg-amber-500/10',
    border: 'border-amber-500/20',
  },
  info: {
    icon: Info,
    badge: 'text-blue-300 bg-blue-500/10',
    border: 'border-blue-500/20',
  },
};
const severityLabels = {
  critical: 'Cần chú ý',
  warning: 'Cần chú ý',
  info: 'Gợi ý',
};
const personalityLabels = {
  gentle_warning: 'Cần chú ý',
  supportive_guidance: 'Gợi ý',
  positive_reinforcement: 'Ổn định',
  opportunity_suggestion: 'Cơ hội',
};
const actionLabels = {
  open_budget: 'Xem ngân sách',
  open_analytics: 'Xem phân tích',
  review_settlements: 'Xem thanh toán',
  open_forecasts: 'Xem dự báo',
  create_budget: 'Tạo ngân sách',
  create_recurring_budget: 'Tạo ngân sách',
};

export default function RecommendationCard({ recommendation, compact = false }) {
  const navigate = useNavigate();
  const style = severityStyle[recommendation.severity] ?? severityStyle.info;
  const Icon = style.icon;
  const label = personalityLabels[recommendation.personality] ?? severityLabels[recommendation.severity] ?? severityLabels.info;
  const title = formatCurrencyText(recommendation.title);
  const description = formatCurrencyText(recommendation.description);
  const evidence = (recommendation.evidence ?? []).map((item) => formatCurrencyText(item));

  return (
    <article className={`rounded-xl border bg-white/3 p-4 transition-colors hover:bg-white/[0.04] ${style.border}`}>
      <div className="flex items-start gap-3">
        <Icon className="mt-0.5 h-4 w-4 shrink-0 text-gray-300" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold text-white">{title}</h3>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${style.badge}`}>
              {label}
            </span>
            <span className="text-[10px] text-gray-500">{Math.round(recommendation.confidence * 100)}%</span>
          </div>
          <p className="mt-1 text-sm text-gray-400">{description}</p>
          {!compact && evidence.length > 0 && (
            <div className="mt-3">
              <p className="flex items-center gap-1 text-[11px] font-medium text-gray-500">
                <Sparkles className="h-3 w-3" />
                Cơ sở gợi ý
              </p>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {evidence.map((item) => (
                  <span key={item} className="rounded-full bg-white/5 px-2 py-1 text-[11px] text-gray-400">
                    {item}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      {recommendation.action && (
        <div className="mt-4 flex justify-end">
          <AppButton
            size="sm"
            variant="secondary"
            icon={ArrowRight}
            onClick={() => navigate(recommendation.action.to)}
          >
            {actionLabels[recommendation.action.type] ?? recommendation.action.label}
          </AppButton>
        </div>
      )}
    </article>
  );
}
