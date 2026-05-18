import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, User, Mail } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { guestApi } from '../../services/apiClient';
import AppButton from '../ui/AppButton';

export default function AddGuestModal({ isOpen, onClose }) {
  const { currentRoom, toast, setMembers } = useApp();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!displayName.trim()) {
      return toast.error('Vui lòng nhập tên');
    }

    setLoading(true);
    try {
      const res = await guestApi.createGuest(currentRoom.roomId, { displayName, email });
      
      const newGuest = {
        id: res.guest.id,
        name: res.guest.displayName,
        status: res.guest.status,
        type: 'guest',
        claimedByUserId: res.guest.claimedByUserId,
        colorIndex: Math.floor(Math.random() * 5),
      };

      setMembers(prev => [...prev, newGuest]);
      toast.success('Đã thêm thành viên ảo');
      setDisplayName('');
      setEmail('');
      onClose();
    } catch (err) {
      toast.error(err.message || 'Lỗi thêm thành viên');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: '100%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="bg-dark-800 w-full max-w-md rounded-3xl overflow-hidden shadow-2xl border border-white/10"
          onClick={e => e.stopPropagation()}
        >
          <div className="flex items-center justify-between p-6 border-b border-white/5 bg-white/5">
            <h3 className="text-xl font-bold text-white">Thêm Thành Viên Ảo</h3>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            <p className="text-sm text-gray-400 mb-2">
              Thành viên ảo dùng để chia tiền với người chưa có tài khoản app. Sau này họ có thể nhận lại hồ sơ.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">
                  Tên thành viên *
                </label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="VD: Nam"
                    className="w-full bg-dark-900 border border-white/10 rounded-2xl py-3 pl-12 pr-4 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">
                  Email (Tuỳ chọn)
                </label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="nam@example.com"
                    className="w-full bg-dark-900 border border-white/10 rounded-2xl py-3 pl-12 pr-4 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
                  />
                </div>
              </div>
            </div>

            <AppButton
              type="submit"
              loading={loading}
              className="w-full h-14 text-base rounded-2xl"
            >
              Tạo thành viên
            </AppButton>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
