// MemberCard.jsx — Member display card
import { motion } from 'framer-motion';
import { Trash2, TrendingUp, TrendingDown, Minus, Ghost, User } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { guestApi } from '../../services/apiClient';
import Avatar from '../ui/Avatar';
import { formatCurrency } from '../../utils/formatters';
import { useConfirm } from '../../hooks/useConfirm';

export default function MemberCard({ member, index = 0, isOwner, currentUser }) {
  const { removeMember, stats, expenses, currentRoom, toast, setMembers } = useApp();
  const confirm = useConfirm();

  const balance = stats.balances?.[member.id] ?? 0;
  const paid = stats.paidByMember?.[member.id] ?? 0;
  const expenseCount = expenses.filter(
    (e) => e.paidBy === member.id || e.participants?.includes(member.id)
  ).length;

  const isPositive = balance > 1;
  const isNegative = balance < -1;

  const isGuest = member.type === 'guest';
  const isClaimed = isGuest && member.status === 'claimed';

  const handleDelete = async () => {
    const confirmed = await confirm({
      title: isGuest ? 'Xoá thành viên ảo?' : 'Xoá thành viên?',
      message: 'Thao tác này không thể hoàn tác.',
    });
    if (!confirmed) return;
    
    if (isGuest) {
      try {
        const res = await guestApi.deleteGuest(currentRoom.roomId, member.id);
        if (res.message) toast.success(res.message);
        // Remove from UI immediately to avoid waiting for reload
        setMembers(prev => prev.filter(m => m.id !== member.id));
      } catch (err) {
        toast.error(err.message || 'Lỗi xoá thành viên ảo');
      }
    } else {
      removeMember(member.id);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.06, type: 'spring', stiffness: 300, damping: 25 }}
      className="glass-card-hover p-5 flex flex-col items-center text-center relative group"
    >
      {/* Delete button (only if owner and not self) */}
      {isOwner && member.id !== currentUser?.id && (
        <button
          onClick={handleDelete}
          className="absolute top-3 right-3 p-1.5 rounded-lg opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-all duration-200 btn-icon text-gray-500"
          title="Xoá thành viên"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      )}

      {/* Avatar */}
      <div className="relative mb-3">
        <Avatar member={member} size="xl" />
        {/* Balance indicator */}
        <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center border-2 border-dark-800
          ${isPositive ? 'bg-emerald-500' : isNegative ? 'bg-red-500' : 'bg-gray-600'}`}>
          {isPositive
            ? <TrendingUp className="w-2.5 h-2.5 text-white" />
            : isNegative
            ? <TrendingDown className="w-2.5 h-2.5 text-white" />
            : <Minus className="w-2.5 h-2.5 text-white" />
          }
        </div>
      </div>

      {/* Name */}
      <div className="flex items-center gap-1 justify-center mb-0.5">
        <h3 className="font-semibold text-white text-base">{member.name}</h3>
        {isGuest && !isClaimed && <Ghost className="w-3 h-3 text-gray-500" title="Thành viên ảo" />}
        {isClaimed && <User className="w-3 h-3 text-blue-400" title="Đã có người nhận" />}
      </div>
      <p className="text-xs text-gray-500 mb-4">{expenseCount} giao dịch</p>

      {/* Stats */}
      <div className="w-full space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-xs text-gray-500">Đã trả</span>
          <span className="text-sm font-semibold text-white">{formatCurrency(paid, true)}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-xs text-gray-500">
            {isPositive ? 'Được nhận' : isNegative ? 'Cần trả' : 'Cân bằng'}
          </span>
          <span className={`text-sm font-bold
            ${isPositive ? 'text-emerald-400' : isNegative ? 'text-red-400' : 'text-gray-400'}`}>
            {isPositive ? '+' : ''}{formatCurrency(Math.abs(balance), true)}
          </span>
        </div>
      </div>

      {/* Balance bar */}
      <div className="w-full mt-3 h-1 bg-dark-600 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${isPositive ? 'bg-emerald-500' : 'bg-red-500'}`}
          style={{ width: `${Math.min(100, Math.abs(balance) / Math.max(1, paid) * 100)}%` }}
        />
      </div>
    </motion.div>
  );
}
