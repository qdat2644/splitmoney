// BudgetPage.jsx — Full budget management page
import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, ChevronUp, Plus, RefreshCw, Sparkles } from 'lucide-react';
import { useBudgets } from '../hooks/useBudgets';
import { useCopilotWorkspace } from '../hooks/useCopilotWorkspace';
import BudgetList from '../components/budget/BudgetList';
import BudgetModal from '../components/budget/BudgetModal';
import { useApp } from '../context/AppContext';
import { useConfirm } from '../hooks/useConfirm';
import PageHeader from '../components/ui/PageHeader';
import AppButton from '../components/ui/AppButton';
import AppCard from '../components/ui/AppCard';
import ErrorState from '../components/ui/ErrorState';
import { SkeletonPage } from '../components/ui/Skeleton';
import { dedupeRecommendations } from '../utils/recommendationDedupe';
import { formatCurrencyText } from '../utils/formatters';

const BUDGET_RECOMMENDATION_TYPES = [
  'budget_risk',
  'budget_suggestion',
  'recurring_expense',
  'temporal_category_growth',
  'temporal_recurring_rhythm',
];

const actionLabels = {
  open_budget: 'Xem ngân sách',
  open_analytics: 'Xem phân tích',
  review_settlements: 'Xem thanh toán',
  open_forecasts: 'Xem dự báo',
  create_budget: 'Tạo ngân sách',
  create_recurring_budget: 'Tạo ngân sách',
};

