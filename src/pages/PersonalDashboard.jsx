// PersonalDashboard.jsx — Standalone personal finance overview
// This page is completely independent from AppContext room state.
// All data comes from GET /api/users/me/summary (backend aggregation).
import { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Wallet, CalendarDays, TrendingUp, DoorOpen,
  AlertCircle, RefreshCw, Plus, LogOut, PiggyBank, Map
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useDashboardSummary } from '../hooks/useDashboardSummary';
import { useBudgets } from '../hooks/useBudgets';
import { formatCurrency } from '../utils/formatters';
import { exportApi } from '../services/apiClient';

import NetBalanceHero  from '../components/personal/NetBalanceHero';
import SummaryCard     from '../components/personal/SummaryCard';
import CategoryBreakdown from '../components/personal/CategoryBreakdown';
import MonthlyTrendChart from '../components/personal/MonthlyTrendChart';
import RoomBreakdownList from '../components/personal/RoomBreakdownList';
import RecentExpensesList from '../components/personal/RecentExpensesList';
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

export default function PersonalDashboard() {
  const { user, logout } = useAuth();
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
      {/* ── Main content ─────────────────────────────────────────────── */}
      <main className="max-w-6xl mx-auto space-y-6">

        {/* Page heading */}
        <PageHeader
          eyebrow={`${greeting()},`}
          title={<>{user?.name} <span className="gradient-text">👋</span></>}
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
            className="glass-card p-8 flex flex-col items-center gap-4 border border-red-500/20"
          >
            <AlertCircle className="w-12 h-12 text-red-400" />
            <p className="text-white font-semibold">Không thể tải dữ liệu</p>
            <p className="text-gray-400 text-sm text-center">{error}</p>
            <button onClick={refetch} className="btn-primary flex items-center gap-2 text-sm">
              <RefreshCw className="w-4 h-4" /> Thử lại
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
              <>
                {/* ── Row 1: Hero + 4 cards ── */}
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
                      label="Số phòng hoạt động"
                      value={`${data.activeRoomsCount} phòng`}
                      icon={DoorOpen}
                      color="purple"
                      index={1}
                    />
                  </div>
                </div>

                {/* ── Row 2: Category + Room breakdown ── */}
                <div className="grid md:grid-cols-2 gap-4">
                  <CategoryBreakdown data={data.categoryBreakdown} />
                  <RoomBreakdownList data={data.roomBreakdown} />
                </div>

                {/* ── Row 3: Comparison + Recent + Monthly trend ── */}
                <div className="grid md:grid-cols-2 gap-4">
                  <RecentExpensesList data={data.recentExpenses} />
                  <MonthlyTrendChart data={data.monthlyTrend} />
                </div>

                {/* ── Monthly comparison card ── */}
                <MonthlyComparisonCard monthlyTrend={data.monthlyTrend} />

                {/* ── Row 4: AI Insights (full width) ── */}
                <InsightsSection />

                {/* ── Row 5: Advanced analytics ── */}
                <AnalyticsDashboard />

                {/* ── Row 6: Budget Status ── */}
                <BudgetStatusCard status={budgetStatus} />

                {/* ── Budget quick action ── */}
                <motion.div
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                >
                  <AppCard className="flex items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-2">
                      <PiggyBank className="w-4 h-4 text-emerald-400" />
                      <span className="text-sm text-gray-300">Quản lý ngân sách</span>
                    </div>
                    <AppButton
                      variant="secondary"
                      size="sm"
                      onClick={() => navigate('/budget')}
                      icon={PiggyBank}
                    >
                      Chỉnh sửa
                    </AppButton>
                  </AppCard>
                </motion.div>

                {/* ── Highest spending callout ── */}
                {(data.highestSpendingCategory || data.highestSpendingRoom) && (
                  <motion.div
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="flex flex-wrap gap-3"
                  >
                    {data.highestSpendingCategory && (
                      <div className="glass-card px-4 py-3 flex items-center gap-2 border border-white/5">
                        <TrendingUp className="w-4 h-4 text-orange-400" />
                        <span className="text-xs text-gray-400">Danh mục chi nhiều nhất:</span>
                        <span className="text-xs font-semibold text-white">{data.highestSpendingCategory}</span>
                      </div>
                    )}
                    {data.highestSpendingRoom && (
                      <div className="glass-card px-4 py-3 flex items-center gap-2 border border-white/5">
                        <DoorOpen className="w-4 h-4 text-blue-400" />
                        <span className="text-xs text-gray-400">Phòng chi nhiều nhất:</span>
                        <span className="text-xs font-semibold text-white">{data.highestSpendingRoom}</span>
                      </div>
                    )}
                  </motion.div>
                )}
              </>
            )}
          </>
        )}
      </main>
    </>
  );
}


