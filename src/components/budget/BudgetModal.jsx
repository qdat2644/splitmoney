// BudgetModal.jsx — Create / edit a budget entry
import { useState, useEffect } from 'react';
import { formatCurrency } from '../../utils/formatters';
import { ModalLayout, ModalHeader, ModalBody, ModalFooter } from '../ui/ModalLayout';
import AppInput from '../ui/AppInput';
import AppSelect from '../ui/AppSelect';
import AppButton from '../ui/AppButton';

const CATEGORIES = [
  { id: 'overall',       label: 'Tổng chi',    icon: '💰' },
  { id: 'food',          label: 'Ăn uống',     icon: '🍜' },
  { id: 'transport',     label: 'Di chuyển',   icon: '🚗' },
  { id: 'accommodation', label: 'Chỗ ở',       icon: '🏠' },
  { id: 'shopping',      label: 'Mua sắm',     icon: '🛒' },
  { id: 'entertainment', label: 'Giải trí',    icon: '🎮' },
  { id: 'health',        label: 'Sức khỏe',   icon: '💊' },
  { id: 'travel',        label: 'Du lịch',     icon: '✈️' },
  { id: 'utilities',     label: 'Tiện ích',    icon: '⚡' },
  { id: 'other',         label: 'Khác',        icon: '📦' },
];

const now = new Date();

export default function BudgetModal({ open, onClose, initialData, onSave, rooms = [] }) {
  const [scope, setScope]       = useState('personal');
  const [roomId, setRoomId]     = useState('');
  const [category, setCategory] = useState('overall');
  const [amount, setAmount]     = useState('');
  const [month, setMonth]       = useState(now.getMonth() + 1);
  const [year, setYear]         = useState(now.getFullYear());
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState('');

  useEffect(() => {
    if (open) {
      setScope(initialData?.roomId ? 'room' : 'personal');
      setRoomId(initialData?.roomId ?? '');
      setCategory(initialData?.category ?? 'overall');
      setAmount(initialData?.amount ? String(initialData.amount) : '');
      setMonth(initialData?.month ?? now.getMonth() + 1);
      setYear(initialData?.year ?? now.getFullYear());
      setError('');
    }
  }, [open, initialData]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const num = Number(amount);
    if (!num || num <= 0) { setError('Vui lòng nhập số tiền hợp lệ'); return; }
    if (scope === 'room' && !roomId) { setError('Vui lòng chọn phòng'); return; }
    setSaving(true);
    try {
      await onSave({
        category: category === 'overall' ? null : category,
        amount: num,
        month,
        year,
        roomId: scope === 'room' ? roomId : null,
        ...(initialData?.id ? { id: initialData.id } : {}),
      });
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <ModalLayout open={open} onClose={onClose} size="sm">
      <ModalHeader 
        title={initialData?.id ? 'Chỉnh sửa ngân sách' : 'Tạo ngân sách'} 
        icon={PiggyBank} 
        onClose={onClose} 
      />
      <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
        <ModalBody className="space-y-4">
          <div>
            <label className="block mb-1.5 text-sm font-medium text-gray-300">Phạm vi</label>
              <div className="grid grid-cols-2 gap-2 mt-1">
                <button
                  type="button"
                  onClick={() => setScope('personal')}
                  className={`px-3 py-2 rounded-xl border text-sm ${
                    scope === 'personal' ? 'border-emerald-500/50 bg-emerald-500/10 text-white' : 'border-white/8 text-gray-400'
                  }`}
                >
                  Cá nhân
                </button>
                <button
                  type="button"
                  onClick={() => setScope('room')}
                  className={`px-3 py-2 rounded-xl border text-sm ${
                    scope === 'room' ? 'border-emerald-500/50 bg-emerald-500/10 text-white' : 'border-white/8 text-gray-400'
                  }`}
                >
                  Theo phòng
                </button>
              </div>
            </div>

            {scope === 'room' && (
              <AppSelect 
                label="Phòng" 
                value={roomId} 
                onChange={e => setRoomId(e.target.value)}
              >
                <option value="">— Chọn phòng —</option>
                {rooms.map((room) => (
                  <option key={room.roomId} value={room.roomId}>{room.room?.name ?? room.roomId}</option>
                ))}
              </AppSelect>
            )}
            {/* Category */}
            <div>
              <label className="block mb-1.5 text-sm font-medium text-gray-300">Danh mục</label>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5 mt-1">
                {CATEGORIES.map(cat => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategory(cat.id)}
                    className={`flex flex-col items-center gap-1 px-2 py-2.5 rounded-xl border text-xs font-medium transition-all duration-150
                      ${category === cat.id
                        ? 'border-emerald-500/50 bg-emerald-500/15 text-emerald-300'
                        : 'border-white/8 text-gray-400 hover:border-white/20'}`}
                  >
                    <span className="text-base">{cat.icon}</span>
                    <span className="leading-tight text-center" style={{ fontSize: '10px' }}>{cat.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Amount */}
            <AppInput
              label="Hạn mức (VND)"
              required
              type="number"
              min="1000"
              step="1000"
              placeholder="VD: 5000000"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              helperText={amount && Number(amount) > 0 ? `≈ ${formatCurrency(Number(amount), true)}` : ''}
            />

            {/* Month / Year */}
            <div className="grid grid-cols-2 gap-3">
              <AppSelect
                label="Tháng"
                value={month}
                onChange={e => setMonth(Number(e.target.value))}
              >
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i + 1} value={i + 1}>Tháng {i + 1}</option>
                ))}
              </AppSelect>
              <AppSelect
                label="Năm"
                value={year}
                onChange={e => setYear(Number(e.target.value))}
              >
                {[2024, 2025, 2026, 2027].map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </AppSelect>
            </div>

            {error && (
              <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                {error}
              </p>
            )}
        </ModalBody>
        <ModalFooter>
          <AppButton type="button" variant="secondary" onClick={onClose} className="w-full sm:w-auto">Huỷ</AppButton>
          <AppButton
            type="submit"
            loading={saving}
            icon={Check}
            className="w-full sm:w-auto bg-gradient-to-r from-emerald-600 to-teal-600 border-none"
          >
            {initialData?.id ? 'Lưu thay đổi' : 'Tạo ngân sách'}
          </AppButton>
        </ModalFooter>
      </form>
    </ModalLayout>
  );
}
