// PersonalDashboard.jsx — Standalone personal finance overview
// Rebuilt into a modern workspace-oriented, AI-native SaaS dashboard layout.
import { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Wallet, CalendarDays, TrendingUp, DoorOpen,
  AlertCircle, RefreshCw, Plus, LogOut, PiggyBank, Map, Bot, ArrowRight
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useDashboardSummary } from '../hooks/useDashboardSummary';
import { useBudgets } from '../hooks/useBudgets';
import { formatCurrency } from '../utils/formatters';
import { exportApi } from '../services/apiClient';

import NetBalanceHero  from '../components/personal/NetBalanceHero';
import SummaryCard     from '../components/personal/SummaryCard';
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
import ContextualCopilotPanel from '../components/copilot/ContextualCopilotPanel';

export default function PersonalDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data, loading, error, refetch } = useDashboardSummary();
  const { status: budgetStatus } = useBudgets();

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Chào buổi sáng';
    if (h < 18) return 'Chào buổi chiều';
    return 'Chào buổi tối';
  };

  return (
    <>
      <main className="max-w-6xl mx-auto space-y-6">
        {/* Page heading */}
        <PageHeader
          eyebrow={`${greeting()},`}
          title={<>{user?.name} <span className="text-gray-400">👋</span></>}
          actions={
            <ExportButton
              label="Xuất dữ liệu cá nhân"
              filename="personal_data"
              onExport={(format) => exportApi.exportMe(format)}
            />
          }
        />

        {/* ── Loading ── */}
        {loading && <DashboardSkeleton />}

        {/* ── Error ── */}
        {!loading && error && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="glass-card p-8 flex flex-col items-center gap-4 border border-red-500/10"
          >
            <AlertCircle className="w-10 h-10 text-red-400" />
            <p className="text-white font-semibold text-sm">Không thể tải dữ liệu</p>
            <p className="text-gray-400 text-xs text-center">{error}</p>
            <button onClick={refetch} className="btn-primary flex items-center gap-2 text-xs">
              <RefreshCw className="w-3.5 h-3.5" /> Thử lại
            </button>
          </motion.div>
        )}

        {/* ── Data ── */}
        {!loading && !error && data && (
          <>
            {/* ── Zero state ── */}
            {data.activeRoomsCount === 0 ? (
              <EmptyState 
                icon={DoorOpen}
                title="Bạn chưa tham gia phòng nào"
                description="Tạo một phòng mới hoặc tham gia phòng có sẵn để bắt đầu theo dõi chi tiêu nhóm."
                action={
                  <AppButton onClick={() => navigate('/rooms')} icon={Plus}>
                    Tạo / Tham gia phòng
                  </AppButton>
                }
              />
            ) : (
              <div className="space-y-6">
                {/* ── Hero Area: Net balance & Summaries ── */}
                <div className="grid lg:grid-cols-3 gap-4">
                  <div className="lg:col-span-2">
                    <NetBalanceHero
                      netBalance={data.netBalance}
                      totalIOwe={data.totalIOwe}
                      totalOwedToMe={data.totalOwedToMe}
                    />
                  </div>

                  <div className="grid grid-cols-2 lg:grid-cols-1 gap-3">
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
                </div>

                {/* ── Modern Workspace Main Grid ── */}
                <div className="grid lg:grid-cols-3 gap-6">
                  {/* Left Side: Workspace Core (Financial aggregates, charts, budgets) */}
                  <div className="lg:col-span-2 space-y-6">
                    {/* Financial Health Section */}
                    <section className="space-y-2.5">
                      <h3 className="text-[11px] font-medium text-gray-500">Cân đối tài chính</h3>
                      <div className="grid sm:grid-cols-2 gap-4">
                        <CategoryBreakdown data={data.categoryBreakdown} />
                        <RoomBreakdownList data={data.roomBreakdown} />
                      </div>
                    </section>

                    {/* Recent Activity Section */}
                    <section className="space-y-2.5">
                      <h3 className="text-[11px] font-medium text-gray-500">Giao dịch và xu hướng</h3>
                      <div className="grid sm:grid-cols-2 gap-4">
                        <RecentExpensesList data={data.recentExpenses} />
                        <MonthlyTrendChart data={data.monthlyTrend} />
                      </div>
                      <MonthlyComparisonCard monthlyTrend={data.monthlyTrend} />
                    </section>

                    {/* Financial Health / Budgets & Stats */}
                    <section className="space-y-2.5">
                      <h3 className="text-[11px] font-medium text-gray-500">Ngân sách và phân tích chi tiết</h3>
                      <BudgetStatusCard status={budgetStatus} />
                      <AnalyticsDashboard />
                    </section>
                  </div>

                  {/* Right Side: Intelligence Rail (AI insights, recommendations, alerts, quick actions) */}
                  <div className="space-y-6">
                    {/* AI Workspace context */}
                    <section className="space-y-2.5">
                      <h3 className="text-[11px] font-medium text-gray-500">Trợ lý AI</h3>
                      <AppCard className="overflow-hidden p-0 border border-white/5 bg-dark-800">
                        <div className="p-4 flex flex-col gap-3">
                          <div className="flex items-center gap-2">
                            <Bot className="h-4 w-4 text-purple-400" />
                            <p className="text-xs font-semibold text-white">Trợ lý tương tác</p>
                          </div>
                          <p className="text-xs text-gray-400 leading-relaxed">
                            Xem phân tích chuyên sâu, tạo kế hoạch thông minh và nhận cảnh báo rủi ro từ trợ lý AI.
                          </p>
                          <AppButton size="sm" onClick={() => navigate('/copilot')} icon={ArrowRight} className="w-full">
                            Mở trợ lý AI
                          </AppButton>
                        </div>
                      </AppCard>
                    </section>

                    {/* AI Priorities / Alerts */}
                    <section className="space-y-2.5">
                      <h3 className="text-[11px] font-medium text-gray-500">Thông báo quan trọng</h3>
                      <ContextualCopilotPanel
                        title="Rủi ro & Cảnh báo"
                        types={['budget_risk', 'overspending_warning', 'debt_attention', 'spending_velocity']}
                      />
                    </section>

                    {/* AI Coach Insights */}
                    <section className="space-y-2.5">
                      <h3 className="text-[11px] font-medium text-gray-500">Gợi ý tài chính</h3>
                      <InsightsSection />
                    </section>

                    {/* Shortcuts / Quick Actions */}
                    <section className="space-y-2.5">
                      <h3 className="text-[11px] font-medium text-gray-500">Lối tắt</h3>
                      <div className="space-y-2">
                        <AppCard className="flex items-center justify-between px-3.5 py-2.5 bg-dark-800 border border-white/5">
                          <div className="flex items-center gap-2">
                            <PiggyBank className="w-4 h-4 text-emerald-400" />
                            <span className="text-xs text-gray-300">Quản lý ngân sách</span>
                          </div>
                          <AppButton
                            variant="secondary"
                            size="xs"
                            onClick={() => navigate('/budget')}
                            icon={PiggyBank}
                          >
                            Chỉnh sửa
                          </AppButton>
                        </AppCard>

                        {/* Top spending alerts */}
                        {(data.highestSpendingCategory || data.highestSpendingRoom) && (
                          <div className="space-y-2 mt-3">
                            {data.highestSpendingCategory && (
                              <div className="glass-card px-3.5 py-2.5 flex items-center gap-2 border border-white/5 bg-dark-800">
                                <TrendingUp className="w-4 h-4 text-orange-400" />
                                <div className="min-w-0">
                                  <p className="text-[10px] font-medium text-gray-500">Chi nhiều nhất</p>
                                  <p className="text-xs font-semibold text-white truncate">{data.highestSpendingCategory}</p>
                                </div>
                              </div>
                            )}
                            {data.highestSpendingRoom && (
                              <div className="glass-card px-3.5 py-2.5 flex items-center gap-2 border border-white/5 bg-dark-800">
                                <DoorOpen className="w-4 h-4 text-blue-400" />
                                <div className="min-w-0">
                                  <p className="text-[10px] font-medium text-gray-500">Phòng chi nhiều nhất</p>
                                  <p className="text-xs font-semibold text-white truncate">{data.highestSpendingRoom}</p>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </section>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </>
  );
}