export default function BudgetPage() {
  const { rooms, toast } = useApp();
  const confirm = useConfirm();
  const navigate   = useNavigate();
  const { budgets, status, loading, error, refetch, setBudget, deleteBudget } = useBudgets();
  const { data: copilotData, loading: loadingCopilot } = useCopilotWorkspace();
  const [modalOpen, setModalOpen]     = useState(false);
  const [editTarget, setEditTarget]   = useState(null);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);

  // Build statusMap: budgetId → { actual, usagePct, overBudget, remaining }
  const statusMap = {};
  if (status?.budgets) {
    status.budgets.forEach(b => { statusMap[b.id] = b; });
  }

  const handleAdd = () => { setEditTarget(null); setModalOpen(true); };
  const handleEdit = (budget) => { setEditTarget(budget); setModalOpen(true); };
  const handleDelete = async (id) => {
    if (!await confirm({ title: 'Xoá ngân sách?', message: 'Thao tác này không thể hoàn tác.' })) return;
    try {
      await deleteBudget(id);
      toast.success('Đã xoá ngân sách');
    } catch (e) {
      toast.error(e.message);
    }
  };
  const handleSave = async (data) => {
    await setBudget(data);
    toast.success(editTarget ? 'Đã cập nhật ngân sách' : 'Đã tạo ngân sách');
    toast.info('Ngân sách sẽ theo dõi chi tiêu trong tháng và cảnh báo khi gần vượt hạn mức.');
  };

  const overCount = status?.budgets?.filter(b => b.overBudget).length ?? 0;
  const roomNameMap = Object.fromEntries(rooms.map((membership) => [membership.roomId, membership.room?.name ?? membership.roomId]));
  const budgetRecommendations = useMemo(
    () => dedupeRecommendations(
      (copilotData?.recommendations ?? []).filter((item) => BUDGET_RECOMMENDATION_TYPES.includes(item.type))
    ).slice(0, 2),
    [copilotData?.recommendations],
  );
  const hasBudgets = budgets.length > 0;
  const suggestionStrip = (
    <BudgetSuggestionStrip
      recommendations={budgetRecommendations}
      loading={loadingCopilot}
      open={suggestionsOpen}
      onToggle={() => setSuggestionsOpen((value) => !value)}
      onNavigate={(to) => navigate(to)}
    />
  );

  return (
    <>
      <main className="max-w-4xl mx-auto space-y-6">
        {/* Title row */}
        <PageHeader
          eyebrow="Tiền bạc"
          title="Ngân sách"
          subtitle="Quản lý hạn mức chi tiêu theo danh mục và phòng."
          actions={
            <AppButton 
              onClick={handleAdd} 
              icon={Plus}
            >
              Tạo ngân sách
            </AppButton>
          }
        />

        {/* Summary */}
        {status?.hasData && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <AppCard 
              className={`p-4 flex items-center justify-between ${
                overCount > 0 ? 'border-red-500/20 bg-red-500/5' : 'border-emerald-500/20 bg-emerald-500/5'
              }`}
            >
              <div>
                <p className="text-xs text-gray-400">Tháng {status.month}/{status.year}</p>
                <p className={`text-sm font-semibold ${overCount > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                  {overCount > 0 ? `${overCount} danh mục vượt hạn mức` : 'Tất cả trong hạn mức ✓'}
                </p>
              </div>
              <button onClick={refetch} className="btn-icon text-gray-400 hover:text-white" title="Làm mới">
                <RefreshCw className="w-4 h-4" />
              </button>
            </AppCard>
          </motion.div>
        )}

        {/* Loading */}
        {loading && (
          <SkeletonPage />
        )}

        {/* Error */}
        {!loading && error && (
          <ErrorState
            description="Zyra chưa thể tải danh sách ngân sách. Bạn có thể thử lại ngay."
            onRetry={refetch}
          />
        )}

        {/* Budget list */}
        {!loading && !error && hasBudgets && suggestionStrip}

        {!loading && !error && (
          <BudgetList
            budgets={budgets}
            statusMap={statusMap}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onAdd={handleAdd}
            roomNameMap={roomNameMap}
          />
        )}

        {!loading && !error && !hasBudgets && suggestionStrip}
      </main>

      {/* Modal */}
      <BudgetModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditTarget(null); }}
        initialData={editTarget}
        onSave={handleSave}
        rooms={rooms}
      />
    </>
  );
}

function BudgetSuggestionStrip({ recommendations, loading, open, onToggle, onNavigate }) {
  if (loading || recommendations.length === 0) return null;

  const summary = recommendations
    .slice(0, 2)
    .map((item) => formatCurrencyText(item.title))
    .join(' · ');

  return (
    <AppCard className="border border-purple-500/10 bg-purple-500/5">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full flex-col gap-3 px-4 py-3 text-left sm:flex-row sm:items-center sm:justify-between"
        aria-expanded={open}
      >
        <div className="flex min-w-0 items-start gap-3">
          <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-purple-500/15 bg-purple-500/10">
            <Sparkles className="h-4 w-4 text-purple-300" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white">
              Có {recommendations.length} gợi ý ngân sách
            </p>
            <p className="mt-0.5 truncate text-xs text-gray-400 sm:max-w-xl">
              {summary || 'Zyra nhận thấy vài danh mục có thể đặt hạn mức.'}
            </p>
          </div>
        </div>
        <span className="inline-flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-white/5 bg-white/5 px-3 text-xs font-medium text-gray-200">
          {open ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          {open ? 'Thu gọn' : 'Xem gợi ý'}
        </span>
      </button>

      {open && (
        <div className="space-y-2 border-t border-white/5 px-4 pb-4 pt-3">
          {recommendations.map((recommendation) => (
            <BudgetRecommendationMiniCard
              key={recommendation.id}
              recommendation={recommendation}
              onNavigate={onNavigate}
            />
          ))}
        </div>
      )}
    </AppCard>
  );
}

function BudgetRecommendationMiniCard({ recommendation, onNavigate }) {
  const title = formatCurrencyText(recommendation.title);
  const description = formatCurrencyText(recommendation.description);
  const action = recommendation.action;

  return (
    <div className="rounded-lg border border-white/5 bg-white/3 px-3 py-2.5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-white">{title}</p>
          {description && <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-gray-400">{description}</p>}
        </div>
        {action && (
          <AppButton
            size="xs"
            variant="secondary"
            onClick={() => onNavigate(action.to)}
            className="shrink-0"
          >
            {actionLabels[action.type] ?? action.label ?? 'Mở'}
          </AppButton>
        )}
      </div>
    </div>
  );
}
