// PersonalDashboard.jsx - Standalone personal finance overview
import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  BarChart3,
  Bot,
  CalendarDays,
  CheckCircle,
  DoorOpen,
  PiggyBank,
  Plus,
  TrendingUp,
  WalletCards,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useDashboard } from '../hooks/useDashboard';
import { useBudgets } from '../hooks/useBudgets';
import { useCopilotWorkspace } from '../hooks/useCopilotWorkspace';
import { formatCurrency } from '../utils/formatters';
import { compareRecommendationPriority, dedupeRecommendations } from '../utils/recommendationDedupe';
import { exportApi } from '../services/apiClient';

import NetBalanceHero from '../components/personal/NetBalanceHero';
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
import StatCard from '../components/ui/StatCard';
import ErrorState from '../components/ui/ErrorState';
import RecommendationCard from '../components/copilot/RecommendationCard';

export default function PersonalDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: dashboardData, loading, error, refetch } = useDashboard();
  const data = dashboardData?.summary ?? null;

  const { status: budgetStatus } = useBudgets();
  const { data: copilotData } = useCopilotWorkspace();

  const uniqueRecommendations = useMemo(
    () => dedupeRecommendations(copilotData?.recommendations ?? []),
    [copilotData?.recommendations],
  );
  const topPriorities = useMemo(
    () => [...uniqueRecommendations].sort(compareRecommendationPriority).slice(0, 3),
    [uniqueRecommendations],
  );

  const nextAction = topPriorities[0];
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
        <ErrorState
          description="Zyra chưa thể tải tổng quan tài chính. Bạn có thể thử lại ngay."
          onRetry={refetch}
        />
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
              <section className="grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(22rem,0.72fr)]">
                <div className="space-y-4">
                  <NetBalanceHero
                    netBalance={data.netBalance}
                    totalIOwe={data.totalIOwe}
                    totalOwedToMe={data.totalOwedToMe}
                    eyebrow={narrative.eyebrow}
                    headline={narrative.headline}
                    guidance={narrative.guidance}
                  />
                  <StatusLine narrative={narrative} nextAction={nextAction} />
                  <div className="grid gap-3 sm:grid-cols-3">
                    <StatCard
                      title="Chi tháng này"
                      value={formatCurrency(data.totalSpentThisMonth, true)}
                      icon={CalendarDays}
                      color="blue"
                    />
                    <StatCard
                      title="Phòng hoạt động"
                      value={`${data.activeRoomsCount} phòng`}
                      icon={DoorOpen}
                      color="purple"
                    />
                    <StatCard
                      title="Cần thanh toán"
                      value={formatCurrency(data.totalIOwe || 0, true)}
                      icon={WalletCards}
                      color={(data.totalIOwe || 0) > 0 ? 'amber' : 'emerald'}
                      subtitle={(data.totalIOwe || 0) > 0 ? 'Khoản bạn đang nợ' : 'Chưa có khoản cần trả'}
                    />
                  </div>
                </div>

                <PriorityPanel priorities={topPriorities} />
              </section>

              <section className="space-y-3">
                <SectionHeading
                  title="Tổng quan nhanh"
                  description="Bốn lát cắt đủ để biết tiền đang đi đâu và có giới hạn nào cần xem lại."
                />
                <div className="grid gap-4 lg:grid-cols-2">
                  <BudgetHealthSummary status={budgetStatus} onOpenBudget={() => navigate('/budget')} />
                  <CategoryBreakdown data={data.categoryBreakdown} />
                  <RoomBreakdownList data={data.roomBreakdown} />
                  <RecentExpensesList data={data.recentExpenses} />
                </div>
              </section>

              <section className="space-y-3">
                <SectionHeading
                  title="Đi sâu hơn"
                  description="Chọn đúng trang cho câu hỏi tiếp theo, không cần đọc hết bảng điều khiển."
                />
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <DeepLinkCard
                    icon={BarChart3}
                    title="Phân tích chi tiết"
                    description="Xu hướng, danh mục nổi bật và tín hiệu gần đây."
                    onClick={() => navigate('/analytics')}
                  />
                  <DeepLinkCard
                    icon={TrendingUp}
                    title="Dự báo tháng này"
                    description="Quỹ đạo cuối tháng và rủi ro ngân sách."
                    onClick={() => navigate('/forecasts')}
                  />
                  <DeepLinkCard
                    icon={Bot}
                    title="Trợ lý AI"
                    description="Ưu tiên, cơ hội và hồ sơ tài chính."
                    onClick={() => navigate('/copilot')}
                  />
                  <DeepLinkCard
                    icon={PiggyBank}
                    title="Ngân sách"
                    description="Xem hạn mức và điều chỉnh khoản cần kiểm soát."
                    onClick={() => navigate('/budget')}
                  />
                </div>
              </section>
            </div>
          )}
        </>
      )}
    </main>
  );
}

function StatusLine({ narrative, nextAction }) {
  return (
    <AppCard className="flex flex-col gap-3 border border-white/5 bg-dark-800 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-start gap-2">
        <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
        <p className="text-sm leading-relaxed text-gray-300">{narrative.shortStatus}</p>
      </div>
      <p className="shrink-0 text-xs font-medium text-gray-500">
        {nextAction ? 'Việc nên xem trước ở bên phải.' : 'Chưa cần hành động gấp.'}
      </p>
    </AppCard>
  );
}

