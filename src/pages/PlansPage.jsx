// PlansPage.jsx — Planning Foundation UI (with plan expense CRUD + conversion)
import { useState } from 'react';
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

// ── Plan Expense Row ─────────────────────────────────────────────────────────
function PlanExpenseRow({ expense, onDelete, onConvert, onEdit }) {
  const isConverted = !!expense.convertedToExpenseId;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 8 }}
      className={`flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg border transition-colors
        ${isConverted ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-white/5 bg-white/3 hover:bg-white/5'}`}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <span className="text-base">{CATEGORY_ICONS[expense.category] ?? '📦'}</span>
        <div className="min-w-0">
          <p className={`text-sm font-medium truncate ${isConverted ? 'text-emerald-300 line-through opacity-70' : 'text-white'}`}>
            {expense.title}
          </p>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-gray-500">{formatCurrency(expense.estimatedAmount, true)}</span>
            <span className="text-xs text-gray-600">·</span>
            <span className="text-xs text-gray-500">{SPLIT_TYPE_LABELS[expense.splitType] ?? expense.splitType}</span>
            {expense.notes && <span className="text-xs text-gray-600 truncate max-w-[120px]">{expense.notes}</span>}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        {isConverted ? (
          <span className="flex items-center gap-1 text-xs text-emerald-400 px-2 py-0.5 rounded-full bg-emerald-500/10">
            <Link2 className="w-3 h-3" /> Đã chuyển
          </span>
        ) : (
          <>
            <button
              onClick={() => onEdit(expense)}
              className="btn-icon w-7 h-7 text-gray-400/70 hover:text-white hover:bg-white/10"
              title="Chỉnh sửa"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onConvert(expense)}
              className="btn-icon w-7 h-7 text-blue-400/60 hover:text-blue-400 hover:bg-blue-500/10"
              title="Chuyển thành khoản chi thực"
            >
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onDelete(expense.id)}
              className="btn-icon w-7 h-7 text-red-400/50 hover:text-red-400 hover:bg-red-500/10"
              title="Xoá"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </>
        )}
      </div>
    </motion.div>
  );
}

