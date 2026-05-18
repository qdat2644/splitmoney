// PlanExpenseModal.jsx — Add / edit a planned expense inside a plan
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ListChecks, Check } from 'lucide-react';
import AppButton from '../ui/AppButton';
import { formatCurrency } from '../../utils/formatters';
import { CATEGORIES } from '../../data/mockData';

const SPLIT_TYPES = [
  { id: 'equal',      label: 'Đều nhau' },
  { id: 'exact',      label: 'Số tiền cụ thể' },
  { id: 'percentage', label: 'Phần trăm' },
];

function parseParticipants(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  try { return JSON.parse(value); } catch { return []; }
}

function participantKey(participant) {
  if (participant.userId) return `user:${participant.userId}`;
  if (participant.guestMemberId) return `guest:${participant.guestMemberId}`;
  return `manual:${participant.displayName || participant.name}`;
}

export default function PlanExpenseModal({ open, onClose, onSave, initialData, availableParticipants = [] }) {
  const [title, setTitle]               = useState('');
  const [estimatedAmount, setAmount]    = useState('');
  const [category, setCategory]         = useState('other');
  const [splitType, setSplitType]       = useState('equal');
  const [participants, setParticipants] = useState([]);
  const [notes, setNotes]               = useState('');
  const [saving, setSaving]             = useState(false);
  const [error, setError]               = useState('');

  useEffect(() => {
    if (open) {
      setTitle(initialData?.title ?? '');
      setAmount(initialData?.estimatedAmount ? String(initialData.estimatedAmount) : '');
      setCategory(initialData?.category ?? 'other');
      setSplitType(initialData?.splitType ?? 'equal');
      const currentParticipants = parseParticipants(initialData?.participants);
      setParticipants(currentParticipants.length ? currentParticipants : availableParticipants.slice(0, 1));
      setNotes(initialData?.notes ?? '');
      setError('');
    }
  }, [open, initialData]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const num = Number(estimatedAmount);
    if (!title.trim()) { setError('Vui lòng nhập tên khoản chi'); return; }
    if (!num || num <= 0) { setError('Vui lòng nhập số tiền ước tính'); return; }
    setSaving(true);
    try {
      if (participants.length === 0) { setError('Vui lòng chọn ít nhất một người tham gia'); return; }

      const nextParticipants = participants.map((participant) => ({ ...participant }));
      if (splitType === 'exact') {
        const baseShare = Math.floor(num / nextParticipants.length);
        let remainder = num - (baseShare * nextParticipants.length);
        nextParticipants.forEach((participant) => {
          participant.shareAmount = baseShare + (remainder > 0 ? 1 : 0);
          remainder -= remainder > 0 ? 1 : 0;
        });
      }
      if (splitType === 'percentage') {
        const basePercent = Math.floor((100 / nextParticipants.length) * 100) / 100;
        let remainder = Number((100 - (basePercent * nextParticipants.length)).toFixed(2));
        nextParticipants.forEach((participant, index) => {
          participant.sharePercent = index === nextParticipants.length - 1
            ? Number((basePercent + remainder).toFixed(2))
            : basePercent;
        });
      }

      await onSave({
        title: title.trim(),
        estimatedAmount: num,
        category,
        splitType,
        participants: nextParticipants,
        note: notes.trim() || undefined,
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
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="glass-card w-full max-w-md p-6 border border-white/10"
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <ListChecks className="w-4 h-4 text-blue-400" />
              </div>
              <h2 className="text-base font-bold text-white">
                {initialData?.id ? 'Sửa khoản kế hoạch' : 'Thêm khoản kế hoạch'}
              </h2>
            </div>
            <button onClick={onClose} className="btn-icon text-gray-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Title */}
            <div>
              <label className="label-field">Tên khoản chi *</label>
              <input
                className="input-field"
                placeholder="VD: Khách sạn, Ăn tối..."
                value={title}
                onChange={e => setTitle(e.target.value)}
              />
            </div>

            {/* Amount */}
            <div>
              <label className="label-field">Số tiền ước tính (VND) *</label>
              <input
                type="number"
                min="0"
                className="input-field"
                placeholder="VD: 500000"
                value={estimatedAmount}
                onChange={e => setAmount(e.target.value)}
              />
              {estimatedAmount && Number(estimatedAmount) > 0 && (
                <p className="text-xs text-gray-500 mt-1">≈ {formatCurrency(Number(estimatedAmount), true)}</p>
              )}
            </div>

            {/* Category */}
            <div>
              <label className="label-field">Danh mục</label>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {CATEGORIES.map(cat => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategory(cat.id)}
                    className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all duration-150
                      ${category === cat.id
                        ? `${cat.bg} ${cat.color} border-current`
                        : 'border-white/8 text-gray-400 hover:border-white/20'}`}
                  >
                    <span>{cat.icon}</span>
                    <span>{cat.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Split type */}
            <div>
              <label className="label-field">Cách chia (dự kiến)</label>
              <div className="grid grid-cols-3 gap-2 mt-1">
                {SPLIT_TYPES.map(st => (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => setSplitType(st.id)}
                    className={`px-2 py-2 rounded-xl border text-xs font-medium transition-all duration-150
                      ${splitType === st.id
                        ? 'border-blue-500/50 bg-blue-500/10 text-blue-300'
                        : 'border-white/8 text-gray-400 hover:border-white/20'}`}
                  >
                    {st.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Participants */}
            <div>
              <label className="label-field">Người tham gia (dự kiến)</label>
              <div className="flex flex-wrap gap-2 mt-1">
                {availableParticipants.map((participant) => {
                  const key = participantKey(participant);
                  const selected = participants.some((item) => participantKey(item) === key);
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setParticipants((prev) => selected
                        ? prev.filter((item) => participantKey(item) !== key)
                        : [...prev, participant])}
                      className={`px-3 py-1.5 rounded-xl border text-sm transition-all ${
                        selected
                          ? 'border-blue-500/50 bg-blue-500/10 text-white'
                          : 'border-white/8 text-gray-400 hover:border-white/20'
                      }`}
                    >
                      {participant.name}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="label-field">Ghi chú</label>
              <textarea
                className="input-field resize-none"
                rows={2}
                placeholder="Ghi chú thêm..."
                value={notes}
                onChange={e => setNotes(e.target.value)}
              />
            </div>

            {error && (
              <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <div className="flex gap-3 pt-1">
              <AppButton type="button" variant="secondary" onClick={onClose} className="flex-1">Huỷ</AppButton>
              <AppButton
                type="submit"
                loading={saving}
                icon={Check}
                className="flex-1"
              >
                {initialData?.id ? 'Lưu thay đổi' : 'Thêm'}
              </AppButton>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
