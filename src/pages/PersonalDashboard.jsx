// PersonalDashboard.jsx - Standalone personal finance overview
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  ArrowRight,
  Bot,
  CalendarDays,
  DoorOpen,
  PiggyBank,
  Plus,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useDashboardSummary } from '../hooks/useDashboardSummary';
import { useBudgets } from '../hooks/useBudgets';
import { useCopilotWorkspace } from '../hooks/useCopilotWorkspace';
import { formatCurrency } from '../utils/formatters';
import { exportApi } from '../services/apiClient';

import NetBalanceHero from '../components/personal/NetBalanceHero';
import SummaryCard from '../components/personal/SummaryCard';
import CategoryBreakdown from '../components/personal/CategoryBreakdown';
import RoomBreakdownList from '../components/personal/RoomBreakdownList';
import RecentExpensesList from '../components/personal/RecentExpensesList';
import MonthlyTrendChart from '../components/personal/MonthlyTrendChart';
import DashboardSkeleton from '../components/personal/DashboardSkeleton';
import InsightsSection from '../components/personal/InsightsSection';
import BudgetStatusCard from '../components/personal/BudgetStatusCard';
import MonthlyComparisonCard from '../components/personal/MonthlyComparisonCard';
import ExportButton from '../components/ui/ExportButton';
import PageHeader from '../components/ui/PageHeader';
import EmptyState from '../components/ui/EmptyState';
import AppButton from '../components/ui/AppButton';
import AppCard from '../components/ui/AppCard';
import AnalyticsDashboard from '../components/personal/AnalyticsDashboard';
import RecommendationCard from '../components/copilot/RecommendationCard';

const severityRank = { critical: 0, warning: 1, info: 2 };
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
const memoryLabels = {
  frugal: 'tiết chế',
  balanced: 'cân bằng',
  comfort: 'thoải mái',
  low: 'thấp',
  moderate: 'vừa',
  medium: 'vừa',
  high: 'cao',
};

