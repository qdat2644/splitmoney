import { ArrowRight, Bot, Brain, CalendarRange, RefreshCw, Sparkles, TrendingUp, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useCopilotWorkspace } from '../hooks/useCopilotWorkspace';
import RecommendationCard from '../components/copilot/RecommendationCard';
import AppButton from '../components/ui/AppButton';
import AppCard from '../components/ui/AppCard';
import PageHeader from '../components/ui/PageHeader';
import { formatCurrency } from '../utils/formatters';

const severityRank = { critical: 0, warning: 1, info: 2 };
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
  const topPriorities = [...(data?.recommendations ?? [])]
    .sort((a, b) => (severityRank[a.severity] ?? 9) - (severityRank[b.severity] ?? 9) || b.confidence - a.confidence)
    .slice(0, 4);
  const debtRecommendation = data?.recommendations?.find((item) => item.type === 'debt_attention');

  return (
    <main className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        eyebrow="Trợ lý AI"
        title="Bảng điều khiển tài chính"
        subtitle="Một lớp điều phối gọn hơn cho ưu tiên, dự báo, cơ hội và tín hiệu nhóm."
        actions={<AppButton variant="secondary" icon={RefreshCw} onClick={refetch}>Làm mới</AppButton>}
      />

      {loading && <CopilotSkeleton />}
      {!loading && error && <AppCard className="p-5 text-sm text-red-300">{error}</AppCard>}

      {!loading && data && (
        <>
          <section className="grid gap-4 lg:grid-cols-[minmax(0,1.45fr)_minmax(18rem,0.55fr)]">
            <AppCard className="border border-white/5 bg-dark-800 p-5">
              <div className="mb-4 flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <Bot className="h-4 w-4 text-purple-300" />
                    <h2 className="text-sm font-semibold text-white">Ưu tiên hàng đầu</h2>
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-gray-500">
                    Các tín hiệu có độ nghiêm trọng và độ tin cậy cao nhất ở thời điểm hiện tại.
                  </p>
                </div>
              </div>
              <div className="space-y-3">
                {topPriorities.length === 0 ? (
                  <p className="text-sm text-gray-400">
                    Chưa có việc cần chú ý ngay. Tình hình hiện tại đang khá ổn định.
                  </p>
                ) : (
                  topPriorities.map((recommendation) => (
                    <RecommendationCard key={recommendation.id} recommendation={recommendation} />
                  ))
                )}
              </div>
            </AppCard>

            <div className="space-y-4">
              <ForecastSnapshot data={data} />
              <FinancialMemory data={data} />
            </div>
          </section>

          <section className="grid gap-4 lg:grid-cols-3">
            <AppCard className="border border-white/5 bg-dark-800 p-5 lg:col-span-2">
              <div className="mb-4 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-emerald-300" />
                <div>
                  <h2 className="text-sm font-semibold text-white">Cơ hội thông minh</h2>
                  <p className="mt-1 text-xs text-gray-500">Điểm tối ưu và khoản lặp có thể hành động ngay.</p>
                </div>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                {data.opportunities.length === 0 ? (
                  <p className="text-sm text-gray-400 md:col-span-2">
                    Chưa có cơ hội rõ ràng. Zyra sẽ tiếp tục quan sát thêm dữ liệu trước khi đề xuất.
                  </p>
                ) : (
                  data.opportunities.map((recommendation) => (
                    <RecommendationCard key={recommendation.id} recommendation={recommendation} compact />
                  ))
                )}
              </div>
            </AppCard>

            <PlanningIntelligence data={data} onOpenPlans={() => navigate('/plans')} />
          </section>

          <section className="grid gap-4 lg:grid-cols-2">
            <RoomIntelligence data={data} debtRecommendation={debtRecommendation} />
            <AppCard className="border border-white/5 bg-dark-800 p-5">
              <div className="mb-4 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-blue-300" />
                <div>
                  <h2 className="text-sm font-semibold text-white">Nhịp tài chính</h2>
                  <p className="mt-1 text-xs text-gray-500">Cách tháng này đang diễn ra theo quỹ đạo hiện tại.</p>
                </div>
              </div>
              <div className="space-y-3">
                <Metric label="Chi mỗi ngày" value={formatCurrency(data.forecastSnapshot.spendingVelocity.dailyAverage || 0, true)} />
                <Metric label="Ngày đã qua" value={`${data.forecastSnapshot.spendingVelocity.daysElapsed || 0}/${data.forecastSnapshot.spendingVelocity.daysInMonth || 0}`} />
                <Metric label="Ngân sách có rủi ro" value={`${data.forecastSnapshot.budgetHealth.atRiskCount ?? 0}`} />
              </div>
            </AppCard>
          </section>
        </>
      )}
    </main>
  );
}

