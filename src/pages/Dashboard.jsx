// Dashboard.jsx — Main overview page
import { motion } from 'framer-motion';
import {
  Wallet, Receipt, Users, TrendingDown, TrendingUp, ArrowRight, Clock
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import SummaryCard from '../components/dashboard/SummaryCard';
import ExpenseCard from '../components/expenses/ExpenseCard';
import { SettlementItem } from '../components/settlements/SettlementList';
import { formatCurrency, formatDate } from '../utils/formatters';
import Avatar from '../components/ui/Avatar';
import { Link } from 'react-router-dom';
import InsightsWidget from '../components/dashboard/InsightsWidget';
import BudgetWidget from '../components/dashboard/BudgetWidget';
import ExportButton from '../components/ui/ExportButton';
import PageHeader from '../components/ui/PageHeader';
import EmptyState from '../components/ui/EmptyState';
import AppButton from '../components/ui/AppButton';
import AppCard from '../components/ui/AppCard';
import { exportApi } from '../services/apiClient';
import { SkeletonPage } from '../components/ui/Skeleton';

export default function Dashboard({ onAddExpense, onEditExpense }) {
  const { stats, members, expenses, settlements, currentRoom, loadingRoom } = useApp();
  const roomId = currentRoom?.roomId || 'local';

  const topPayer = members.find((m) => m.id === stats.topPayer?.id);
  const topDebtor = members.find((m) => m.id === stats.topDebtor?.id);
  const recentExpenses = [...expenses]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 3);

  const avgPerPerson = members.length > 0
    ? stats.totalExpenses / members.length
    : 0;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Page header */}
      <PageHeader
        title="Dashboard"
        subtitle="Tổng quan chi tiêu nhóm"
        actions={
          <>
            <ExportButton
              label="Xuất dữ liệu phòng"
              filename={`room_${roomId}`}
              onExport={(format) => exportApi.exportRoom(roomId, format)}
            />
            <AppButton onClick={onAddExpense} className="hidden sm:flex">
              Thêm chi phí
            </AppButton>
          </>
        }
      />

      {loadingRoom ? (
        <SkeletonPage />
      ) : (
        <>
          {/* Stats grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <SummaryCard
          icon={Wallet}
          label="Tổng chi tiêu"
          value={formatCurrency(stats.totalExpenses, true)}
          subtext={`${stats.totalCount} khoản chi`}
          colorClass="text-blue-400"
          bgClass="bg-blue-500/10"
          index={0}
        />
        <SummaryCard
          icon={Users}
          label="Thành viên"
          value={members.length}
          subtext={`TB ${formatCurrency(avgPerPerson, true)}/người`}
          colorClass="text-purple-400"
          bgClass="bg-purple-500/10"
          index={1}
        />
        <SummaryCard
          icon={TrendingUp}
          label="Trả nhiều nhất"
          value={topPayer?.name ?? '—'}
          subtext={topPayer ? formatCurrency(stats.topPayer.amount, true) : 'Chưa có'}
          colorClass="text-emerald-400"
          bgClass="bg-emerald-500/10"
          index={2}
        />
        <SummaryCard
          icon={TrendingDown}
          label="Nợ nhiều nhất"
          value={topDebtor?.name ?? '—'}
          subtext={topDebtor ? formatCurrency(Math.abs(stats.topDebtor.amount), true) : 'Cân bằng'}
          colorClass="text-red-400"
          bgClass="bg-red-500/10"
          index={3}
        />
      </div>

      {/* Main content grid */}
      <div className="grid lg:grid-cols-3 gap-4">
        {/* Recent expenses — takes 2 cols */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-gray-400" />
              Gần đây
            </h2>
            <Link to={`/rooms/${roomId}/expenses`} className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1">
              Xem tất cả <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          {recentExpenses.length === 0 ? (
            <EmptyState
              icon={Receipt}
              title="Chưa có khoản chi nào"
              description="Ghi lại khoản chi đầu tiên của nhóm bạn."
              action={<AppButton onClick={onAddExpense} size="sm">Thêm chi phí</AppButton>}
              compact
            />
          ) : (
            recentExpenses.map((e, i) => (
              <ExpenseCard key={e.id} expense={e} onEdit={onEditExpense} index={i} />
            ))
          )}
        </div>

        {/* Right column */}
        <div className="space-y-4">
          <InsightsWidget />

          <BudgetWidget />

          {/* Quick settlements */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-semibold text-white">Công nợ</h2>
              <Link to={`/rooms/${roomId}/settlements`} className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1">
                Chi tiết <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            {settlements.length === 0 ? (
              <EmptyState
                icon={Wallet}
                title="Cân bằng hoàn toàn"
                description="Không ai nợ ai!"
                color="emerald"
                compact
              />
            ) : (
              <div className="space-y-2">
                {settlements.slice(0, 3).map((s, i) => (
                  <SettlementItem key={`${s.from}-${s.to}`} settlement={s} index={i} />
                ))}
                {settlements.length > 3 && (
                  <Link to={`/rooms/${roomId}/settlements`} className="block text-center text-xs text-blue-400 hover:text-blue-300 mt-1">
                    +{settlements.length - 3} giao dịch nữa
                  </Link>
                )}
              </div>
            )}
          </div>

          {/* Member balances */}
          <div>
            <h2 className="text-base font-semibold text-white mb-3">Số dư thành viên</h2>
            <AppCard className="divide-y divide-white/5">
              {stats.perMember.map((m, i) => {
                const member = members.find((mem) => mem.id === m.id);
                const isPos = m.balance > 1;
                const isNeg = m.balance < -1;
                return (
                  <motion.div
                    key={m.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.05 }}
                    className="flex items-center gap-3 px-4 py-3"
                  >
                    <Avatar member={member} size="sm" />
                    <span className="text-sm text-gray-300 flex-1">{m.name}</span>
                    <span className={`text-sm font-semibold
                      ${isPos ? 'text-emerald-400' : isNeg ? 'text-red-400' : 'text-gray-500'}`}>
                      {isPos ? '+' : ''}{formatCurrency(m.balance, true)}
                    </span>
                  </motion.div>
                );
              })}
            </AppCard>
          </div>
        </div>
      </div>
      </>
      )}
    </div>
  );
}
