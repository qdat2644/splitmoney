// PlansPage.jsx — Planning Foundation UI (with plan expense CRUD + conversion)
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Map, Plus, Calendar, Trash2, CheckCircle, Archive,
  Clock, AlertCircle, RefreshCw, Wallet, LogOut, DoorOpen,
  ListChecks, ArrowRight, ChevronDown, ChevronRight, Pencil, Link2,
  Sparkles, Users
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { usePlans } from '../hooks/usePlans';
import { useApp } from '../context/AppContext';
import { useConfirm } from '../hooks/useConfirm';
import { formatCurrency } from '../utils/formatters';
import PlanExpenseModal from '../components/expenses/PlanExpenseModal';
import ConvertExpenseModal from '../components/expenses/ConvertExpenseModal';
import EditPlanModal from '../components/plans/EditPlanModal';
import PageHeader from '../components/ui/PageHeader';
import EmptyState from '../components/ui/EmptyState';
import AppButton from '../components/ui/AppButton';
import AppCard from '../components/ui/AppCard';
import AppInput from '../components/ui/AppInput';
import AppSelect from '../components/ui/AppSelect';
import ErrorState from '../components/ui/ErrorState';
import { ModalLayout, ModalHeader, ModalBody, ModalFooter } from '../components/ui/ModalLayout';
import { SkeletonCard } from '../components/ui/Skeleton';

const PLAN_TYPES = {
  trip: '✈️ Chuyến đi', party: '🎉 Tiệc', event: '📅 Sự kiện',
  moving: '🏠 Chuyển nhà', wedding: '💍 Đám cưới', custom: '📋 Khác',
};
const PLAN_STATUS_COLORS = {
  draft: 'text-gray-400 bg-gray-500/10', active: 'text-blue-400 bg-blue-500/10',
  completed: 'text-emerald-400 bg-emerald-500/10', archived: 'text-gray-500 bg-gray-600/10',
};
const PLAN_STATUS_ICONS = {
  draft: Clock, active: Map, completed: CheckCircle, archived: Archive,
};
const SPLIT_TYPE_LABELS = { equal: 'Đều nhau', exact: 'Số tiền cụ thể', percentage: 'Phần trăm' };

const CATEGORY_ICONS = {
  food: '🍜', drinks: '☕', transport: '🚗', accommodation: '🏠',
  grocery: '🛒', entertainment: '🎮', other: '📦',
};