function PriorityPanel({ priorities }) {
  return (
    <AppCard className="border border-white/5 bg-dark-800 p-4">
      <div className="mb-4 flex items-start gap-2">
        <Bot className="mt-0.5 h-4 w-4 text-purple-300" />
        <div>
          <h2 className="text-sm font-semibold text-white">Việc cần chú ý</h2>
          <p className="mt-1 text-xs leading-relaxed text-gray-500">
            Tối đa ba điểm nên xem trước hôm nay.
          </p>
        </div>
      </div>
      <div className="space-y-3">
        {priorities.length === 0 ? (
          <EmptyState
            icon={CheckCircle}
            title="Chưa có việc cần xử lý ngay"
            description="Tình hình hiện tại đang đủ ổn để bạn tiếp tục theo dõi nhẹ nhàng."
            color="emerald"
            compact
          />
        ) : (
          priorities.map((recommendation) => (
            <RecommendationCard key={recommendation.id} recommendation={recommendation} compact />
          ))
        )}
      </div>
    </AppCard>
  );
}

function BudgetHealthSummary({ status, onOpenBudget }) {
  if (!status?.hasData || status.budgets.length === 0) {
    return (
      <AppCard className="border border-white/5 bg-dark-800 p-5">
        <div className="flex items-start gap-2">
          <PiggyBank className="mt-0.5 h-4 w-4 text-emerald-400" />
          <div>
            <h3 className="text-sm font-semibold text-white">Ngân sách tháng này</h3>
            <p className="mt-1 text-xs leading-relaxed text-gray-500">
              Chưa có hạn mức để đối chiếu. Bạn có thể thêm ngân sách khi muốn theo dõi kỹ hơn.
            </p>
          </div>
        </div>
        <AppButton size="sm" variant="secondary" onClick={onOpenBudget} icon={ArrowRight} className="mt-4">
          Mở ngân sách
        </AppButton>
      </AppCard>
    );
  }

  return <BudgetStatusCard status={status} />;
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
      headline: 'Có một việc nên được xem trước hôm nay.',
      guidance: topRecommendation.description,
      shortStatus: 'Có một ưu tiên rõ ràng. Xem mục “Việc cần chú ý” trước khi đi sâu vào các trang khác.',
    };
  }

  if (overBudgetCount > 0) {
    return {
      eyebrow: 'Ngân sách',
      headline: 'Một vài hạn mức đang cần được xem lại.',
      guidance: `${overBudgetCount} ngân sách đã vượt hạn mức trong tháng này.`,
      shortStatus: 'Ưu tiên hiện tại là kiểm tra ngân sách đang vượt hạn mức.',
    };
  }

  if (topRecommendation?.type === 'spending_velocity') {
    return {
      eyebrow: 'Nhịp chi tiêu',
      headline: 'Chi tiêu đang tăng nhanh hơn bình thường.',
      guidance: topRecommendation.description,
      shortStatus: 'Nhịp chi đang cao hơn mong muốn. Kiểm tra dự báo nếu bạn cần quyết định nhanh.',
    };
  }

  if (trend?.confidence >= 0.55 && trend.type === 'stabilization') {
    return {
      eyebrow: 'Ổn định hơn',
      headline: 'Nhịp chi gần đây đang đều hơn trước.',
      guidance: 'Dữ liệu gần đây cho thấy nhịp chi đang bớt dao động.',
      shortStatus: 'Tình hình đang ổn hơn. Tiếp tục theo dõi các khoản chi mới trong tuần này.',
    };
  }

  if (trend?.confidence >= 0.55 && trend.type === 'improvement') {
    return {
      eyebrow: 'So với tháng trước',
      headline: 'Chi tiêu gần đây đang nhẹ hơn giai đoạn trước.',
      guidance: 'Bạn có thể tiếp tục giữ nhịp hiện tại nếu nó phù hợp với kế hoạch tháng này.',
      shortStatus: 'Chi tiêu đang nhẹ hơn. Đây là thời điểm tốt để giữ nhịp thay vì đổi nhiều thứ.',
    };
  }

  if (rhythm?.confidence >= 0.55 && rhythm.direction === 'weekend_higher') {
    return {
      eyebrow: 'Theo chu kỳ',
      headline: 'Cuối tuần vẫn là thời điểm chi tiêu cao hơn.',
      guidance: 'Mẫu chi này hữu ích khi bạn muốn chuẩn bị trước cho vài ngày tới.',
      shortStatus: 'Nếu sắp đến cuối tuần, nên xem lại các khoản dự kiến trước.',
    };
  }

  if (atRiskCount > 0) {
    return {
      eyebrow: 'Dự báo',
      headline: 'Tháng này vẫn trong tầm kiểm soát, nhưng có rủi ro phía trước.',
      guidance: `${atRiskCount} ngân sách có thể cần điều chỉnh nếu nhịp chi hiện tại tiếp tục.`,
      shortStatus: 'Chưa cần phản ứng mạnh, nhưng nên xem dự báo trước khi chi thêm khoản lớn.',
    };
  }

  if ((data?.netBalance ?? 0) < -500) {
    return {
      eyebrow: 'Công nợ',
      headline: 'Bạn đang có công nợ ròng cần theo dõi.',
      guidance: 'Các khoản thanh toán vẫn trong tầm kiểm soát, nhưng nên được xử lý theo thứ tự ưu tiên.',
      shortStatus: 'Điểm cần xem là khoản bạn đang nợ. Ưu tiên xử lý các khoản lớn trước.',
    };
  }

  return {
    eyebrow: 'Tổng quan tháng này',
    headline: 'Tình hình tài chính tháng này đang ổn.',
    guidance: 'Chi tiêu, ngân sách và công nợ hiện chưa có điểm bất thường đáng kể.',
    shortStatus: 'Không có việc gấp. Bạn có thể xem nhanh danh mục, phòng và ngân sách bên dưới.',
  };
}
