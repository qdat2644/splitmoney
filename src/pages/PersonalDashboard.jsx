// PersonalDashboard.jsx - Standalone personal finance overview
import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  ArrowRight,
  BarChart3,
  Bot,
  CalendarDays,
  DoorOpen,
  Plus,
  RefreshCw,
  TrendingUp,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useDashboard } from '../hooks/useDashboard';
import { useBudgets } from '../hooks/useBudgets';
import { useCopilotWorkspace } from '../hooks/useCopilotWorkspace';
import { formatCurrency } from '../utils/formatters';
import { compareRecommendationPriority, dedupeRecommendations } from '../utils/recommendationDedupe';
import { exportApi } from '../services/apiClient';

import NetBalanceHero from '../components/personal/NetBalanceHero';
import SummaryCard from '../components/personal/SummaryCard';
import CategoryBreakdown from '../components/personal/CategoryBreakdown';
import RoomBreakdownList from '../components/personal/RoomBreakdownList';
import RecentExpensesList from '../components/personal/RecentExpensesList';
import DashboardSkeleton from '../components/personal/DashboardSkeleton';
import BudgetStatusCard from '../components/personal/BudgetStatusCard';
import ExportButton from '../components/ui/ExportButton';
import PageHeader from '../components/ui/PageHeader';
import EmptyState from '../components/ui/EmptyState';
import AppButton from '../components/ui/AppButton';
import AppCard from '../components/ui/AppCard';
import RecommendationCard from '../components/copilot/RecommendationCard';

export default function PersonalDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Single consolidated request: replaces useDashboardSummary + useDashboardAnalytics + useDashboardInsights.
  // One HTTP round-trip, one snapshot computation on the server.
  const { data: dashboardData, loading, error, refetch } = useDashboard();

  // Slice the consolidated payload into named sections used by each sub-component.
  const data     = dashboardData?.summary   ?? null;   // shape identical to old /me/summary

  const { status: budgetStatus } = useBudgets();
  const { data: copilotData } = useCopilotWorkspace();

  // Memoize derived recommendation arrays — these are pure transforms of copilotData
  // and should not recompute on every render tick caused by unrelated state changes.
  const uniqueRecommendations = useMemo(
    () => dedupeRecommendations(copilotData?.recommendations ?? []),
    [copilotData?.recommendations],
  );
  const topPriorities = useMemo(
    () => [...uniqueRecommendations].sort(compareRecommendationPriority).slice(0, 4),
    [uniqueRecommendations],
  );

  const narrative = buildPersonalNarrative({ data, copilotData, budgetStatus });

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Chào buổi sáng';
    if (hour < 18) return 'Chào buổi chiều';
    return 'Chào buổi tối';
  };

  return (
    <main data-testid="personal-dashboard" className="mx-auto max-w-6xl space-y-6">
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
                    <RecentExpensesList data={data.recentExpenses} />
                  </section>

                  <section className="space-y-3">
                    <SectionHeading
                      title="Đi sâu hơn"
                      description="Mở đúng không gian khi bạn cần xem phân tích, dự báo hoặc trợ lý tài chính đầy đủ."
                    />
                    <BudgetStatusCard status={budgetStatus} />
                    <div className="grid gap-3 md:grid-cols-3">
                      <DeepLinkCard
                        icon={BarChart3}
                        title="Xem phân tích chi tiết"
                        description="Xu hướng, danh mục nổi bật và tín hiệu gần đây."
                        onClick={() => navigate('/analytics')}
                      />
                      <DeepLinkCard
                        icon={TrendingUp}
                        title="Xem dự báo tháng này"
                        description="Quỹ đạo cuối tháng, rủi ro ngân sách và khoản lặp lại."
                        onClick={() => navigate('/forecasts')}
                      />
                      <DeepLinkCard
                        icon={Bot}
                        title="Mở Trợ lý AI"
                        description="Ưu tiên, cơ hội và hồ sơ tài chính trong một không gian riêng."
                        onClick={() => navigate('/copilot')}
                      />
                    </div>
                  </section>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </main>
  );
}

function DeepLinkCard({ icon: Icon, title, description, onClick }) {
  return (
    <AppCard className="flex h-full flex-col justify-between border border-white/5 bg-dark-800 p-4">
      <div className="space-y-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/5 bg-white/5">
          <Icon className="h-4 w-4 text-gray-300" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-white">{title}</h3>
          <p className="mt-1 text-xs leading-relaxed text-gray-500">{description}</p>
        </div>
      </div>
      <AppButton size="sm" variant="secondary" onClick={onClick} icon={ArrowRight} className="mt-4 w-full">
        Mở
      </AppButton>
    </AppCard>
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

function buildPersonalNarrative({ data, copilotData, budgetStatus }) {
  const topRecommendation = copilotData?.recommendations?.[0];
  const overBudgetCount = budgetStatus?.budgets?.filter((budget) => budget.overBudget).length ?? 0;
  const atRiskCount = copilotData?.forecastSnapshot?.budgetHealth?.atRiskCount ?? 0;
  const trend = copilotData?.financialMemory?.recentTrendSummary;
  const rhythm = copilotData?.financialMemory?.spendingRhythm?.weekdayWeekend;

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

  if (trend?.confidence >= 0.55 && trend.type === 'stabilization') {
    return {
      eyebrow: 'Ổn định hơn',
      headline: 'Nhịp chi gần đây đang đều hơn trước.',
      guidance: 'Zyra thấy tín hiệu này từ dữ liệu theo thời gian, không phải từ một giao dịch riêng lẻ.',
    };
  }

  if (trend?.confidence >= 0.55 && trend.type === 'improvement') {
    return {
      eyebrow: 'So với tháng trước',
      headline: 'Chi tiêu gần đây đang nhẹ hơn giai đoạn trước.',
      guidance: 'Bạn có thể tiếp tục giữ nhịp hiện tại nếu nó phù hợp với kế hoạch tháng này.',
    };
  }

  if (rhythm?.confidence >= 0.55 && rhythm.direction === 'weekend_higher') {
    return {
      eyebrow: 'Theo chu kỳ',
      headline: 'Cuối tuần vẫn là thời điểm chi tiêu cao hơn.',
      guidance: 'Đây là nhịp lặp từ dữ liệu chi tiêu, hữu ích khi bạn muốn lên kế hoạch trước.',
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