function CopilotSkeleton() {
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1.45fr)_minmax(18rem,0.55fr)]">
      <AppCard className="space-y-3 p-5">
        <div className="h-4 w-40 animate-pulse rounded bg-white/5" />
        {[0, 1, 2].map((item) => <div key={item} className="h-24 animate-pulse rounded-xl bg-white/5" />)}
      </AppCard>
      <div className="space-y-4">
        {[0, 1].map((item) => <AppCard key={item} className="h-36 animate-pulse" />)}
      </div>
    </div>
  );
}

function ForecastSnapshot({ data }) {
  return (
    <AppCard className="border border-white/5 bg-dark-800 p-5">
      <div className="mb-4 flex items-center gap-2">
        <TrendingUp className="h-4 w-4 text-blue-300" />
        <div>
          <h2 className="text-sm font-semibold text-white">Dự báo</h2>
          <p className="mt-1 text-xs text-gray-500">Tổng quan quỹ đạo cuối tháng.</p>
        </div>
      </div>
      <div className="space-y-3">
        <Metric label="Cuối tháng" value={formatCurrency(data.forecastSnapshot.forecastMonthTotal, true)} />
        <Metric label="Độ tin cậy" value={`${Math.round((data.forecastSnapshot.confidence || 0) * 100)}%`} />
        <Metric label="Xu hướng nợ" value={formatMappedValue(debtDirectionLabels, data.forecastSnapshot.debtHealth.direction)} />
      </div>
    </AppCard>
  );
}

function FinancialMemory({ data }) {
  return (
    <AppCard className="border border-white/5 bg-dark-800 p-5">
      <div className="mb-4 flex items-center gap-2">
        <Brain className="h-4 w-4 text-cyan-300" />
        <div>
          <h2 className="text-sm font-semibold text-white">Hồ sơ tài chính</h2>
          <p className="mt-1 text-xs text-gray-500">Những điều Zyra đang ghi nhớ về bạn.</p>
        </div>
      </div>
      <div className="space-y-3 text-sm">
        <Metric label="Phong cách" value={formatMappedValue(spendingStyleLabels, data.financialMemory.spendingStyle?.type)} />
        <Metric label="Biến động" value={formatMappedValue(volatilityLabels, data.financialMemory.volatility?.level)} />
        <Metric label="Kỷ luật" value={formatMappedValue(budgetDisciplineLabels, data.financialMemory.budgetDiscipline?.level)} />
        <Metric label="Danh mục nổi bật" value={formatCategoryList(data.financialMemory.topCategories)} />
      </div>
    </AppCard>
  );
}

function PlanningIntelligence({ data, onOpenPlans }) {
  return (
    <AppCard className="border border-white/5 bg-dark-800 p-5">
      <div className="mb-4 flex items-center gap-2">
        <CalendarRange className="h-4 w-4 text-amber-300" />
        <div>
          <h2 className="text-sm font-semibold text-white">Kế hoạch</h2>
          <p className="mt-1 text-xs text-gray-500">Những cam kết tài chính đang mở.</p>
        </div>
      </div>
      <div className="space-y-3">
        {data.planningIntelligence.activePlans.length === 0 ? (
          <p className="text-sm text-gray-400">
            Chưa có kế hoạch nào. Bạn có thể tạo một chuyến đi hoặc ngân sách nhóm mới.
          </p>
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
        <AppButton variant="secondary" icon={ArrowRight} onClick={onOpenPlans}>
          Mở kế hoạch
        </AppButton>
      </div>
    </AppCard>
  );
}

function RoomIntelligence({ data, debtRecommendation }) {
  const activePlans = data.planningIntelligence.activePlans.length;
  const debtDirection = formatMappedValue(debtDirectionLabels, data.forecastSnapshot.debtHealth.direction);

  return (
    <AppCard className="border border-white/5 bg-dark-800 p-5">
      <div className="mb-4 flex items-center gap-2">
        <Users className="h-4 w-4 text-purple-300" />
        <div>
          <h2 className="text-sm font-semibold text-white">Tín hiệu nhóm</h2>
          <p className="mt-1 text-xs text-gray-500">Các dấu hiệu liên quan đến tài chính chia sẻ.</p>
        </div>
      </div>
      <div className="space-y-3">
        <Metric label="Kế hoạch đang hoạt động" value={`${activePlans}`} />
        <Metric label="Xu hướng công nợ" value={debtDirection} />
        <p className="rounded-lg bg-white/3 px-3 py-2 text-sm leading-relaxed text-gray-400">
          {debtRecommendation?.description || 'Chưa có cảnh báo công nợ nổi bật giữa các nhóm.'}
        </p>
      </div>
    </AppCard>
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
