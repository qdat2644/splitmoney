import { motion } from 'framer-motion';
import { Download, Plus, ArrowLeft } from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';
import { exportExpensesToCsv } from '../../utils/exportCsv';
import { useApp } from '../../context/AppContext';
import { useNavigate } from 'react-router-dom';

export default function RoomTopBarActions({ onAddExpense }) {
  const { stats, expenses, members, toast } = useApp();
  const navigate = useNavigate();

  const handleExport = () => {
    exportExpensesToCsv(expenses, members);
    toast.success('Đã xuất file CSV!');
  };

  return (
    <>
      <button onClick={() => navigate('/rooms')} className="flex btn-icon mr-2 text-gray-400 hover:text-white" title="Quay lại danh sách phòng">
        <ArrowLeft className="w-4 h-4" />
      </button>

      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full glass-card border border-white/8"
      >
        <span className="text-[10px] text-gray-500 uppercase tracking-wide">Tổng</span>
        <span className="text-sm font-bold gradient-text">
          {formatCurrency(stats.totalExpenses, true)}
        </span>
      </motion.div>

      <button onClick={handleExport} className="btn-icon" title="Xuất CSV">
        <Download className="w-4 h-4" />
      </button>

      <motion.button
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
        onClick={onAddExpense}
        className="btn-primary flex items-center gap-1.5 text-xs ml-1"
      >
        <Plus className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Thêm chi phí</span>
        <span className="sm:hidden">Thêm</span>
      </motion.button>
    </>
  );
}
