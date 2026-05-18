// RoomBreakdownList.jsx — Horizontal bar list showing spending per room
import { motion } from 'framer-motion';
import { DoorOpen } from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';
import { useNavigate } from 'react-router-dom';

export default function RoomBreakdownList({ data }) {
  const navigate = useNavigate();
  if (!data || data.length === 0) {
    return (
      <div className="glass-card p-5 flex flex-col gap-2">
        <h3 className="text-sm font-semibold text-gray-300">Chi tiêu theo phòng</h3>
        <p className="text-gray-500 text-xs py-4 text-center">Chưa có phòng nào</p>
      </div>
    );
  }

  const max = Math.max(...data.map(d => d.amount), 1);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="glass-card p-5 flex flex-col gap-4"
    >
      <h3 className="text-sm font-semibold text-gray-300">Chi tiêu theo phòng</h3>
      <div className="space-y-3">
        {data.map((room, i) => (
          <div key={room.roomId} className="group">
            <div className="flex items-center justify-between mb-1.5">
              <button
                onClick={() => navigate(`/rooms/${room.roomId}/dashboard`)}
                className="flex items-center gap-1.5 text-xs text-gray-300 hover:text-blue-400 transition-colors font-medium truncate max-w-[65%]"
              >
                <DoorOpen className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{room.roomName}</span>
              </button>
              <span className="text-xs font-bold text-white shrink-0">{formatCurrency(room.amount, true)}</span>
            </div>
            <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${(room.amount / max) * 100}%` }}
                transition={{ delay: 0.35 + i * 0.07, duration: 0.5, ease: 'easeOut' }}
                className="h-full rounded-full bg-gradient-to-r from-blue-500 to-purple-500"
              />
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