// ── Plan Card ────────────────────────────────────────────────────────────────
function PlanCard({ plan, onDelete, onStatusChange, onAddExpense, onEditExpense, onDeleteExpense, onConvertExpense, onEditPlan }) {
  const [expanded, setExpanded] = useState(false);
  const Icon = PLAN_STATUS_ICONS[plan.status] ?? Clock;
  const expenses = plan.expenses ?? [];
  const participantCount = plan.participants?.length ?? 0;
  const costPerPerson = participantCount > 0 ? plan.estimatedTotal / participantCount : 0;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="glass-card border border-white/5 hover:border-white/10 transition-all overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-start gap-3 p-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-lg">{(PLAN_TYPES[plan.type] ?? '📋').split(' ')[0]}</span>
            <h3 className="font-semibold text-white truncate">{plan.name}</h3>
            <span className={`text-xs px-2 py-0.5 rounded-full flex items-center gap-1 ${PLAN_STATUS_COLORS[plan.status]}`}>
              <Icon className="w-3 h-3" />
              {plan.status}
            </span>
          </div>
          {plan.description && <p className="text-xs text-gray-400 mt-1 line-clamp-2">{plan.description}</p>}
          <div className="flex items-center gap-4 mt-2 flex-wrap">
            {plan.startDate && (
              <span className="text-xs text-gray-500 flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {new Date(plan.startDate).toLocaleDateString('vi-VN')}
                {plan.endDate && ` – ${new Date(plan.endDate).toLocaleDateString('vi-VN')}`}
              </span>
            )}
            <span className="text-xs text-gray-400">{expenses.length} mục</span>
            <span className="text-xs text-gray-400 flex items-center gap-1"><Users className="w-3 h-3" /> {participantCount}</span>
            {plan.estimatedTotal > 0 && (
              <span className="text-xs font-semibold text-blue-400">~{formatCurrency(plan.estimatedTotal, true)}</span>
            )}
            {costPerPerson > 0 && (
              <span className="text-xs text-gray-400">{formatCurrency(costPerPerson, true)}/người</span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <select
            value={plan.status}
            onChange={e => onStatusChange(plan.id, e.target.value)}
            className="text-xs bg-white/5 border border-white/10 text-gray-300 rounded px-1.5 py-1 focus:outline-none"
          >
            {Object.keys(PLAN_STATUS_COLORS).map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <button
            onClick={() => onEditPlan(plan)}
            className="btn-icon w-7 h-7 text-gray-400 hover:text-white"
            title="Chỉnh sửa kế hoạch"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setExpanded(e => !e)}
            className="btn-icon w-7 h-7 text-gray-400 hover:text-white"
            title={expanded ? 'Thu gọn' : 'Mở rộng'}
          >
            {expanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={() => onDelete(plan.id)}
            className="btn-icon w-7 h-7 text-red-400/60 hover:text-red-400 hover:bg-red-500/10"
            title="Xoá kế hoạch"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Expanded expenses panel */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 border-t border-white/5 pt-3 space-y-2">
              {/* Expense list */}
              {expenses.length === 0 ? (
                <p className="text-xs text-gray-500 text-center py-3">Chưa có mục kế hoạch nào</p>
              ) : (
                <AnimatePresence mode="popLayout">
                  {expenses.map(exp => (
                    <PlanExpenseRow
                      key={exp.id}
                      expense={exp}
                      onEdit={(expense) => onEditExpense(plan.id, expense)}
                      onDelete={(id) => onDeleteExpense(plan.id, id)}
                      onConvert={(exp) => onConvertExpense(plan.id, exp)}
                    />
                  ))}
                </AnimatePresence>
              )}

              {/* Totals */}
              {expenses.length > 0 && (
                <div className="flex items-center justify-between pt-1 border-t border-white/5 text-xs">
                  <span className="text-gray-500">Ước tính tổng</span>
                  <span className="text-blue-300 font-bold">{formatCurrency(plan.estimatedTotal, true)}</span>
                </div>
              )}

              {/* Add expense button */}
              <button
                onClick={() => onAddExpense(plan.id)}
                className="w-full flex items-center justify-center gap-2 py-2 rounded-xl border border-dashed border-white/10 text-xs text-gray-400 hover:text-white hover:border-blue-500/40 hover:bg-blue-500/5 transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                Thêm mục kế hoạch
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
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
          <AppButton type="submit" isLoading={saving} icon={Plus} className="w-full sm:w-auto">
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
  const { plans, loading, error, refetch, createPlan, updatePlan, updatePlanParticipants, deletePlan, addPlanExpense, updatePlanExpense, deletePlanExpense, convertExpense } = usePlans();
  const { rooms, toast } = useApp();
  const confirm = useConfirm();

  const [showCreate, setShowCreate]             = useState(false);
  const [editingPlan, setEditingPlan]           = useState(null);
  const [expModalState, setExpModalState]       = useState({ planId: null, expense: null });
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

  const handleConvertExpense = (planId, expense) => setConvertTarget({ planId, expense });

  const handleDoConvert = async (planExpenseId, convertData) => {
    const res = await convertExpense(convertTarget.planId, planExpenseId, convertData);
    toast.success('Đã chuyển thành khoản chi');
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
                className="bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 border-purple-500/20"
              >
                AI Tạo
              </AppButton>
              <AppButton onClick={() => setShowCreate(true)} icon={Plus}>
                Thủ công
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
          <AppCard className="p-6 flex flex-col items-center gap-3 border border-red-500/20">
            <AlertCircle className="w-10 h-10 text-red-400" />
            <p className="text-white">{error}</p>
            <AppButton onClick={refetch} icon={RefreshCw}>Thử lại</AppButton>
          </AppCard>
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