const TRACKING_STATUS = {
  under_budget: { label: 'Trong ngân sách', className: 'text-emerald-300 bg-emerald-500/10 border-emerald-500/20' },
  near_limit: { label: 'Gần chạm ngân sách', className: 'text-amber-300 bg-amber-500/10 border-amber-500/20' },
  over_budget: { label: 'Vượt ngân sách', className: 'text-red-300 bg-red-500/10 border-red-500/20' },
  no_budget: { label: 'Chưa đặt ngân sách', className: 'text-gray-300 bg-white/5 border-white/10' },
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function buildFallbackTracking() {
  return {
    targetBudgetAmount: null, plannedTotal: 0, actualTotal: 0,
    remainingAmount: 0, progressPercent: 0, status: 'no_budget',
    varianceAmount: 0, itemBreakdown: [], categoryBreakdown: [], spendingCount: 0,
  };
}

function formatTrackingVariance(tracking) {
  if (!tracking.actualTotal) return 'Chưa có chi tiêu thực tế';
  if (tracking.varianceAmount > 0) return `Vượt ${formatCurrency(tracking.varianceAmount, true)}`;
  if (tracking.varianceAmount < 0) return `Còn lại ${formatCurrency(Math.abs(tracking.varianceAmount), true)}`;
  return 'Đúng ngân sách';
}

// ── SummaryBar ─────────────────────────────────────────────────────────────────
// Always-visible top section of a plan card. Target height 150-220px.
function SummaryBar({ plan, onStatusChange, onEditPlan, onDelete, expanded, onToggle }) {
  const tracking = plan.tracking ?? buildFallbackTracking();
  const Icon = PLAN_STATUS_ICONS[plan.status] ?? Clock;
  const referenceAmount = tracking.targetBudgetAmount ?? tracking.plannedTotal;
  const rawPercent = tracking.progressPercent || 0;
  const progressWidth = Math.min(100, Math.max(0, rawPercent));
  const status = TRACKING_STATUS[tracking.status] ?? TRACKING_STATUS.no_budget;
  const isOverBudget = tracking.status === 'over_budget';
  const isNearLimit = tracking.status === 'near_limit';
  const percentColor = isOverBudget ? 'text-red-400' : isNearLimit ? 'text-amber-400' : 'text-emerald-400';
  const barColor = isOverBudget ? 'bg-red-400' : isNearLimit ? 'bg-amber-400' : 'bg-emerald-400';
  const hasData = referenceAmount > 0;

  return (
    <div className="p-4 space-y-3">
      {/* Title row */}
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xl leading-none">{(PLAN_TYPES[plan.type] ?? '📋').split(' ')[0]}</span>
            <h3 className="font-semibold text-white text-base leading-tight truncate">{plan.name}</h3>
            <span className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full font-medium ${PLAN_STATUS_COLORS[plan.status]}`}>
              <Icon className="w-3 h-3" />
              {plan.status}
            </span>
          </div>
          {plan.startDate && (
            <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {new Date(plan.startDate).toLocaleDateString('vi-VN')}
              {plan.endDate && ` – ${new Date(plan.endDate).toLocaleDateString('vi-VN')}`}
            </p>
          )}
        </div>

        {/* Controls */}
        <div className="flex items-center gap-1 shrink-0">
          <select
            value={plan.status}
            onChange={e => onStatusChange(plan.id, e.target.value)}
            onClick={e => e.stopPropagation()}
            className="text-xs bg-white/5 border border-white/10 text-gray-300 rounded px-1.5 py-1 focus:outline-none"
          >
            {Object.keys(PLAN_STATUS_COLORS).map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <button onClick={() => onEditPlan(plan)} className="btn-icon w-7 h-7" title="Sửa kế hoạch">
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => onDelete(plan.id)} className="btn-icon w-7 h-7 text-red-400/60 hover:text-red-400 hover:bg-red-500/10" title="Xoá">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Budget metrics row */}
      {hasData && (
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-white/[0.03] rounded-lg px-2.5 py-2">
            <p className="text-[10px] text-gray-500">{tracking.targetBudgetAmount != null ? 'Ngân sách' : 'Dự kiến'}</p>
            <p className="text-sm font-semibold text-white tabular-nums">{formatCurrency(referenceAmount, true)}</p>
          </div>
          <div className="bg-white/[0.03] rounded-lg px-2.5 py-2">
            <p className="text-[10px] text-gray-500">Đã tiêu</p>
            <p className={`text-sm font-semibold tabular-nums ${isOverBudget ? 'text-red-300' : 'text-white'}`}>{formatCurrency(tracking.actualTotal, true)}</p>
          </div>
          <div className="bg-white/[0.03] rounded-lg px-2.5 py-2">
            <p className="text-[10px] text-gray-500">Còn lại</p>
            <p className={`text-sm font-semibold tabular-nums ${tracking.remainingAmount < 0 ? 'text-red-300' : 'text-emerald-300'}`}>{formatCurrency(tracking.remainingAmount, true)}</p>
          </div>
        </div>
      )}

      {/* Progress bar */}
      {hasData && (
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-32 sm:w-48 overflow-hidden rounded-full bg-white/8">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                  style={{ width: `${progressWidth}%` }}
                />
              </div>
              <span className={`text-xs font-bold tabular-nums ${percentColor}`}>
                {isOverBudget && '⚠ '}{Math.round(rawPercent)}%
              </span>
            </div>
            <span className={`text-[11px] px-2 py-0.5 rounded-full border font-medium ${status.className}`}>
              {status.label}
            </span>
          </div>
        </div>
      )}

      {/* Expand toggle */}
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-center gap-1.5 pt-0.5 text-xs text-gray-500 hover:text-gray-300 transition-colors"
      >
        {expanded ? (
          <><ChevronDown className="w-3.5 h-3.5" />Thu gọn</>
        ) : (
          <><ChevronRight className="w-3.5 h-3.5" />Xem chi tiết</>
        )}
      </button>
    </div>
  );
}

// ── Tab: Tổng quan ─────────────────────────────────────────────────────────────
function OverviewTab({ plan }) {
  const tracking = plan.tracking ?? buildFallbackTracking();
  const referenceAmount = tracking.targetBudgetAmount ?? tracking.plannedTotal;
  const expenses = plan.expenses ?? [];
  const spendings = plan.spendings ?? [];
  const convertedCount = expenses.filter(e => !!e.convertedToExpenseId).length;
  const insights = [];

  if (tracking.status === 'under_budget' && tracking.actualTotal > 0) insights.push({ icon: '✓', text: 'Đang trong ngân sách', color: 'text-emerald-400' });
  if (tracking.status === 'near_limit') insights.push({ icon: '⚠', text: 'Gần chạm ngân sách — cần chú ý', color: 'text-amber-400' });
  if (tracking.status === 'over_budget') insights.push({ icon: '✗', text: `Vượt ngân sách ${formatCurrency(Math.abs(tracking.varianceAmount), true)}`, color: 'text-red-400' });
  if (tracking.remainingAmount > 0) insights.push({ icon: '✓', text: `${formatCurrency(tracking.remainingAmount, true)} còn lại`, color: 'text-gray-300' });
  if (convertedCount > 0) insights.push({ icon: '✓', text: `${convertedCount} mục kế hoạch đã chuyển sang phòng`, color: 'text-blue-300' });
  if (spendings.length > 0) insights.push({ icon: '✓', text: `${spendings.length} khoản chi thực tế đã ghi nhận`, color: 'text-gray-300' });
  if (!tracking.actualTotal && !referenceAmount) insights.push({ icon: '→', text: 'Thêm mục dự kiến hoặc chi tiêu thực tế để bắt đầu theo dõi', color: 'text-gray-500' });

  return (
    <div className="space-y-4">
      {/* Full progress bar */}
      {referenceAmount > 0 && (
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-gray-500">
            <span>Tiến độ ngân sách</span>
            <span className="font-medium">{formatCurrency(tracking.actualTotal, true)} / {formatCurrency(referenceAmount, true)}</span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-white/8">
            <div
              className={`h-full rounded-full transition-all duration-700 ${
                tracking.status === 'over_budget' ? 'bg-red-400' :
                tracking.status === 'near_limit' ? 'bg-amber-400' : 'bg-emerald-400'
              }`}
              style={{ width: `${Math.min(100, tracking.progressPercent || 0)}%` }}
            />
          </div>
        </div>
      )}

      {/* Insights */}
      {insights.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">Nhận xét</p>
          {insights.map((ins, i) => (
            <div key={i} className="flex items-start gap-2">
              <span className={`text-xs font-bold mt-0.5 ${ins.color}`}>{ins.icon}</span>
              <span className={`text-sm ${ins.color}`}>{ins.text}</span>
            </div>
          ))}
        </div>
      )}

      {/* Participants */}
      {(plan.participants?.length ?? 0) > 0 && (
        <div>
          <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wide mb-1.5">Người tham gia</p>
          <div className="flex flex-wrap gap-1.5">
            {plan.participants.map((p, i) => (
              <span key={p.id ?? i} className="text-xs px-2 py-0.5 rounded-full bg-white/5 border border-white/5 text-gray-300">
                {p.user?.name ?? p.guestMember?.displayName ?? p.displayName ?? 'Ẩn danh'}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Tab: Dự kiến ───────────────────────────────────────────────────────────────
function PlannedTab({ plan, onAddExpense, onEditExpense, onDeleteExpense, onConvertExpense }) {
  const expenses = plan.expenses ?? [];
  const spendings = plan.spendings ?? [];

  // Count actual spendings linked to each planned item
  const linkedCountById = {};
  for (const s of spendings) {
    if (s.linkedPlanExpenseId) linkedCountById[s.linkedPlanExpenseId] = (linkedCountById[s.linkedPlanExpenseId] || 0) + 1;
  }
  // Also count converted room expenses
  for (const e of expenses) {
    if (e.convertedToExpenseId && !linkedCountById[e.id]) linkedCountById[e.id] = 1;
  }

  return (
    <div className="space-y-2">
      {expenses.length === 0 ? (
        <div className="rounded-xl border border-dashed border-white/10 py-8 text-center">
          <p className="text-xs text-gray-500 mb-3">Chưa có mục kế hoạch nào</p>
          <button
            onClick={() => onAddExpense(plan.id)}
            className="inline-flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Thêm mục đầu tiên
          </button>
        </div>
      ) : (
        <>
          <div>
            {expenses.map(expense => {
              const isConverted = !!expense.convertedToExpenseId;
              const linkedCount = linkedCountById[expense.id] || 0;
              return (
                <div
                  key={expense.id}
                  className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] transition-colors mb-1.5"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-base leading-none">{CATEGORY_ICONS[expense.category] ?? '📦'}</span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-white truncate">{expense.title}</p>
                      <div className="flex items-center gap-2 flex-wrap mt-0.5">
                        <span className="text-xs text-gray-400 font-semibold">{formatCurrency(expense.estimatedAmount, true)}</span>
                        <span className="text-gray-600 text-xs">·</span>
                        <span className="text-xs text-gray-500">{SPLIT_TYPE_LABELS[expense.splitType] ?? expense.splitType}</span>
                        {linkedCount > 0 && !isConverted && (
                          <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400">
                            <CheckCircle className="w-3 h-3" />
                            Có {linkedCount} khoản chi thực tế
                          </span>
                        )}
                        {isConverted && (
                          <span className="inline-flex items-center gap-1 text-[11px] text-blue-400">
                            <CheckCircle className="w-3 h-3" />
                            Đã ghi nhận chi tiêu
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {!isConverted && (
                      <>
                        <button onClick={() => onEditExpense(plan.id, expense)} className="btn-icon w-7 h-7 text-gray-500 hover:text-white" title="Sửa">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => onConvertExpense(plan.id, expense)} className="btn-icon w-7 h-7 text-blue-400/60 hover:text-blue-400 hover:bg-blue-500/10" title="Chuyển sang phòng">
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => onDeleteExpense(plan.id, expense.id)} className="btn-icon w-7 h-7 text-red-400/50 hover:text-red-400 hover:bg-red-500/10" title="Xoá">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Total row */}
          <div className="flex items-center justify-between pt-2 border-t border-white/5 text-xs">
            <span className="text-gray-500">Tổng ước tính</span>
            <span className="text-blue-300 font-bold">{formatCurrency(plan.estimatedTotal, true)}</span>
          </div>
        </>
      )}

      <button
        onClick={() => onAddExpense(plan.id)}
        className="w-full flex items-center justify-center gap-2 py-2 rounded-xl border border-dashed border-white/10 text-xs text-gray-400 hover:text-white hover:border-blue-500/40 hover:bg-blue-500/5 transition-all"
      >
        <Plus className="w-3.5 h-3.5" /> Thêm mục kế hoạch
      </button>
    </div>
  );
}

// ── Tab: Thực tế ───────────────────────────────────────────────────────────────
function ActualTab({ plan, onAddSpending, onEditSpending, onDeleteSpending }) {
  const spendings = plan.spendings ?? [];
  const expenses = plan.expenses ?? [];

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-1">
        <p className="text-xs text-gray-500">{spendings.length} khoản chi đã ghi nhận</p>
        <AppButton size="sm" variant="secondary" icon={Plus} onClick={() => onAddSpending(plan.id)}>
          Thêm
        </AppButton>
      </div>

      {spendings.length === 0 ? (
        <div className="rounded-xl border border-dashed border-white/10 py-8 text-center">
          <p className="text-xs text-gray-500 mb-1">Chưa có chi tiêu thực tế</p>
          <p className="text-[11px] text-gray-600">Khi có khoản chi phát sinh, hãy ghi lại để so sánh với kế hoạch.</p>
        </div>
      ) : (
        <div>
          {spendings.map(spending => {
            const linkedExpense = expenses.find(e => e.id === spending.linkedPlanExpenseId);
            return (
              <div
                key={spending.id}
                className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] transition-colors mb-1.5"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="text-base leading-none">{CATEGORY_ICONS[spending.category] ?? CATEGORY_ICONS.other}</span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white truncate">{spending.title}</p>
                    <div className="flex items-center gap-2 flex-wrap mt-0.5">
                      <span className="text-xs font-semibold text-emerald-300">{formatCurrency(spending.amount, true)}</span>
                      {spending.spentAt && <span className="text-xs text-gray-500">{new Date(spending.spentAt).toLocaleDateString('vi-VN')}</span>}
                      {linkedExpense && (
                        <span className="text-[11px] text-blue-400/80 truncate max-w-[140px]">
                          → {linkedExpense.title}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => onEditSpending(plan.id, spending)} className="btn-icon w-7 h-7 text-gray-500 hover:text-white" title="Sửa">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => onDeleteSpending(plan.id, spending.id)} className="btn-icon w-7 h-7 text-red-400/50 hover:text-red-400 hover:bg-red-500/10" title="Xoá">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Tab: Phân tích ─────────────────────────────────────────────────────────────
function AnalysisTab({ plan }) {
  const tracking = plan.tracking ?? buildFallbackTracking();
  const rows = tracking.itemBreakdown?.length ? tracking.itemBreakdown : tracking.categoryBreakdown ?? [];

  if (!rows.length) {
    return (
      <div className="rounded-xl border border-dashed border-white/10 py-8 text-center">
        <p className="text-xs text-gray-500">Chưa có dữ liệu phân tích.</p>
        <p className="text-[11px] text-gray-600 mt-1">Thêm mục dự kiến và chi tiêu thực tế để xem phân tích.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {rows.map((row, i) => {
        const isOver = row.varianceAmount > 0;
        const isUnused = row.actualAmount === 0 && row.plannedAmount > 0;
        const isOnTrack = !isOver && !isUnused && row.actualAmount > 0;

        const statusDot = isOver ? '🔴' : isUnused ? '🟡' : '🟢';
        const statusLabel = isOver ? 'Vượt ngân sách' : isUnused ? 'Chưa sử dụng' : 'Đúng kế hoạch';
        const statusColor = isOver ? 'border-red-500/20 bg-red-500/5' : isUnused ? 'border-amber-500/20 bg-amber-500/5' : 'border-emerald-500/20 bg-emerald-500/5';
        const labelColor = isOver ? 'text-red-400' : isUnused ? 'text-amber-400' : 'text-emerald-400';

        return (
          <div key={row.id ?? row.category ?? i} className={`rounded-lg border p-3 ${statusColor}`}>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="text-sm">{statusDot}</span>
                  <span className={`text-[11px] font-medium ${labelColor}`}>{statusLabel}</span>
                </div>
                <p className="text-sm font-medium text-white truncate">{row.title ?? row.category}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-xs text-gray-400">
                  <span className={isOver ? 'text-red-300 font-semibold' : 'text-white'}>{formatCurrency(row.actualAmount, true)}</span>
                  <span className="text-gray-600"> / </span>
                  <span className="text-gray-400">{formatCurrency(row.plannedAmount, true)}</span>
                </p>
                {isOver && (
                  <p className="text-[11px] text-red-400 font-semibold">+{formatCurrency(row.varianceAmount, true)}</p>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── PlanCard ───────────────────────────────────────────────────────────────────
const PLAN_TABS = ['Tổng quan', 'Dự kiến', 'Thực tế', 'Phân tích'];

function PlanCard({ plan, onDelete, onStatusChange, onAddExpense, onEditExpense, onDeleteExpense, onConvertExpense, onEditPlan, onAddSpending, onEditSpending, onDeleteSpending }) {
  const [expanded, setExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState(0);

  return (
    <div className="glass-card border border-white/5 hover:border-white/10 transition-colors overflow-hidden">
      {/* Level 1: Executive Summary */}
      <SummaryBar
        plan={plan}
        onStatusChange={onStatusChange}
        onEditPlan={onEditPlan}
        onDelete={onDelete}
        expanded={expanded}
        onToggle={() => setExpanded(e => !e)}
      />

      {/* Level 2+3: Tabs + Detail */}
      {expanded && (
        <div className="border-t border-white/5">
          {/* Tab bar */}
          <div className="flex items-center gap-0 px-4 pt-3 overflow-x-auto">
            {PLAN_TABS.map((tab, i) => (
              <button
                key={tab}
                onClick={() => setActiveTab(i)}
                className={`shrink-0 px-3 py-1.5 text-xs font-medium rounded-md transition-colors mr-1 ${
                  activeTab === i
                    ? 'bg-white/10 text-white'
                    : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Tab content — instant switch, no animation */}
          <div className="px-4 py-4">
            {activeTab === 0 && <OverviewTab plan={plan} />}
            {activeTab === 1 && (
              <PlannedTab
                plan={plan}
                onAddExpense={onAddExpense}
                onEditExpense={onEditExpense}
                onDeleteExpense={onDeleteExpense}
                onConvertExpense={onConvertExpense}
              />
            )}
            {activeTab === 2 && (
              <ActualTab
                plan={plan}
                onAddSpending={onAddSpending}
                onEditSpending={onEditSpending}
                onDeleteSpending={onDeleteSpending}
              />
            )}
            {activeTab === 3 && <AnalysisTab plan={plan} />}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Plan Spending Modal ────────────────────────────────────────────────────────
function PlanSpendingModal({ plan, spending, onClose, onSave }) {
  const [linkedPlanExpenseId, setLinkedPlanExpenseId] = useState(spending?.linkedPlanExpenseId ?? '');
  const [title, setTitle] = useState(spending?.title ?? '');
  const [amount, setAmount] = useState(spending?.amount ?? '');
  const [category, setCategory] = useState(spending?.category ?? 'other');
  const [spentAt, setSpentAt] = useState(spending?.spentAt ? spending.spentAt.split('T')[0] : new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState(spending?.note ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Track manually-edited fields so autofill never overwrites user input
  const isAddMode = !spending;
  const userEdited = useRef({ title: !isAddMode, amount: !isAddMode, category: !isAddMode, note: !isAddMode });

  // Autofill from linked planned item (add mode only, only unedited fields)
  useEffect(() => {
    if (!linkedPlanExpenseId || !isAddMode) return;
    const linked = (plan.expenses ?? []).find((e) => e.id === linkedPlanExpenseId);
    if (!linked) return;
    if (!userEdited.current.title) setTitle(linked.title ?? '');
    if (!userEdited.current.amount) setAmount(String(linked.estimatedAmount ?? ''));
    if (!userEdited.current.category) setCategory(linked.category ?? 'other');
    if (!userEdited.current.note && linked.note) setNote(linked.note);
  }, [linkedPlanExpenseId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!title.trim()) {
      setError('Vui lòng nhập tên khoản chi.');
      return;
    }
    if (!Number(amount) || Number(amount) <= 0) {
      setError('Số tiền phải lớn hơn 0.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await onSave({
        title: title.trim(),
        amount: Number(amount),
        category: category || null,
        spentAt: spentAt || undefined,
        linkedPlanExpenseId: linkedPlanExpenseId || null,
        note: note.trim() || null,
      });
    } catch (err) {
      setError(err.message || 'Không thể lưu chi tiêu.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalLayout open onClose={onClose} size="md">
      <ModalHeader title={spending ? 'Chỉnh sửa chi tiêu thực tế' : 'Thêm chi tiêu thực tế'} icon={Wallet} onClose={onClose} />
      <form onSubmit={handleSubmit}>
        <ModalBody className="space-y-4">
          {error && <p className="text-sm text-red-300">{error}</p>}

          {/* Linked planned item — placed first so autofill populates fields below */}
          <div>
            <AppSelect
              label="Gắn với hạng mục dự kiến"
              value={linkedPlanExpenseId}
              onChange={(event) => setLinkedPlanExpenseId(event.target.value)}
            >
              <option value="">Không gắn</option>
              {(plan.expenses ?? []).map((expense) => (
                <option key={expense.id} value={expense.id}>{expense.title}</option>
              ))}
            </AppSelect>
            {isAddMode && (
              <p className="mt-1.5 text-xs text-gray-500">
                Chọn hạng mục dự kiến để tự điền thông tin.
              </p>
            )}
          </div>

          <div className="border-t border-white/5" />

          <AppInput
            label="Tên khoản chi"
            value={title}
            onChange={(event) => {
              userEdited.current.title = true;
              setTitle(event.target.value);
              if (event.target.value.trim()) setError('');
            }}
            placeholder="Ví dụ: Ăn trưa Mì Quảng"
            required
          />
          <AppInput
            label="Số tiền"
            type="number"
            min="1"
            value={amount}
            onChange={(event) => {
              userEdited.current.amount = true;
              setAmount(event.target.value);
            }}
            required
          />
          <AppSelect
            label="Danh mục"
            value={category}
            onChange={(event) => {
              userEdited.current.category = true;
              setCategory(event.target.value);
            }}
          >
            {Object.keys(CATEGORY_ICONS).map((key) => (
              <option key={key} value={key}>{CATEGORY_ICONS[key]} {key}</option>
            ))}
          </AppSelect>
          <AppInput
            label="Ngày chi"
            type="date"
            value={spentAt}
            onChange={(event) => setSpentAt(event.target.value)}
          />
          <AppInput
            label="Ghi chú"
            value={note}
            onChange={(event) => {
              userEdited.current.note = true;
              setNote(event.target.value);
            }}
            placeholder="Không bắt buộc"
          />
        </ModalBody>
        <ModalFooter>
          <AppButton type="button" variant="secondary" onClick={onClose}>Hủy</AppButton>
          <AppButton type="submit" loading={saving}>Lưu chi tiêu</AppButton>
        </ModalFooter>
      </form>
    </ModalLayout>
  );
}


// ── Create Plan Modal ─────────────────────────────────────────────────────────
import PlanParticipantsInput from '../components/plans/PlanParticipantsInput';

function CreatePlanModal({ onClose, onCreate }) {
  const { currentUser } = useApp();
  const [name, setName]             = useState('');
  const [type, setType]             = useState('custom');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate]   = useState('');
  const [endDate, setEndDate]       = useState('');
  const [targetBudgetAmount, setTargetBudgetAmount] = useState('');
  const [participants, setParticipants] = useState(currentUser ? [{ name: currentUser.name, type: 'user', id: currentUser.userId || currentUser.id }] : []);
  const [saving, setSaving]         = useState(false);
  const [error, setError]           = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    setError('');
    try {
      await onCreate({ 
        name, type, description, 
        startDate: startDate || undefined, 
        endDate: endDate || undefined,
        targetBudgetAmount: targetBudgetAmount || null,
        participants 
      });
      onClose();
    } catch (err) {
      setError(err.message);
    } finally { setSaving(false); }
  };

  return (
    <ModalLayout open={true} onClose={onClose} size="md">
      <ModalHeader title="Tạo kế hoạch mới" icon={Map} onClose={onClose} />
      <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
        <ModalBody className="space-y-4">
          <AppInput
            label="Tên kế hoạch"
            required
            value={name} 
            onChange={e => setName(e.target.value)} 
            placeholder="VD: Chuyến đi Đà Lạt"
          />
          <AppSelect
            label="Loại kế hoạch"
            value={type} 
            onChange={e => setType(e.target.value)}
          >
            {Object.entries(PLAN_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </AppSelect>
          <AppInput
            multiline
            label="Mô tả (tuỳ chọn)"
            value={description} 
            onChange={e => setDescription(e.target.value)} 
            rows={2} 
            placeholder="Ghi chú..."
          />
          <AppInput
            type="number"
            min="0"
            label="Ngân sách mục tiêu"
            value={targetBudgetAmount}
            onChange={e => setTargetBudgetAmount(e.target.value)}
            placeholder="VD: 6000000"
            helperText="Dùng để so sánh chi tiêu thực tế với kế hoạch."
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <AppInput 
              type="date" 
              label="Ngày bắt đầu"
              value={startDate} 
              onChange={e => setStartDate(e.target.value)} 
              max={endDate || undefined} 
            />
            <AppInput 
              type="date" 
              label="Ngày kết thúc"
              value={endDate} 
              onChange={e => setEndDate(e.target.value)} 
              min={startDate || undefined} 
            />
          </div>
          
          <div className="pt-2 border-t border-white/5 mt-4">
            <PlanParticipantsInput value={participants} onChange={setParticipants} showRoomMembers={true} />
          </div>

          {error && (
            <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 mt-2">
              {error}
            </p>
          )}
        </ModalBody>
        <ModalFooter>
          <AppButton type="button" variant="secondary" onClick={onClose} className="w-full sm:w-auto">Huỷ</AppButton>
          <AppButton type="submit" loading={saving} icon={Plus} className="w-full sm:w-auto">
            Tạo
          </AppButton>
        </ModalFooter>
      </form>
    </ModalLayout>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────
import { planApi } from '../services/apiClient';
import AIPlanGeneratorPanel from '../components/plans/AIPlanGeneratorPanel';
import AIPlanBoard from '../components/plans/AIPlanBoard';
import ContextualCopilotPanel from '../components/copilot/ContextualCopilotPanel';

export default function PlansPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const {
    plans, loading, error, refetch,
    createPlan, updatePlan, updatePlanParticipants, deletePlan,
    addPlanExpense, updatePlanExpense, deletePlanExpense, convertExpense,
    addPlanSpending, updatePlanSpending, deletePlanSpending,
  } = usePlans();
  const { rooms, toast } = useApp();
  const confirm = useConfirm();

  const [showCreate, setShowCreate]             = useState(false);
  const [editingPlan, setEditingPlan]           = useState(null);
  const [expModalState, setExpModalState]       = useState({ planId: null, expense: null });
  const [spendingModalState, setSpendingModalState] = useState({ planId: null, spending: null });
  const [convertTarget, setConvertTarget]       = useState(null); // { planId, expense }
  
  const [showAIPanel, setShowAIPanel]           = useState(false);
  const [aiResult, setAiResult]                 = useState(null);

  const handleAIGenerate = async (inputs) => {
    try {
      const res = await planApi.generateAIPlan(inputs);
      setAiResult({ ...res, participants: inputs.participants });
      setShowAIPanel(false);
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleSaveAIPlan = async (planData) => {
    try {
      const plan = await createPlan({ name: planData.title, description: 'Tạo bởi AI', type: 'custom', participants: planData.participants || [] });
      for (const item of planData.items) {
        await addPlanExpense(plan.id, {
          title: item.title,
          category: item.category,
          estimatedAmount: item.recommendedAmount || item.estimatedAmountMax || 0,
          splitType: item.splitType || 'equal',
          note: item.notes,
          participants: (planData.participants || []).map(p => ({
            userId: p.type === 'user' ? p.id : null,
            guestMemberId: p.type === 'guest' ? p.id : null,
            displayName: p.type === 'manual' ? p.name : null,
            type: p.type
          }))
        });
      }
      toast.success('Đã lưu kế hoạch AI thành công');
      toast.info('Kế hoạch là dự toán; số dư chỉ thay đổi khi bạn chuyển mục kế hoạch thành khoản chi.');
      setAiResult(null);
    } catch(err) {
      toast.error(err.message);
    }
  };

  const handleDelete = async (planId) => {
    if (!await confirm({ title: 'Xoá kế hoạch?', message: 'Thao tác này không thể hoàn tác.' })) return;
    try {
      await deletePlan(planId);
      toast.success('Đã xoá kế hoạch');
    } catch (e) {
      toast.error(e.message);
    }
  };

  const handleCreatePlan = async (data) => {
    const plan = await createPlan(data);
    toast.success('Đã tạo kế hoạch');
    toast.info('Kế hoạch là dự toán; số dư chưa thay đổi cho đến khi bạn chuyển thành khoản chi.');
    return plan;
  };

  const handleEditPlan = async (data) => {
    const removedParticipants = (editingPlan.participants ?? []).filter((participant) =>
      !(data.participants ?? []).some((next) =>
        (participant.userId && next.id === participant.userId)
        || (participant.guestMemberId && next.id === participant.guestMemberId)
        || (!participant.userId && !participant.guestMemberId && (next.displayName || next.name) === participant.displayName)
      )
    );
    const usedInPlannedExpense = removedParticipants.some((participant) =>
      (editingPlan.expenses ?? []).some((expense) => {
        const parsed = typeof expense.participants === 'string' ? JSON.parse(expense.participants) : expense.participants;
        return parsed.some((item) =>
          item.userId === participant.userId
          || item.guestMemberId === participant.guestMemberId
          || item.displayName === participant.displayName
        );
      })
    );
    if (usedInPlannedExpense && !await confirm({ title: 'Xóa người tham gia?', message: 'Người này đang được dùng trong mục kế hoạch. Các mục chưa chuyển đổi sẽ được cập nhật theo thay đổi này.' })) return;
    await updatePlan(editingPlan.id, data);
    await updatePlanParticipants(editingPlan.id, {
      participants: data.participants.map((participant) => ({
        userId: participant.type === 'user' ? participant.id : null,
        guestMemberId: participant.type === 'guest' ? participant.id : null,
        displayName: participant.type === 'manual' ? (participant.displayName || participant.name) : null,
        type: participant.type,
      })),
    });
    toast.success('Đã cập nhật kế hoạch');
    setEditingPlan(null);
  };

  const handleStatusChange = async (planId, status) => {
    try {
      await updatePlan(planId, { status });
      toast.success('Đã cập nhật trạng thái kế hoạch');
    } catch (e) {
      toast.error(e.message);
    }
  };

  const handleAddExpense = (planId) => setExpModalState({ planId, expense: null });
  const handleEditExpense = (planId, expense) => setExpModalState({ planId, expense });

  const handleSavePlanExpense = async (data) => {
    if (!expModalState.planId) return;
    if (expModalState.expense) {
      await updatePlanExpense(expModalState.planId, expModalState.expense.id, data);
      toast.success('Đã cập nhật mục kế hoạch');
    } else {
      await addPlanExpense(expModalState.planId, data);
      toast.success('Đã thêm mục kế hoạch');
    }
    setExpModalState({ planId: null, expense: null });
  };

  const handleDeletePlanExpense = async (planId, planExpenseId) => {
    if (!await confirm({ title: 'Xoá mục kế hoạch?', message: 'Thao tác này không thể hoàn tác.' })) return;
    try {
      await deletePlanExpense(planId, planExpenseId);
      toast.success('Đã xoá mục kế hoạch');
    } catch (e) {
      toast.error(e.message);
    }
  };

  const handleAddSpending = (planId) => setSpendingModalState({ planId, spending: null });
  const handleEditSpending = (planId, spending) => setSpendingModalState({ planId, spending });

  const handleSavePlanSpending = async (data) => {
    if (!spendingModalState.planId) return;
    if (spendingModalState.spending) {
      await updatePlanSpending(spendingModalState.planId, spendingModalState.spending.id, data);
      toast.success('Đã cập nhật chi tiêu thực tế');
    } else {
      await addPlanSpending(spendingModalState.planId, data);
      toast.success('Đã thêm chi tiêu thực tế');
    }
    setSpendingModalState({ planId: null, spending: null });
  };

  const handleDeletePlanSpending = async (planId, spendingId) => {
    if (!await confirm({ title: 'Xoá chi tiêu thực tế?', message: 'Thao tác này không thể hoàn tác.' })) return;
    try {
      await deletePlanSpending(planId, spendingId);
      toast.success('Đã xoá chi tiêu thực tế');
    } catch (e) {
      toast.error(e.message);
    }
  };

  const handleConvertExpense = (planId, expense) => setConvertTarget({ planId, expense });

  const handleDoConvert = async (planExpenseId, convertData) => {
    const res = await convertExpense(convertTarget.planId, planExpenseId, convertData);
    toast.success('Đã đồng bộ mục kế hoạch sang phòng.');
    toast.info('Phòng, công nợ và thanh toán đề xuất đã cập nhật.');
    setConvertTarget(null);
    return res;
  };

  const activePlans    = plans.filter(p => p.status === 'active');
  const draftPlans     = plans.filter(p => p.status === 'draft');
  const completedPlans = plans.filter(p => ['completed', 'archived'].includes(p.status));

  return (
    <>
      <main className="max-w-4xl mx-auto space-y-6">
        <PageHeader
          title="Kế hoạch tài chính"
          subtitle="Lập kế hoạch chi tiêu trước khi thực hiện"
          actions={
            <>
              <AppButton 
                onClick={() => { setShowAIPanel(true); setAiResult(null); }} 
                variant="secondary"
                icon={Sparkles}
              >
                Tạo bằng AI
              </AppButton>
              <AppButton onClick={() => setShowCreate(true)} icon={Plus}>
                Tạo kế hoạch
              </AppButton>
            </>
          }
        />

        <AnimatePresence>
          {showAIPanel && <AIPlanGeneratorPanel onGenerate={handleAIGenerate} onClose={() => setShowAIPanel(false)} />}
        </AnimatePresence>
        
        <AnimatePresence>
          {aiResult && <AIPlanBoard planData={aiResult} onSaveToPlan={handleSaveAIPlan} onDiscard={() => setAiResult(null)} />}
        </AnimatePresence>

        <ContextualCopilotPanel
          title="Theo dõi kế hoạch"
          types={['budget_risk', 'spending_velocity', 'temporal_worsening', 'temporal_improvement']}
        />

        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <SkeletonCard />
            <SkeletonCard />
          </div>
        )}

        {!loading && error && (
          <ErrorState
            description="Zyra chưa thể tải danh sách kế hoạch. Bạn có thể thử lại ngay."
            onRetry={refetch}
          />
        )}

        {!loading && !error && plans.length === 0 && (
          <EmptyState
            icon={Map}
            color="purple"
            title="Chưa có kế hoạch nào"
            description="Lập kế hoạch ngân sách và ước tính các khoản chi phí trước khi chuyến đi thực sự diễn ra."
            action={
              <AppButton onClick={() => setShowCreate(true)} icon={Plus}>
                Tạo kế hoạch đầu tiên
              </AppButton>
            }
          />
        )}

        {!loading && !error && plans.length > 0 && (
          <div className="space-y-5">
            {activePlans.length > 0 && (
              <section>
                <h2 className="mb-2 text-xs font-medium text-blue-400">Đang hoạt động</h2>
                <div className="space-y-3">
                  <AnimatePresence mode="popLayout">
                    {activePlans.map(p => (
                      <PlanCard
                        key={p.id} plan={p}
                        onDelete={handleDelete}
                        onStatusChange={handleStatusChange}
                        onAddExpense={handleAddExpense}
                        onEditExpense={handleEditExpense}
                        onDeleteExpense={handleDeletePlanExpense}
                        onConvertExpense={handleConvertExpense}
                        onEditPlan={setEditingPlan}
                        onAddSpending={handleAddSpending}
                        onEditSpending={handleEditSpending}
                        onDeleteSpending={handleDeletePlanSpending}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              </section>
            )}
            {draftPlans.length > 0 && (
              <section>
                <h2 className="mb-2 text-xs font-medium text-gray-400">Bản nháp</h2>
                <div className="space-y-3">
                  <AnimatePresence mode="popLayout">
                    {draftPlans.map(p => (
                      <PlanCard
                        key={p.id} plan={p}
                        onDelete={handleDelete}
                        onStatusChange={handleStatusChange}
                        onAddExpense={handleAddExpense}
                        onEditExpense={handleEditExpense}
                        onDeleteExpense={handleDeletePlanExpense}
                        onConvertExpense={handleConvertExpense}
                        onEditPlan={setEditingPlan}
                        onAddSpending={handleAddSpending}
                        onEditSpending={handleEditSpending}
                        onDeleteSpending={handleDeletePlanSpending}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              </section>
            )}
            {completedPlans.length > 0 && (
              <section>
                <h2 className="mb-2 text-xs font-medium text-emerald-400/60">Hoàn thành / Lưu trữ</h2>
                <div className="space-y-3">
                  <AnimatePresence mode="popLayout">
                    {completedPlans.map(p => (
                      <PlanCard
                        key={p.id} plan={p}
                        onDelete={handleDelete}
                        onStatusChange={handleStatusChange}
                        onAddExpense={handleAddExpense}
                        onEditExpense={handleEditExpense}
                        onDeleteExpense={handleDeletePlanExpense}
                        onConvertExpense={handleConvertExpense}
                        onEditPlan={setEditingPlan}
                        onAddSpending={handleAddSpending}
                        onEditSpending={handleEditSpending}
                        onDeleteSpending={handleDeletePlanSpending}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              </section>
            )}
          </div>
        )}
      </main>

      {/* Modals */}
      {showCreate && <CreatePlanModal onClose={() => setShowCreate(false)} onCreate={handleCreatePlan} />}
      {editingPlan && <EditPlanModal plan={editingPlan} onClose={() => setEditingPlan(null)} onSave={handleEditPlan} />}

      <PlanExpenseModal
        open={!!expModalState.planId}
        onClose={() => setExpModalState({ planId: null, expense: null })}
        onSave={handleSavePlanExpense}
        initialData={expModalState.expense}
        availableParticipants={(plans.find((plan) => plan.id === expModalState.planId)?.participants ?? []).map((participant) => ({
          userId: participant.userId,
          guestMemberId: participant.guestMemberId,
          displayName: participant.displayName,
          type: participant.type,
          name: participant.user?.name ?? participant.guestMember?.displayName ?? participant.displayName ?? 'Participant',
        }))}
      />

      {spendingModalState.planId && (
        <PlanSpendingModal
          plan={plans.find((plan) => plan.id === spendingModalState.planId) ?? { expenses: [] }}
          spending={spendingModalState.spending}
          onClose={() => setSpendingModalState({ planId: null, spending: null })}
          onSave={handleSavePlanSpending}
        />
      )}

      <ConvertExpenseModal
        open={!!convertTarget}
        onClose={() => setConvertTarget(null)}
        planExpense={convertTarget?.expense}
        rooms={rooms}
        onConvert={(planExpenseId, data) => handleDoConvert(planExpenseId, data)}
      />
    </>
  );
}
