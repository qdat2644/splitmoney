import { motion } from 'framer-motion';
import { Activity, ArrowRight, PiggyBank, Plus, Receipt, Sparkles, Wallet } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { useBudgets } from '../hooks/useBudgets';
import { usePlans } from '../hooks/usePlans';
import ExpenseCard from '../components/expenses/ExpenseCard';
import { SettlementItem } from '../components/settlements/SettlementList';
import InsightsWidget from '../components/dashboard/InsightsWidget';
import ExportButton from '../components/ui/ExportButton';
import PageHeader from '../components/ui/PageHeader';
import EmptyState from '../components/ui/EmptyState';
import AppButton from '../components/ui/AppButton';
import AppCard from '../components/ui/AppCard';
import Avatar from '../components/ui/Avatar';
import { exportApi } from '../services/apiClient';
import { formatCurrency } from '../utils/formatters';
import { SkeletonPage } from '../components/ui/Skeleton';
import ContextualCopilotPanel from '../components/copilot/ContextualCopilotPanel';

export default function Dashboard({ onAddExpense, onEditExpense }) {
  const { stats, members, expenses, settlements, currentRoom, loadingRoom } = useApp();
  const { budgets } = useBudgets();
  const { plans } = usePlans();
  const roomId = currentRoom?.roomId || 'local';

  const recentExpenses = [...expenses]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 3);
  const roomBudgets = budgets.filter((budget) => budget.roomId === roomId);
  const activePlans = plans.filter((plan) => plan.roomId === roomId && plan.status === 'active');
  const avgPerPerson = members.length > 0 ? stats.totalExpenses / members.length : 0;
  const unresolvedAmount = settlements.reduce((sum, item) => sum + item.amount, 0);
  const largestImbalance = [...stats.perMember].sort((a, b) => Math.abs(b.balance) - Math.abs(a.balance))[0];
  const narrative = buildRoomNarrative({ settlements, unresolvedAmount, activePlans, roomBudgets });
  const prioritySignals = buildRoomPrioritySignals({
    roomId,
    settlements,
    unresolvedAmount,
    activePlans,
    roomBudgets,
    recentExpenses,
  });

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        eyebrow="Nhóm"
        title="Tổng quan"
        subtitle="Không gian tài chính chung cho số dư, kế hoạch và nhịp chi tiêu của phòng."
        actions={
          <div className="flex items-center gap-2">
            <ExportButton
              label="Xuất dữ liệu phòng"
              filename={`room_${roomId}`}
              onExport={(format) => exportApi.exportRoom(roomId, format)}
            />
            <AppButton onClick={onAddExpense} icon={Plus} size="sm">
              Thêm khoản chi
            </AppButton>
          </div>
        }
      />

      {loadingRoom ? (
        <SkeletonPage />
      ) : (
        <div className="space-y-6">
          <section className="grid gap-4 lg:grid-cols-[minmax(0,1.45fr)_minmax(15rem,0.55fr)]">
            <AppCard className="border border-white/5 bg-dark-800 p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-2">
                  <p className="text-[11px] font-medium text-gray-500">{narrative.eyebrow}</p>
                  <h2 className="max-w-xl text-lg font-semibold leading-snug text-white">{narrative.headline}</h2>
                  <p className="text-sm leading-relaxed text-gray-400">{narrative.description}</p>
                </div>
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded border border-white/5 bg-white/5">
                  <Wallet className="h-4 w-4 text-gray-300" />
                </div>
              </div>
              <div className="mt-5 grid gap-3 border-t border-white/5 pt-4 sm:grid-cols-3">
                <Metric label="Chưa thanh toán" value={formatCurrency(unresolvedAmount, true)} />
                <Metric label="Thành viên" value={`${members.length} người`} />
                <Metric label="Kế hoạch hoạt động" value={`${activePlans.length}`} />
              </div>
            </AppCard>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
              <CompactMetric
                label="Tổng chi tiêu"
                value={formatCurrency(stats.totalExpenses, true)}
                meta={`${stats.totalCount} hóa đơn`}
              />
              <CompactMetric
                label="Bình quân mỗi người"
                value={formatCurrency(avgPerPerson, true)}
                meta={`${roomBudgets.length} ngân sách đang theo dõi`}
              />
            </div>
          </section>

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(18rem,0.75fr)]">
            <div className="space-y-6">
              <section className="space-y-3">
                <SectionHeading
                  icon={Sparkles}
                  title="Việc cần chú ý"
                  description="Những việc đáng xử lý trước để phòng vận hành nhẹ hơn."
                />
                <AppCard className="space-y-3 border border-white/5 bg-dark-800 p-4">
                  {prioritySignals.length === 0 ? (
                    <p className="text-sm text-gray-400">
                      Phòng đang cân bằng. Hiện chưa có việc cần xử lý gấp.
                    </p>
                  ) : (
                    prioritySignals.map((signal) => (
                      <div key={signal.title} className="rounded-lg border border-white/5 bg-white/[0.02] p-3">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-medium text-white">{signal.title}</p>
                          {signal.to && (
                            <Link to={signal.to} className="text-xs text-blue-400 hover:text-blue-300">
                              {signal.actionLabel}
                            </Link>
                          )}
                        </div>
                        <p className="mt-1 text-sm text-gray-400">{signal.description}</p>
                      </div>
                    ))
                  )}
                </AppCard>
              </section>

              <section className="space-y-3">
                <SectionHeading
                  title="Sức khỏe số dư"
                  description="Ai đang dương, ai đang âm và mức lệch lớn nhất trong phòng."
                />
                <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(16rem,0.8fr)]">
                  <AppCard className="border border-white/5 bg-dark-800 p-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-white">Bảng cân đối thành viên</h3>
                      <Link to={`/rooms/${roomId}/members`} className="text-xs text-blue-400 hover:text-blue-300">
                        Quản lý
                      </Link>
                    </div>
                    <div className="mt-3 grid gap-x-4 gap-y-1 divide-y divide-white/5 sm:grid-cols-2 sm:divide-y-0">
                      {stats.perMember.map((memberBalance, index) => {
                        const member = members.find((item) => item.id === memberBalance.id);
                        const positive = memberBalance.balance > 1;
                        const negative = memberBalance.balance < -1;

                        return (
                          <motion.div
                            key={memberBalance.id}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: index * 0.03 }}
                            className="flex items-center gap-2.5 py-2.5"
                          >
                            <Avatar member={member} size="xs" />
                            <span className="min-w-0 flex-1 truncate text-xs font-medium text-gray-300">
                              {memberBalance.name}
                            </span>
                            <span className={`text-xs font-semibold ${positive ? 'text-emerald-400' : negative ? 'text-red-400' : 'text-gray-500'}`}>
                              {positive ? '+' : ''}{formatCurrency(memberBalance.balance, true)}
                            </span>
                          </motion.div>
                        );
                      })}
                    </div>
                  </AppCard>

                  <AppCard className="border border-white/5 bg-dark-800 p-4">
                    <p className="text-[11px] font-medium text-gray-500">Nhịp nhóm</p>
                    <h3 className="mt-1 text-sm font-semibold text-white">
                      {largestImbalance?.balance
                        ? `${largestImbalance.name} đang lệch nhiều nhất`
                        : 'Các thành viên đang cân bằng'}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-gray-400">
                      {largestImbalance?.balance
                        ? `${largestImbalance.name} hiện có số dư ${formatCurrency(largestImbalance.balance, true)}.`
                        : 'Chưa có chênh lệch đáng kể giữa các thành viên.'}
                    </p>
                  </AppCard>
                </div>
              </section>

              <section className="space-y-3">
                <SectionHeading
                  title="Kế hoạch và ngân sách chung"
                  description="Những cam kết đang định hình chi tiêu sắp tới của phòng."
                />
                <div className="grid gap-4 sm:grid-cols-2">
                  <AppCard className="border border-white/5 bg-dark-800 p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-white">Kế hoạch hoạt động</h3>
                      <Link to="/plans" className="text-xs text-blue-400 hover:text-blue-300">Tất cả</Link>
                    </div>
                    <div className="space-y-2">
                      {activePlans.length === 0 ? (
                        <p className="text-sm text-gray-400">
                          Chưa có kế hoạch chung. Tạo một chuyến đi hoặc mục tiêu nhóm để ước lượng trước chi phí.
                        </p>
                      ) : (
                        activePlans.slice(0, 2).map((plan) => (
                          <div key={plan.id} className="flex items-center justify-between rounded border border-white/5 bg-dark-900/40 p-2.5 text-xs">
                            <div>
                              <p className="font-semibold text-gray-200">{plan.title}</p>
                              <p className="mt-0.5 text-[10px] text-gray-500">Dự toán</p>
                            </div>
                            <span className="font-semibold text-white">{formatCurrency(plan.estimatedTotal || 0, true)}</span>
                          </div>
                        ))
                      )}
                    </div>
                  </AppCard>

                  <AppCard className="border border-white/5 bg-dark-800 p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-white">Ngân sách phòng</h3>
                      <Link to="/budget" className="text-xs text-blue-400 hover:text-blue-300">Quản lý</Link>
                    </div>
                    <div className="space-y-2">
                      {roomBudgets.length === 0 ? (
                        <p className="text-sm text-gray-400">
                          Chưa có ngân sách phòng. Thiết lập hạn mức để Zyra theo dõi nhịp chi chung tốt hơn.
                        </p>
                      ) : (
                        roomBudgets.slice(0, 2).map((budget) => (
                          <div key={budget.id} className="flex items-center justify-between rounded border border-white/5 bg-dark-900/40 p-2.5 text-xs">
                            <div>
                              <p className="font-semibold text-gray-200">{budget.title || budget.category}</p>
                              <p className="mt-0.5 text-[10px] text-gray-500">Hạn mức tháng</p>
                            </div>
                            <span className="font-semibold text-white">{formatCurrency(budget.amount, true)}</span>
                          </div>
                        ))
                      )}
                    </div>
                  </AppCard>
                </div>
              </section>

              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <SectionHeading
                    icon={Activity}
                    title="Hoạt động gần đây"
                    description="Dòng sự kiện hỗ trợ bối cảnh cho phòng."
                  />
                  <Link to={`/rooms/${roomId}/expenses`} className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300">
                    Xem tất cả <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
                {recentExpenses.length === 0 ? (
                  <EmptyState
                    icon={Receipt}
                    title="Chưa có khoản chi đầu tiên"
                    description="Ghi nhận khoản chi đầu tiên để Zyra bắt đầu kể câu chuyện tài chính của phòng."
                    action={<AppButton onClick={onAddExpense} size="xs">Thêm khoản chi</AppButton>}
                    compact
                  />
                ) : (
                  <div className="space-y-2">
                    {recentExpenses.map((expense, index) => (
                      <ExpenseCard key={expense.id} expense={expense} onEdit={onEditExpense} index={index} />
                    ))}
                  </div>
                )}
              </section>
            </div>

            <aside className="space-y-4">
              <AppCard className="border border-white/5 bg-dark-800 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-medium text-gray-500">Thanh toán</p>
                    <h2 className="mt-1 text-sm font-semibold text-white">
                      {settlements.length === 0 ? 'Phòng đang cân bằng' : 'Có khoản cần xử lý'}
                    </h2>
                  </div>
                  <Link to={`/rooms/${roomId}/settlements`} className="text-xs text-blue-400 hover:text-blue-300">
                    Chi tiết
                  </Link>
                </div>
                <div className="mt-4">
                  {settlements.length === 0 ? (
                    <p className="text-sm text-gray-400">Không có công nợ tồn đọng giữa các thành viên.</p>
                  ) : (
                    <div className="space-y-2">
                      {settlements.slice(0, 3).map((settlement, index) => (
                        <SettlementItem key={`${settlement.from}-${settlement.to}`} settlement={settlement} index={index} />
                      ))}
                    </div>
                  )}
                </div>
              </AppCard>

              <InsightsWidget />
              <ContextualCopilotPanel title="Quan sát từ trợ lý AI" types={['debt_attention']} limit={2} />

              <AppCard className="space-y-3 border border-white/5 bg-dark-800 p-4">
                <div className="flex items-center gap-2">
                  <PiggyBank className="h-4 w-4 text-emerald-400" />
                  <h2 className="text-sm font-semibold text-white">Lối tắt</h2>
                </div>
                <div className="space-y-2 text-sm">
                  <QuickAction label="Thêm hóa đơn nhanh" action={<AppButton onClick={onAddExpense} size="xs" icon={Plus}>Thêm</AppButton>} />
                  <QuickAction label="Quản lý ngân sách phòng" action={<Link to="/budget" className="text-xs text-blue-400 hover:text-blue-300">Quản lý</Link>} />
                  <QuickAction label="Xem kế hoạch" action={<Link to="/plans" className="text-xs text-blue-400 hover:text-blue-300">Kế hoạch</Link>} />
                </div>
              </AppCard>
            </aside>
          </div>
        </div>
      )}
    </div>
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