export default function PersonalDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data, loading, error, refetch } = useDashboardSummary();
  const { status: budgetStatus } = useBudgets();
  const { data: copilotData } = useCopilotWorkspace();

  const topPriorities = [...(copilotData?.recommendations ?? [])]
    .sort((a, b) => (severityRank[a.severity] ?? 9) - (severityRank[b.severity] ?? 9) || b.confidence - a.confidence)
    .slice(0, 4);
  const topOpportunities = (copilotData?.opportunities ?? []).slice(0, 2);
  const narrative = buildPersonalNarrative({ data, copilotData, budgetStatus });

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Chào buổi sáng';
    if (hour < 18) return 'Chào buổi chiều';
    return 'Chào buổi tối';
  };

  return (
    <main className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        eyebrow={`${greeting()},`}
        title={user?.name}
        actions={
          <ExportButton
            label="Xuất dữ liệu cá nhân"
            filename="personal_data"
            onExport={(format) => exportApi.exportMe(format)}
          />
        }
      />

      {loading && <DashboardSkeleton />}

      {!loading && error && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="glass-card flex flex-col items-center gap-4 border border-red-500/10 p-8"
        >
          <AlertCircle className="h-10 w-10 text-red-400" />
          <p className="text-sm font-semibold text-white">Không thể tải dữ liệu</p>
          <p className="text-center text-xs text-gray-400">{error}</p>
          <button onClick={refetch} className="btn-primary flex items-center gap-2 text-xs">
            <RefreshCw className="h-3.5 w-3.5" /> Thử lại
          </button>
        </motion.div>
      )}

      {!loading && !error && data && (
        <>
          {data.activeRoomsCount === 0 ? (
            <EmptyState
              icon={DoorOpen}
              title="Bắt đầu không gian tài chính đầu tiên"
              description="Tạo hoặc tham gia một phòng để Zyra bắt đầu kết nối chi tiêu nhóm, công nợ và gợi ý tài chính cho bạn."
              action={
                <AppButton onClick={() => navigate('/rooms')} icon={Plus}>
                  Tạo / Tham gia phòng
                </AppButton>
              }
            />
          ) : (
            <div className="space-y-6">
              <section className="grid gap-4 lg:grid-cols-[minmax(0,1.45fr)_minmax(15rem,0.55fr)]">
                <NetBalanceHero
                  netBalance={data.netBalance}
                  totalIOwe={data.totalIOwe}
                  totalOwedToMe={data.totalOwedToMe}
                  eyebrow={narrative.eyebrow}
                  headline={narrative.headline}
                  guidance={narrative.guidance}
                />

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                  <SummaryCard
                    label="Chi tháng này"
                    value={formatCurrency(data.totalSpentThisMonth, true)}
                    icon={CalendarDays}
                    color="blue"
                    index={0}
                  />
                  <SummaryCard
                    label="Phòng hoạt động"
                    value={`${data.activeRoomsCount} phòng`}
                    icon={DoorOpen}
                    color="purple"
                    index={1}
                  />
                </div>
              </section>

              <div className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(18rem,0.75fr)]">
                <div className="space-y-6">
                  <section className="space-y-3">
                    <SectionHeading
                      icon={Bot}
                      title="Việc cần chú ý"
                      description="Những tín hiệu quan trọng nhất Zyra đang thấy trong dữ liệu hiện tại."
                    />
                    <AppCard className="space-y-3 border border-white/5 bg-dark-800 p-4">
                      {topPriorities.length === 0 ? (
                        <p className="text-sm text-gray-400">
                          Chưa có cảnh báo đáng chú ý. Dòng tiền tháng này đang giữ nhịp ổn định.
                        </p>
                      ) : (
                        topPriorities.map((recommendation) => (
                          <RecommendationCard key={recommendation.id} recommendation={recommendation} compact />
                        ))
                      )}
                    </AppCard>
                  </section>

                  <section className="space-y-3">
                    <SectionHeading
                      icon={Sparkles}
                      title="Cơ hội"
                      description="Các hướng tối ưu nhẹ nhàng, không phán xét và có thể hành động."
                    />
                    <div className="grid gap-3 md:grid-cols-2">
                      {topOpportunities.length === 0 ? (
                        <AppCard className="border border-white/5 bg-dark-800 p-4 text-sm text-gray-400 md:col-span-2">
                          Chưa có cơ hội tối ưu đủ rõ ràng. Khi có thêm dữ liệu, Zyra sẽ đề xuất điểm cải thiện phù hợp hơn.
                        </AppCard>
                      ) : (
                        topOpportunities.map((recommendation) => (
                          <RecommendationCard key={recommendation.id} recommendation={recommendation} compact />
                        ))
                      )}
                    </div>
                  </section>

                  <section className="space-y-3">
                    <SectionHeading
                      title="Bức tranh tài chính"
                      description="Phân bổ chi tiêu và nhịp vận động của các phòng."
                    />
                    <div className="grid gap-4 sm:grid-cols-2">
                      <CategoryBreakdown data={data.categoryBreakdown} />
                      <RoomBreakdownList data={data.roomBreakdown} />
                    </div>
                  </section>

                  <section className="space-y-3">
                    <SectionHeading
                      title="Hoạt động gần đây"
                      description="Ngữ cảnh hỗ trợ cho những gì đang diễn ra, không phải trọng tâm chính."
                    />
                    <div className="grid gap-4 sm:grid-cols-2">
                      <RecentExpensesList data={data.recentExpenses} />
                      <MonthlyTrendChart data={data.monthlyTrend} />
                    </div>
                    <MonthlyComparisonCard monthlyTrend={data.monthlyTrend} />
                  </section>

                  <section className="space-y-3">
                    <SectionHeading
                      title="Phân tích chi tiết"
                      description="Độ sâu cho những lúc bạn cần kiểm tra kỹ hơn."
                    />
                    <BudgetStatusCard status={budgetStatus} />
                    <AnalyticsDashboard />
                  </section>
                </div>

                <aside className="space-y-4">
                  <ForecastSnapshot data={copilotData} />
                  <FinancialMemory data={copilotData} />
                  <InsightsSection />
                  <AppCard className="space-y-3 border border-white/5 bg-dark-800 p-4">
                    <div className="flex items-center gap-2">
                      <PiggyBank className="h-4 w-4 text-emerald-400" />
                      <p className="text-sm font-semibold text-white">Điều chỉnh tiếp theo</p>
                    </div>
                    <p className="text-sm leading-relaxed text-gray-400">
                      Mở trợ lý AI để xem toàn bộ bức tranh dự báo, ngân sách và kế hoạch đang hoạt động.
                    </p>
                    <AppButton size="sm" onClick={() => navigate('/copilot')} icon={ArrowRight} className="w-full">
                      Mở trợ lý AI
                    </AppButton>
                  </AppCard>
                </aside>
              </div>
            </div>
          )}
        </>
      )}
    </main>
  );
}

