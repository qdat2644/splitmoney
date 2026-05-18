import { ArrowRight, Bot, Brain, CalendarRange, RefreshCw, Sparkles, TrendingUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useCopilotWorkspace } from '../hooks/useCopilotWorkspace';
import RecommendationCard from '../components/copilot/RecommendationCard';
import AppButton from '../components/ui/AppButton';
import AppCard from '../components/ui/AppCard';
import PageHeader from '../components/ui/PageHeader';
import { formatCurrency } from '../utils/formatters';

const severityOrder = ['critical', 'warning', 'info'];
const severityLabels = {
  critical: 'Khẩn cấp',
  warning: 'Cảnh báo',
  info: 'Thông tin',
};
const debtDirectionLabels = {
  improving: 'đang cải thiện',
  worsening: 'đang xấu đi',
  stable: 'ổn định',
};
const spendingStyleLabels = {
  frugal: 'tiết chế',
  balanced: 'cân bằng',
  comfort: 'thoải mái',
};
const volatilityLabels = {
  low: 'thấp',
  moderate: 'vừa',
  high: 'cao',
};
const budgetDisciplineLabels = {
  low: 'thấp',
  medium: 'vừa',
  high: 'cao',
};
const categoryLabels = {
  food: 'ăn uống',
  drinks: 'đồ uống',
  transport: 'di chuyển',
  housing: 'lưu trú',
  accommodation: 'lưu trú',
  entertainment: 'giải trí',
  shopping: 'mua sắm',
  other: 'khác',
};

export default function AICopilotPage() {
  const navigate = useNavigate();
  const { data, loading, error, refetch } = useCopilotWorkspace();
  const grouped = Object.fromEntries(severityOrder.map((severity) => [
    severity,
    data?.recommendations?.filter((item) => item.severity === severity) ?? [],
  ]));

  return (
    <main className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        eyebrow="AI"
        title="Trợ lý tài chính"
        subtitle="Gợi ý được xếp hạng từ chi tiêu, ngân sách, công nợ và kế hoạch thực tế của bạn."
        actions={<AppButton variant="secondary" icon={RefreshCw} onClick={refetch}>Làm mới</AppButton>}
      />

      {loading && <AppCard className="h-36 animate-pulse" />}
      {!loading && error && <AppCard className="p-5 text-sm text-red-300">{error}</AppCard>}

      {!loading && data && (
        <>
          <section className="grid gap-4 lg:grid-cols-[1.35fr_0.65fr]">
            <AppCard className="p-5">
              <div className="mb-4 flex items-center gap-2">
                <Bot className="h-4 w-4 text-purple-300" />
                <h2 className="text-sm font-semibold text-white">Ưu tiên</h2>
              </div>
              <div className="space-y-4">
                {severityOrder.map((severity) => grouped[severity].length > 0 && (
                  <div key={severity} className="space-y-2">
                    <p className="text-[11px] font-medium text-gray-500">{severityLabels[severity]}</p>
                    {grouped[severity].map((recommendation) => (
                      <RecommendationCard key={recommendation.id} recommendation={recommendation} />
                    ))}
                  </div>
                ))}
                {data.recommendations.length === 0 && (
                  <p className="text-sm text-gray-500">Hiện chưa có gợi ý đáng chú ý.</p>
                )}
              </div>
            </AppCard>

            <div className="space-y-4">
              <AppCard className="p-5">
                <div className="mb-4 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-blue-300" />
                  <h2 className="text-sm font-semibold text-white">Tóm tắt dự báo</h2>
                </div>
                <div className="space-y-3">
                  <Metric label="Dự báo cuối tháng" value={formatCurrency(data.forecastSnapshot.forecastMonthTotal, true)} />
                  <Metric label="Độ tin cậy" value={`${Math.round((data.forecastSnapshot.confidence || 0) * 100)}%`} />
                  <Metric label="Nhịp chi mỗi ngày" value={formatCurrency(data.forecastSnapshot.spendingVelocity.dailyAverage || 0, true)} />
                  <Metric label="Ngân sách có rủi ro" value={`${data.forecastSnapshot.budgetHealth.atRiskCount ?? 0}`} />
                  <Metric label="Xu hướng nợ" value={formatMappedValue(debtDirectionLabels, data.forecastSnapshot.debtHealth.direction)} />
                </div>
              </AppCard>

              <AppCard className="p-5">
                <div className="mb-4 flex items-center gap-2">
                  <Brain className="h-4 w-4 text-cyan-300" />
                  <h2 className="text-sm font-semibold text-white">Ghi nhớ tài chính</h2>
                </div>
                <div className="space-y-3 text-sm">
                  <Metric label="Phong cách chi tiêu" value={formatMappedValue(spendingStyleLabels, data.financialMemory.spendingStyle?.type)} />
                  <Metric label="Biến động" value={formatMappedValue(volatilityLabels, data.financialMemory.volatility?.level)} />
                  <Metric label="Kỷ luật ngân sách" value={formatMappedValue(budgetDisciplineLabels, data.financialMemory.budgetDiscipline?.level)} />
                  <Metric label="Danh mục nổi bật" value={formatCategoryList(data.financialMemory.topCategories)} />
                </div>
              </AppCard>
            </div>
          </section>

          <section className="grid gap-4 lg:grid-cols-2">
            <AppCard className="p-5">
              <div className="mb-4 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-emerald-300" />
                <h2 className="text-sm font-semibold text-white">Cơ hội tối ưu</h2>
              </div>
              <div className="space-y-2">
                {data.opportunities.length === 0 ? (
                  <p className="text-sm text-gray-500">Chưa có cơ hội tiết kiệm đủ rõ ràng.</p>
                ) : (
                  data.opportunities.map((recommendation) => (
                    <RecommendationCard key={recommendation.id} recommendation={recommendation} compact />
                  ))
                )}
              </div>
            </AppCard>

            <AppCard className="p-5">
              <div className="mb-4 flex items-center gap-2">
                <CalendarRange className="h-4 w-4 text-amber-300" />
                <h2 className="text-sm font-semibold text-white">Kế hoạch</h2>
              </div>
              <div className="space-y-3">
                {data.planningIntelligence.activePlans.length === 0 ? (
                  <p className="text-sm text-gray-500">Hiện chưa có kế hoạch đang hoạt động.</p>
                ) : (
                  data.planningIntelligence.activePlans.map((plan) => (
                    <div key={plan.id} className="rounded-xl border border-white/5 bg-white/3 p-3">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-medium text-white">{plan.name}</p>
                        <span className="text-xs text-blue-300">{formatCurrency(plan.estimatedTotal || 0, true)}</span>
                      </div>
                      <p className="mt-1 text-xs text-gray-500">{plan.convertedItems}/{plan.itemCount} mục đã chuyển đổi</p>
                    </div>
                  ))
                )}
                <AppButton variant="secondary" icon={ArrowRight} onClick={() => navigate('/plans')}>
                  Mở kế hoạch
                </AppButton>
              </div>
            </AppCard>
          </section>
        </>
      )}
    </main>
  );
}

function Metric({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-xs text-gray-500">{label}</span>
      <span className="text-sm font-medium text-white">{value}</span>
    </div>
  );
}

function formatMappedValue(labels, value) {
  return labels[value] ?? 'chưa rõ';
}

function formatCategoryList(categories = []) {
  return categories.map((category) => categoryLabels[category] ?? category).join(', ') || 'chưa có';
}
