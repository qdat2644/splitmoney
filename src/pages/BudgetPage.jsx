// BudgetPage.jsx — Full budget management page
import { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { PiggyBank, Plus, RefreshCw, AlertCircle, LogOut, DoorOpen, Wallet } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useBudgets } from '../hooks/useBudgets';
import BudgetList from '../components/budget/BudgetList';
import BudgetModal from '../components/budget/BudgetModal';
import { useApp } from '../context/AppContext';
import { useConfirm } from '../hooks/useConfirm';
import PageHeader from '../components/ui/PageHeader';
import AppButton from '../components/ui/AppButton';
import AppCard from '../components/ui/AppCard';
import { SkeletonPage } from '../components/ui/Skeleton';
import ContextualCopilotPanel from '../components/copilot/ContextualCopilotPanel';

export default function BudgetPage() {
  const { logout } = useAuth();
  const { rooms, toast } = useApp();
  const confirm = useConfirm();
  const navigate   = useNavigate();
  const { budgets, status, loading, error, refetch, setBudget, deleteBudget } = useBudgets();
  const [modalOpen, setModalOpen]     = useState(false);
  const [editTarget, setEditTarget]   = useState(null);

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
  };

  const overCount = status?.budgets?.filter(b => b.overBudget).length ?? 0;
  const roomNameMap = Object.fromEntries(rooms.map((membership) => [membership.roomId, membership.room?.name ?? membership.roomId]));

  return (
    <>
      <main className="max-w-4xl mx-auto space-y-6">
        {/* Title row */}
        <PageHeader
          title={
            <span className="flex items-center gap-2">
              <PiggyBank className="w-6 h-6 text-emerald-400" /> Ngân sách
            </span>
          }
          subtitle="Quản lý hạn mức chi tiêu theo danh mục"
          actions={
            <AppButton 
              onClick={handleAdd} 
              icon={Plus}
              className="bg-gradient-to-r from-emerald-600 to-teal-600 border-none hover:opacity-90 text-white"
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

        <ContextualCopilotPanel
          title="Theo dõi ngân sách"
          types={['budget_risk', 'budget_suggestion', 'recurring_expense']}
        />

        {/* Loading */}
        {loading && (
          <SkeletonPage />
        )}

        {/* Error */}
        {!loading && error && (
          <AppCard className="p-6 flex flex-col items-center gap-3 border border-red-500/20">
            <AlertCircle className="w-10 h-10 text-red-400" />
            <p className="text-white text-sm">{error}</p>
            <AppButton onClick={refetch} icon={RefreshCw}>
              Thử lại
            </AppButton>
          </AppCard>
        )}

        {/* Budget list */}
        {!loading && !error && (
          <div className="space-y-3">
            <BudgetList
              budgets={budgets}
              statusMap={statusMap}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onAdd={handleAdd}
              roomNameMap={roomNameMap}
            />
          </div>
        )}
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
