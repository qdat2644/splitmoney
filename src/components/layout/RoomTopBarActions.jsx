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
    <div className="flex items-center gap-2">
      <button 
        onClick={() => navigate('/rooms')} 
        className="btn-icon h-8 w-8 text-gray-400 border border-transparent" 
        title="Quay lại danh sách phòng"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
      </button>

      <motion.div
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded bg-dark-900 border border-white/5 text-xs shadow-sm"
      >
        <span className="text-[11px] font-medium text-gray-500">Tổng chi</span>
        <span className="font-semibold text-gray-200">
          {formatCurrency(stats.totalExpenses, true)}
        </span>
      </motion.div>

      <button 
        onClick={handleExport} 
        className="btn-secondary h-8 px-2.5 text-xs font-medium flex items-center gap-1 border border-white/5 bg-white/[0.01]" 
        title="Xuất CSV"
      >
        <Download className="w-3.5 h-3.5" />
        <span className="hidden md:inline">Xuất CSV</span>
      </button>

      <motion.button
        whileTap={{ scale: 0.98 }}
        onClick={onAddExpense}
        className="btn-primary h-8 px-3 text-xs flex items-center gap-1.5 font-medium"
      >
        <Plus className="w-3.5 h-3.5" />
        <span>Thêm chi phí</span>
      </motion.button>
    </div>
  );
}
