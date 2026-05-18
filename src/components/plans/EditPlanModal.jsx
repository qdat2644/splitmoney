import { useState } from 'react';
import { motion } from 'framer-motion';
import { useApp } from '../../context/AppContext';
import PlanParticipantsInput from './PlanParticipantsInput';
import AppButton from '../ui/AppButton';

const PLAN_TYPES = {
  trip: 'Chuyến đi',
  party: 'Tiệc',
  event: 'Sự kiện',
  moving: 'Chuyển nhà',
  wedding: 'Đám cưới',
  custom: 'Khác',
};

export default function EditPlanModal({ plan, onClose, onSave }) {
  const { currentUser } = useApp();
  const ownerId = currentUser?.userId || currentUser?.id;
  const [form, setForm] = useState({
    name: plan.name ?? '',
    type: plan.type ?? 'custom',
    description: plan.description ?? '',
    startDate: plan.startDate?.split('T')[0] ?? '',
    endDate: plan.endDate?.split('T')[0] ?? '',
    status: plan.status ?? 'draft',
  });
  const [participants, setParticipants] = useState((plan.participants ?? []).map((participant) => ({
    id: participant.userId || participant.guestMemberId,
    userId: participant.userId,
    guestMemberId: participant.guestMemberId,
    name: participant.user?.name || participant.guestMember?.displayName || participant.displayName,
    displayName: participant.displayName,
    type: participant.type,
  })));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      await onSave({
        ...form,
        startDate: form.startDate || null,
        endDate: form.endDate || null,
        participants,
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="glass-card w-full max-w-md p-6 border border-white/10 max-h-[90vh] flex flex-col">
        <h2 className="text-lg font-bold text-white mb-4 shrink-0">Chỉnh sửa kế hoạch</h2>
        <form onSubmit={submit} className="space-y-3 overflow-y-auto custom-scrollbar pr-2 flex-1">
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Tên kế hoạch *</label>
            <input className="input-field" value={form.name} onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Loại kế hoạch</label>
              <select className="input-field" value={form.type} onChange={(event) => setForm((prev) => ({ ...prev, type: event.target.value }))}>
                {Object.entries(PLAN_TYPES).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Trạng thái</label>
              <select className="input-field" value={form.status} onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value }))}>
                {['draft', 'active', 'completed', 'archived'].map((status) => <option key={status} value={status}>{status}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Mô tả</label>
            <textarea className="input-field resize-none" rows={2} value={form.description} onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Ngày bắt đầu</label>
              <input type="date" className="input-field" value={form.startDate} onChange={(event) => setForm((prev) => ({ ...prev, startDate: event.target.value }))} />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Ngày kết thúc</label>
              <input type="date" className="input-field" value={form.endDate} onChange={(event) => setForm((prev) => ({ ...prev, endDate: event.target.value }))} />
            </div>
          </div>
          <div className="pt-2 border-t border-white/5">
            <PlanParticipantsInput value={participants} onChange={setParticipants} showRoomMembers={!!plan.roomId} lockedParticipantIds={ownerId ? [ownerId] : []} />
          </div>
          {error && <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>}
          <div className="flex gap-3 pt-4 shrink-0 mt-auto">
            <AppButton type="button" variant="secondary" onClick={onClose} className="flex-1">Hủy</AppButton>
            <AppButton type="submit" loading={saving} className="flex-1">Lưu</AppButton>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