function Metric({ label, value }) {
  return (
    <div>
      <p className="text-[11px] font-medium text-gray-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-white">{value}</p>
    </div>
  );
}

function CompactMetric({ label, value, meta }) {
  return (
    <AppCard className="border border-white/5 bg-dark-800 p-4">
      <p className="text-[11px] font-medium text-gray-500">{label}</p>
      <p className="mt-2 text-base font-semibold text-white">{value}</p>
      <p className="mt-1 text-xs text-gray-500">{meta}</p>
    </AppCard>
  );
}

function QuickAction({ label, action }) {
  return (
    <div className="flex items-center justify-between gap-3 border-t border-white/5 pt-2 first:border-t-0 first:pt-0">
      <span className="text-gray-400">{label}</span>
      {action}
    </div>
  );
}

function buildRoomNarrative({ settlements, unresolvedAmount, activePlans, roomBudgets }) {
  if (settlements.length > 0) {
    return {
      eyebrow: 'Công nợ',
      headline: 'Phòng vẫn khỏe, nhưng còn vài khoản cần chốt.',
      description: `${formatCurrency(unresolvedAmount, true)} đang chờ thanh toán giữa các thành viên.`,
    };
  }

  if (activePlans.length > 0) {
    return {
      eyebrow: 'Kế hoạch chung',
      headline: 'Phòng đang cân bằng và có kế hoạch sắp tới.',
      description: `${activePlans.length} kế hoạch đang hoạt động để cả nhóm theo dõi trước chi phí.`,
    };
  }

  if (roomBudgets.length === 0) {
    return {
      eyebrow: 'Nhịp phòng',
      headline: 'Phòng đang yên ổn, nhưng chưa có ngân sách chung.',
      description: 'Thiết lập hạn mức giúp mọi người nhìn trước rủi ro chi tiêu dễ hơn.',
    };
  }

  return {
    eyebrow: 'Nhịp phòng',
    headline: 'Phòng đang cân bằng và vận hành khá gọn.',
    description: 'Công nợ hiện đã thông thoáng, kế hoạch và ngân sách đang ở trạng thái dễ theo dõi.',
  };
}

