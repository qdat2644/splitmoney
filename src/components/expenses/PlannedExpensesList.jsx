import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Plus, Check, Clock } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { formatCurrency, formatDate } from '../../utils/formatters';

export default function PlannedExpensesList() {
  const { plannedExpenses = [], updatePlannedExpense = () => {}, currentUser, addExpense } = useApp();
  const [showAdd, setShowAdd] = useState(false);
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState('');

  const { addPlannedExpense = () => {} } = useApp();

  const handleAdd = (e) => {
    e.preventDefault();
    if (!title || !amount) return;
    
    addPlannedExpense({
      title,
      estimatedAmount: Number(amount),
      plannedDate: date || new Date().toISOString().split('T')[0],
      participants: [currentUser?.id].filter(Boolean),
      status: 'planned'
    });
    
    setTitle('');
    setAmount('');
    setDate('');
    setShowAdd(false);
  };

  const handleComplete = (plan) => {
    updatePlannedExpense(plan.id, { status: 'completed' });
    
    // Optionally open Add Expense modal with pre-filled data
    // Here we'll just automatically add it as a real expense for simplicity
    addExpense({
      title: plan.title,
      amount: plan.estimatedAmount,
      date: new Date().toISOString().split('T')[0],
      paidBy: currentUser?.id,
      participants: plan.participants || [currentUser?.id].filter(Boolean),
      category: 'other',
      splitType: 'equal',
      note: 'Từ kế hoạch chi tiêu'
    });
  };

  const pendingPlans = plannedExpenses.filter(p => p.status === 'planned');

  return (
    <div className="mb-6 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-white flex items-center gap-2">
          <Calendar className="w-4 h-4 text-blue-400" />
          Kế hoạch chi tiêu
        </h2>
        <button 
          onClick={() => setShowAdd(!showAdd)} 
          className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
        >
          <Plus className="w-3 h-3" /> Thêm kế hoạch
        </button>
      </div>

      <AnimatePresence>
        {showAdd && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <form onSubmit={handleAdd} className="glass-card p-3 flex gap-2 items-start bg-blue-500/5 border border-blue-500/20 mb-3">
              <input 
                placeholder="Tên kế hoạch..." 
                className="input-field py-1.5 text-sm flex-1" 
                value={title} onChange={e => setTitle(e.target.value)}
                autoFocus
              />
              <input 
                type="number" 
                placeholder="Dự kiến (VNĐ)" 
                className="input-field py-1.5 text-sm w-32" 
                value={amount} onChange={e => setAmount(e.target.value)}
              />
              <button type="submit" className="btn-primary py-1.5 px-3 text-sm shrink-0">Lưu</button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid sm:grid-cols-2 gap-3">
        {pendingPlans.map((plan, i) => (
          <motion.div 
            key={plan.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.05 }}
            className="glass-card p-4 flex flex-col justify-between group relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-16 h-16 bg-blue-500/10 blur-2xl -mr-8 -mt-8 rounded-full" />
            <div>
              <div className="flex justify-between items-start mb-1">
                <h3 className="font-medium text-gray-200 truncate pr-4">{plan.title}</h3>
                <Clock className="w-3.5 h-3.5 text-gray-500 shrink-0 mt-0.5" />
              </div>
              <p className="text-sm font-bold text-blue-400">
                {formatCurrency(plan.estimatedAmount)}
              </p>
            </div>
            
            <div className="mt-4 flex items-center justify-between">
              <p className="text-xs text-gray-500">{plan.plannedDate ? formatDate(plan.plannedDate) : 'Sắp tới'}</p>
              <button 
                onClick={() => handleComplete(plan)}
                className="text-xs bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 px-2.5 py-1 rounded-md flex items-center gap-1 transition-colors"
                title="Đánh dấu hoàn thành và tạo khoản chi"
              >
                <Check className="w-3 h-3" /> Thực hiện
              </button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
