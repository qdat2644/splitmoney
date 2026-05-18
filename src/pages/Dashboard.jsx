import { motion } from 'framer-motion';
import {
  Activity,
  ArrowRight,
  CalendarRange,
  Receipt,
  Users,
  Wallet,
  PiggyBank,
  Download,
  Plus
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { useBudgets } from '../hooks/useBudgets';
import { usePlans } from '../hooks/usePlans';
import SummaryCard from '../components/dashboard/SummaryCard';
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

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        eyebrow="Nhóm"
        title="Tổng quan"
        subtitle="Quản lý chi phí nhóm, theo dõi số dư, lập kế hoạch và báo cáo AI."
        actions={
          <div className="flex items-center gap-2">
            <ExportButton
              label="Xuất dữ liệu phòng"
              filename={`room_${roomId}`}
              onExport={(format) => exportApi.exportRoom(roomId, format)}
            />
            <AppButton onClick={onAddExpense} icon={Plus} size="sm">
              Thêm chi phí
            </AppButton>
          </div>
        }
      />

      {loadingRoom ? (
        <SkeletonPage />
      ) : (
        <div className="space-y-6">
          {/* ── Hero Area: Summary Stats ── */}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <SummaryCard
              icon={Wallet}
              label="Tổng chi tiêu"
              value={formatCurrency(stats.totalExpenses, true)}
              subtext={`${stats.totalCount} hóa đơn`}
              colorClass="text-blue-400"
              bgClass="bg-blue-500/10"
              index={0}
            />
            <SummaryCard
              icon={Users}
              label="Thành viên"
              value={`${members.length} người`}
              subtext={`TB ${formatCurrency(avgPerPerson, true)}/người`}
              colorClass="text-purple-400"
              bgClass="bg-purple-500/10"
              index={1}
            />
            <SummaryCard
              icon={Wallet}
              label="Chưa thanh toán"
              value={formatCurrency(unresolvedAmount, true)}
              subtext={`${settlements.length} giao dịch chờ`}
              colorClass="text-orange-400"
              bgClass="bg-orange-500/10"
              index={2}
            />
            <SummaryCard
              icon={CalendarRange}
              label="Kế hoạch & Ngân sách"
              value={`${activePlans.length} kế hoạch`}
              subtext={`${roomBudgets.length} ngân sách hoạt động`}
              colorClass="text-emerald-400"
              bgClass="bg-emerald-500/10"
              index={3}
            />
          </div>

          {/* ── Modern Workspace Main Grid ── */}
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Left Column: Shared activity, member ledger, budgets & plans */}
            <div className="lg:col-span-2 space-y-6">
              {/* Financial Health / Settlements overview */}
              <AppCard className="p-4 bg-dark-800 border border-white/5">
                <div className="flex items-center justify-between gap-3 mb-4">
                  <div>
                    <p className="text-[11px] font-medium text-gray-500">Trạng thái thanh toán</p>
                    <h2 className="text-sm font-semibold text-white">
                      {settlements.length === 0 ? 'Phòng đang cân bằng số dư' : 'Có số dư cần thanh lý'}
                    </h2>
                  </div>
                  <Link to={`/rooms/${roomId}/settlements`} className="text-xs text-blue-400 hover:text-blue-300">
                    Chi tiết thanh lý
                  </Link>
                </div>

                {settlements.length === 0 ? (
                  <EmptyState
                    icon={Wallet}
                    title="Mọi người đã hoàn thành thanh toán"
                    description="Không có khoản nợ đọng nào trong phòng này."
                    color="emerald"
                    compact
                  />
                ) : (
                  <div className="space-y-2">
                    {settlements.slice(0, 3).map((settlement, index) => (
                      <SettlementItem key={`${settlement.from}-${settlement.to}`} settlement={settlement} index={index} />
                    ))}
                  </div>
                )}
              </AppCard>

              {/* Members Balances */}
              <AppCard className="p-4 bg-dark-800 border border-white/5">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-xs font-medium text-gray-500">Bảng cân đối thành viên</h2>
                  <Link to={`/rooms/${roomId}/members`} className="text-xs text-blue-400 hover:text-blue-300">Quản lý thành viên</Link>
                </div>
                <div className="grid sm:grid-cols-2 gap-x-4 gap-y-1 divide-y sm:divide-y-0 divide-white/5">
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
                        <span className="min-w-0 flex-1 truncate text-xs text-gray-300 font-medium">{memberBalance.name}</span>
                        <span className={`text-xs font-semibold ${positive ? 'text-emerald-400' : negative ? 'text-red-400' : 'text-gray-500'}`}>
                          {positive ? '+' : ''}{formatCurrency(memberBalance.balance, true)}
                        </span>
                      </motion.div>
                    );
                  })}
                </div>
              </AppCard>

              {/* Plans & Budgets split */}
              <div className="grid sm:grid-cols-2 gap-4">
                <AppCard className="p-4 bg-dark-800 border border-white/5">
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-xs font-medium text-gray-500">Kế hoạch hoạt động</h2>
                    <Link to="/plans" className="text-xs text-blue-400 hover:text-blue-300">Tất cả</Link>
                  </div>
                  <div className="space-y-2">
                    {activePlans.length === 0 ? (
                      <p className="text-xs text-gray-500 py-2">Chưa có kế hoạch chia tiền nào.</p>
                    ) : (
                      activePlans.slice(0, 2).map((plan) => (
                        <div key={plan.id} className="rounded border border-white/5 bg-dark-900/40 p-2.5 flex items-center justify-between text-xs">
                          <div>
                            <p className="font-semibold text-gray-200">{plan.title}</p>
                            <p className="text-[10px] text-gray-500 mt-0.5">Dự toán</p>
                          </div>
                          <span className="font-semibold text-white">{formatCurrency(plan.estimatedTotal || 0, true)}</span>
                        </div>
                      ))
                    )}
                  </div>
                </AppCard>

                <AppCard className="p-4 bg-dark-800 border border-white/5">
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-xs font-medium text-gray-500">Ngân sách phòng</h2>
                    <Link to="/budget" className="text-xs text-blue-400 hover:text-blue-300">Quản lý</Link>
                  </div>
                  <div className="space-y-2">
                    {roomBudgets.length === 0 ? (
                      <p className="text-xs text-gray-500 py-2">Chưa thiết lập ngân sách phòng.</p>
                    ) : (
                      roomBudgets.slice(0, 2).map((budget) => (
                        <div key={budget.id} className="rounded border border-white/5 bg-dark-900/40 p-2.5 flex items-center justify-between text-xs">
                          <div>
                            <p className="font-semibold text-gray-200">{budget.title || budget.category}</p>
                            <p className="text-[10px] text-gray-500 mt-0.5">Hạn mức tháng</p>
                          </div>
                          <span className="font-semibold text-white">{formatCurrency(budget.amount, true)}</span>
                        </div>
                      ))
                    )}
                  </div>
                </AppCard>
              </div>

              {/* Shared Activity Ledger */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <h2 className="flex items-center gap-2 text-xs font-medium text-gray-500">
                    <Activity className="h-3.5 w-3.5 text-gray-400" />
                    Chi phí gần đây
                  </h2>
                  <Link to={`/rooms/${roomId}/expenses`} className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300">
                    Xem tất cả <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
                {recentExpenses.length === 0 ? (
                  <EmptyState
                    icon={Receipt}
                    title="Chưa ghi nhận chi phí nào"
                    description="Ghi nhận hóa đơn chi tiêu đầu tiên của phòng."
                    action={<AppButton onClick={onAddExpense} size="xs">Thêm chi phí</AppButton>}
                    compact
                  />
                ) : (
                  <div className="space-y-2">
                    {recentExpenses.map((expense, index) => (
                      <ExpenseCard key={expense.id} expense={expense} onEdit={onEditExpense} index={index} />
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Intelligence Rail */}
            <div className="space-y-6">
              {/* AI Assistant Hub */}
              <InsightsWidget />

              {/* Copilot Alerts / Risks */}
              <ContextualCopilotPanel
                title="Cảnh báo từ trợ lý AI"
                types={['debt_attention']}
                limit={2}
              />

              {/* Room Quick actions */}
              <section className="space-y-2.5">
                <h3 className="text-[11px] font-medium text-gray-500">Lối tắt</h3>
                <div className="space-y-2">
                  <AppCard className="flex flex-col gap-2 p-3 bg-dark-800 border border-white/5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">Thêm hóa đơn nhanh</span>
                      <AppButton onClick={onAddExpense} size="xs" icon={Plus}>
                        Thêm
                      </AppButton>
                    </div>
                    <div className="border-t border-white/5 my-1" />
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">Quản lý ngân sách phòng</span>
                      <Link to="/budget" className="text-xs text-blue-400 hover:underline">Quản lý</Link>
                    </div>
                    <div className="border-t border-white/5 my-1" />
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">Báo cáo kế hoạch AI</span>
                      <Link to="/plans" className="text-xs text-blue-400 hover:underline">Kế hoạch</Link>
                    </div>
                  </AppCard>
                </div>
              </section>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