function SectionHeading({ icon: Icon, title, description }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        {Icon && <Icon className="h-4 w-4 text-gray-400" />}
        <h2 className="text-sm font-semibold text-white">{title}</h2>
      </div>
      {description && <p className="text-xs leading-relaxed text-gray-500">{description}</p>}
    </div>
  );
}

function ForecastSnapshot({ data }) {
  const snapshot = data?.forecastSnapshot;
  if (!snapshot) return null;

  return (
    <AppCard className="space-y-4 border border-white/5 bg-dark-800 p-4">
      <div>
        <p className="text-[11px] font-medium text-gray-500">Dự báo</p>
        <h2 className="mt-1 text-sm font-semibold text-white">Nhịp tháng hiện tại</h2>
      </div>
      <div className="space-y-3">
        <Metric label="Cuối tháng" value={formatCurrency(snapshot.forecastMonthTotal || 0, true)} />
        <Metric label="Chi mỗi ngày" value={formatCurrency(snapshot.spendingVelocity?.dailyAverage || 0, true)} />
        <Metric label="Ngân sách có rủi ro" value={`${snapshot.budgetHealth?.atRiskCount ?? 0}`} />
      </div>
    </AppCard>
  );
}

function FinancialMemory({ data }) {
  const memory = data?.financialMemory;
  if (!memory) return null;

  return (
    <AppCard className="space-y-4 border border-white/5 bg-dark-800 p-4">
      <div>
        <p className="text-[11px] font-medium text-gray-500">Hồ sơ tài chính</p>
        <h2 className="mt-1 text-sm font-semibold text-white">Điểm Zyra đang ghi nhớ</h2>
      </div>
      <div className="space-y-3">
        <Metric label="Phong cách" value={formatMemoryValue(memory.spendingStyle?.type)} />
        <Metric label="Biến động" value={formatMemoryValue(memory.volatility?.level)} />
        <Metric label="Kỷ luật" value={formatMemoryValue(memory.budgetDiscipline?.level)} />
        <Metric label="Danh mục nổi bật" value={formatCategoryList(memory.topCategories)} />
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

function formatMemoryValue(value) {
  return memoryLabels[value] ?? 'chưa rõ';
}

function formatCategoryList(categories = []) {
  return categories.map((category) => categoryLabels[category] ?? category).join(', ') || 'chưa có';
}

function buildPersonalNarrative({ data, copilotData, budgetStatus }) {
  const topRecommendation = copilotData?.recommendations?.[0];
  const overBudgetCount = budgetStatus?.budgets?.filter((budget) => budget.overBudget).length ?? 0;
  const atRiskCount = copilotData?.forecastSnapshot?.budgetHealth?.atRiskCount ?? 0;

  if (topRecommendation?.severity === 'critical') {
    return {
      eyebrow: 'Cần chú ý',
      headline: 'Có một tín hiệu tài chính nên xử lý sớm.',
      guidance: topRecommendation.description,
    };
  }

  if (overBudgetCount > 0) {
    return {
      eyebrow: 'Ngân sách',
      headline: 'Một vài hạn mức đang cần được xem lại.',
      guidance: `${overBudgetCount} ngân sách đã vượt hạn mức trong tháng này.`,
    };
  }

  if (topRecommendation?.type === 'spending_velocity') {
    return {
      eyebrow: 'Nhịp chi tiêu',
      headline: 'Chi tiêu đang tăng nhanh hơn bình thường.',
      guidance: topRecommendation.description,
    };
  }

  if (atRiskCount > 0) {
    return {
      eyebrow: 'Dự báo',
      headline: 'Bạn vẫn đang kiểm soát được tháng này, nhưng có rủi ro phía trước.',
      guidance: `${atRiskCount} ngân sách có thể cần điều chỉnh nếu nhịp chi hiện tại tiếp tục.`,
    };
  }

  if ((data?.netBalance ?? 0) < -500) {
    return {
      eyebrow: 'Công nợ',
      headline: 'Bạn đang có công nợ ròng cần theo dõi.',
      guidance: 'Các khoản thanh toán vẫn trong tầm kiểm soát, nhưng nên được xử lý theo thứ tự ưu tiên.',
    };
  }

  return {
    eyebrow: 'Tổng quan tháng này',
    headline: 'Tình hình tài chính tháng này đang ổn.',
    guidance: 'Chi tiêu, ngân sách và công nợ hiện chưa cho thấy tín hiệu bất thường đáng kể.',
  };
}
