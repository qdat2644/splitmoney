import { motion } from 'framer-motion';
import {
  Activity,
  ArrowRight,
  CalendarRange,
  Receipt,
  Users,
  Wallet,
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
        eyebrow="Group"
        title="Workspace overview"
        subtitle="Financial health, unresolved balances, plans, and shared activity."
        actions={
          <>
            <ExportButton
              label="Export room data"
              filename={`room_${roomId}`}
              onExport={(format) => exportApi.exportRoom(roomId, format)}
            />
            <AppButton onClick={onAddExpense} className="hidden sm:flex">
              Add expense
            </AppButton>
          </>
        }
      />

      {loadingRoom ? (
        <SkeletonPage />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <SummaryCard
              icon={Wallet}
              label="Total spend"
              value={formatCurrency(stats.totalExpenses, true)}
              subtext={`${stats.totalCount} expenses`}
              colorClass="text-blue-400"
              bgClass="bg-blue-500/10"
              index={0}
            />
            <SummaryCard
              icon={Users}
              label="Members"
              value={members.length}
              subtext={`Avg ${formatCurrency(avgPerPerson, true)}/person`}
              colorClass="text-purple-400"
              bgClass="bg-purple-500/10"
              index={1}
            />
            <SummaryCard
              icon={Wallet}
              label="Unresolved"
              value={formatCurrency(unresolvedAmount, true)}
              subtext={`${settlements.length} open settlements`}
              colorClass="text-orange-400"
              bgClass="bg-orange-500/10"
              index={2}
            />
            <SummaryCard
              icon={CalendarRange}
              label="Active plans"
              value={activePlans.length}
              subtext={`${roomBudgets.length} shared budgets`}
              colorClass="text-emerald-400"
              bgClass="bg-emerald-500/10"
              index={3}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
            <AppCard className="p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-gray-500">Current health</p>
                  <h2 className="mt-1 text-lg font-semibold text-white">
                    {settlements.length === 0 ? 'Room is balanced' : 'Balances need attention'}
                  </h2>
                </div>
                <Link to={`/rooms/${roomId}/settlements`} className="text-xs text-blue-400 hover:text-blue-300">
                  Open settlements
                </Link>
              </div>

              {settlements.length === 0 ? (
                <EmptyState
                  icon={Wallet}
                  title="No unresolved balances"
                  description="Everyone is settled up."
                  color="emerald"
                  compact
                />
              ) : (
                <div className="mt-4 space-y-2">
                  {settlements.slice(0, 4).map((settlement, index) => (
                    <SettlementItem key={`${settlement.from}-${settlement.to}`} settlement={settlement} index={index} />
                  ))}
                </div>
              )}
            </AppCard>

            <InsightsWidget />
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <AppCard className="p-5">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-white">Active plans</h2>
                <Link to="/plans" className="text-xs text-blue-400 hover:text-blue-300">View plans</Link>
              </div>
              <div className="mt-4 space-y-3">
                {activePlans.length === 0 ? (
                  <p className="text-sm text-gray-500">No active shared plans yet.</p>
                ) : (
                  activePlans.slice(0, 3).map((plan) => (
                    <div key={plan.id} className="rounded-lg border border-white/5 bg-white/3 p-3">
                      <p className="text-sm font-medium text-white">{plan.title}</p>
                      <p className="mt-1 text-xs text-gray-500">{formatCurrency(plan.estimatedTotal || 0, true)}</p>
                    </div>
                  ))
                )}
              </div>
            </AppCard>

            <AppCard className="p-5">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-white">Shared budgets</h2>
                <Link to="/budget" className="text-xs text-blue-400 hover:text-blue-300">Manage</Link>
              </div>
              <div className="mt-4 space-y-3">
                {roomBudgets.length === 0 ? (
                  <p className="text-sm text-gray-500">No room budgets configured.</p>
                ) : (
                  roomBudgets.slice(0, 3).map((budget) => (
                    <div key={budget.id} className="rounded-lg border border-white/5 bg-white/3 p-3">
                      <p className="text-sm font-medium text-white">{budget.title || budget.category}</p>
                      <p className="mt-1 text-xs text-gray-500">{formatCurrency(budget.amount, true)}</p>
                    </div>
                  ))
                )}
              </div>
            </AppCard>

            <AppCard className="p-5">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-white">Member balances</h2>
                <Link to={`/rooms/${roomId}/members`} className="text-xs text-blue-400 hover:text-blue-300">Members</Link>
              </div>
              <div className="mt-4 divide-y divide-white/5">
                {stats.perMember.map((memberBalance, index) => {
                  const member = members.find((item) => item.id === memberBalance.id);
                  const positive = memberBalance.balance > 1;
                  const negative = memberBalance.balance < -1;

                  return (
                    <motion.div
                      key={memberBalance.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: index * 0.05 }}
                      className="flex items-center gap-3 py-3"
                    >
                      <Avatar member={member} size="sm" />
                      <span className="min-w-0 flex-1 truncate text-sm text-gray-300">{memberBalance.name}</span>
                      <span className={`text-sm font-semibold ${positive ? 'text-emerald-400' : negative ? 'text-red-400' : 'text-gray-500'}`}>
                        {positive ? '+' : ''}{formatCurrency(memberBalance.balance, true)}
                      </span>
                    </motion.div>
                  );
                })}
              </div>
            </AppCard>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-base font-semibold text-white">
                <Activity className="h-4 w-4 text-gray-400" />
                Recent activity
              </h2>
              <Link to={`/rooms/${roomId}/expenses`} className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300">
                View all <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            {recentExpenses.length === 0 ? (
              <EmptyState
                icon={Receipt}
                title="No expenses yet"
                description="Record the first shared expense for this room."
                action={<AppButton onClick={onAddExpense} size="sm">Add expense</AppButton>}
                compact
              />
            ) : (
              recentExpenses.map((expense, index) => (
                <ExpenseCard key={expense.id} expense={expense} onEdit={onEditExpense} index={index} />
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}