function buildRoomPrioritySignals({ roomId, settlements, unresolvedAmount, activePlans, roomBudgets, recentExpenses }) {
  const signals = [];

  if (settlements.length > 0) {
    signals.push({
      title: 'Chốt các khoản còn mở',
      description: `${settlements.length} giao dịch đang chờ với tổng ${formatCurrency(unresolvedAmount, true)}.`,
      to: `/rooms/${roomId}/settlements`,
      actionLabel: 'Xem thanh toán',
    });
  }

  if (activePlans.length > 0) {
    signals.push({
      title: 'Theo dõi kế hoạch đang chạy',
      description: `${activePlans.length} kế hoạch đang tác động đến chi tiêu sắp tới của nhóm.`,
      to: '/plans',
      actionLabel: 'Mở kế hoạch',
    });
  }

  if (roomBudgets.length === 0) {
    signals.push({
      title: 'Chưa có ngân sách phòng',
      description: 'Thiết lập hạn mức để Zyra cảnh báo sớm khi nhịp chi chung tăng nhanh.',
      to: '/budget',
      actionLabel: 'Tạo ngân sách',
    });
  }

  if (recentExpenses.length === 0) {
    signals.push({
      title: 'Chưa có hoạt động để phân tích',
      description: 'Ghi nhận khoản chi đầu tiên để bắt đầu tạo bức tranh chung của phòng.',
      actionLabel: '',
    });
  }

  return signals.slice(0, 4);
}
