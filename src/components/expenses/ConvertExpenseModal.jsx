// ConvertExpenseModal.jsx — Convert a plan expense into a real room expense
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowRight, CheckCircle, Loader2, ExternalLink } from 'lucide-react';
import { formatCurrency, todayStr } from '../../utils/formatters';
import { useRoomMembers } from '../../hooks/useRoomMembers';
import { ModalLayout, ModalHeader, ModalBody, ModalFooter } from '../ui/ModalLayout';
import AppInput from '../ui/AppInput';
import AppSelect from '../ui/AppSelect';
import AppButton from '../ui/AppButton';

/**
 * Props:
 *   open         — boolean
 *   onClose      — fn
 *   planExpense  — plan expense object (title, estimatedAmount, category...)
 *   rooms        — Room[] (user's available rooms)
 *   onConvert    — async (planExpenseId, { roomId, paidBy, date }) => void
 *   members      — Member[] for selected room (pass from parent or load inside)
 */
export default function ConvertExpenseModal({ open, onClose, planExpense, rooms, onConvert }) {
  const [step, setStep]         = useState(1); // 1=choose room, 2=choose payer, 3=confirm
  const [roomId, setRoomId]     = useState('');
  const [paidBy, setPaidBy]     = useState('');
  const [date, setDate]         = useState(todayStr());
  const [mapping, setMapping]   = useState({}); // { [manualName]: roomMemberId }
  const [loading, setLoading]   = useState(false);
  const [done, setDone]         = useState(false);
  const [resultExpId, setResultExpId] = useState(null);
  const [error, setError]       = useState('');

  const { members: roomMembers, loading: membersLoading, error: membersError } = useRoomMembers(roomId);

  const parsedParticipants = planExpense?.participants ? (typeof planExpense.participants === 'string' ? JSON.parse(planExpense.participants) : planExpense.participants) : [];
  const manualParticipants = parsedParticipants.filter(p => p.type === 'manual');

  const reset = () => {
    setStep(1); setRoomId(''); setPaidBy(''); setDate(todayStr()); setMapping({});
    setLoading(false); setDone(false); setResultExpId(null); setError('');
  };

  const handleClose = () => { reset(); onClose(); };

  const handleConvert = async () => {
    if (!roomId || !paidBy) { setError('Vui lòng chọn phòng và người trả'); return; }
    
    // validate mapping if there are manual participants
    const unmapped = manualParticipants.filter(p => !mapping[p.displayName]);
    if (unmapped.length > 0) {
      setError(`Vui lòng chọn thành viên tương ứng cho: ${unmapped.map(u=>u.displayName).join(', ')}`);
      return;
    }

    setLoading(true); setError('');
    try {
      const payer = roomMembers.find((member) => member.id === paidBy);
      
      const participantMapping = {};
      Object.keys(mapping).forEach(name => {
         const m = roomMembers.find(rm => rm.id === mapping[name]);
         if(m) participantMapping[name] = { id: m.id, type: m.type };
      });

      const res = await onConvert(planExpense.id, {
        roomId,
        paidByUserId: payer?.type === 'user' ? paidBy : null,
        paidByGuestMemberId: payer?.type === 'guest' ? paidBy : null,
        date,
        participantMapping
      });
      setResultExpId(res?.expense?.id ?? null);
      setDone(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <ModalLayout open={open} onClose={handleClose} size="md">
      <ModalHeader 
        title="Chuyển thành khoản chi thực" 
        subtitle={planExpense?.title} 
        icon={ArrowRight} 
        onClose={handleClose} 
      />

      {done ? (
        <ModalBody className="flex flex-col items-center gap-4 py-8 text-center" noPadding>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center gap-4"
          >
            <CheckCircle className="w-14 h-14 text-emerald-400" />
            <div>
              <p className="text-white font-bold text-lg">Đã chuyển thành công!</p>
              <p className="text-gray-400 text-sm mt-1">
                Khoản chi <span className="text-white font-medium">"{planExpense?.title}"</span> đã được tạo.
              </p>
            </div>
            {resultExpId && (
              <p className="text-xs text-blue-400 flex items-center gap-1">
                <ExternalLink className="w-3 h-3" />
                Expense ID: {resultExpId}
              </p>
            )}
          </motion.div>
        </ModalBody>
      ) : (
        <form className="flex flex-col flex-1 overflow-hidden" onSubmit={(e) => { e.preventDefault(); handleConvert(); }}>
          <ModalBody className="space-y-5">
            {/* ── Preview card ── */}
                <div className="bg-white/4 border border-white/8 rounded-xl p-4 space-y-1.5">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Tên khoản</span>
                    <span className="text-white font-medium">{planExpense?.title}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Số tiền ước tính</span>
                    <span className="text-blue-300 font-semibold">{formatCurrency(planExpense?.estimatedAmount, true)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Danh mục</span>
                    <span className="text-gray-300">{planExpense?.category}</span>
                  </div>
                </div>

                {/* ── Step 1: Room ── */}
                {rooms?.length === 0 ? (
                  <div>
                    <label className="block mb-1.5 text-sm font-medium text-gray-300">1. Chọn phòng *</label>
                    <p className="text-xs text-gray-500">Bạn chưa có phòng nào</p>
                  </div>
                ) : (
                  <AppSelect
                    label="1. Chọn phòng *"
                    value={roomId}
                    onChange={e => { setRoomId(e.target.value); setPaidBy(''); setMapping({}); }}
                  >
                    <option value="">— Chọn phòng —</option>
                    {rooms?.map(r => (
                      <option key={r.roomId} value={r.roomId}>{r.room?.name ?? r.roomId}</option>
                    ))}
                  </AppSelect>
                )}

                {/* ── Step 1.5: Participant Mapping ── */}
                {roomId && manualParticipants.length > 0 && (
                  <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="space-y-3 bg-blue-500/5 p-3 rounded-xl border border-blue-500/20">
                    <label className="label-field !mb-0 text-blue-400">Ghép nối thành viên tạm thời</label>
                    <p className="text-[10px] text-gray-400">Kế hoạch này có các thành viên tạm. Hãy chọn tài khoản/khách tương ứng trong phòng.</p>
                    
                    {membersLoading ? (
                      <p className="text-xs text-gray-500">Đang tải danh sách thành viên...</p>
                    ) : (
                      <div className="space-y-2">
                        {manualParticipants.map(p => (
                          <div key={p.displayName} className="flex items-center gap-2">
                            <span className="text-sm text-gray-300 w-1/3 truncate">{p.displayName}</span>
                            <span className="text-gray-500">→</span>
                            <AppSelect 
                              className="py-1 text-sm flex-1"
                              value={mapping[p.displayName] || ''}
                              onChange={e => setMapping({...mapping, [p.displayName]: e.target.value})}
                            >
                              <option value="">— Chọn thành viên —</option>
                              {roomMembers.map(m => (
                                <option key={m.id} value={m.id}>{m.name}</option>
                              ))}
                            </AppSelect>
                          </div>
                        ))}
                      </div>
                    )}
                  </motion.div>
                )}

                {/* ── Step 2: Payer ── */}
                {roomId && (
                  <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}>
                    <label className="label-field">2. Người trả tiền *</label>
                    {membersLoading ? (
                      <p className="text-xs text-gray-500 mt-1">Đang tải danh sách thành viên...</p>
                    ) : membersError ? (
                      <p className="text-xs text-red-400 mt-1">{membersError}</p>
                    ) : roomMembers.length === 0 ? (
                      <p className="text-xs text-gray-500 mt-1">Không có thành viên hợp lệ.</p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {roomMembers.map(m => (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => setPaidBy(m.id)}
                            className={`px-3 py-1.5 rounded-xl border text-sm transition-all ${
                              paidBy === m.id
                                ? 'border-blue-500/50 bg-blue-500/10 text-white'
                                : 'border-white/8 text-gray-400 hover:border-white/20'
                            }`}
                          >
                            {m.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </motion.div>
                )}

                {/* ── Step 3: Date ── */}
                {paidBy && (
                  <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}>
                    <AppInput
                      label="3. Ngày thực hiện"
                      type="date"
                      value={date}
                      onChange={e => setDate(e.target.value)}
                    />
                  </motion.div>
                )}

            {error && (
              <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                {error}
              </p>
            )}
          </ModalBody>
          <ModalFooter>
            {done ? (
              <AppButton type="button" onClick={handleClose} className="w-full sm:w-auto">Đóng</AppButton>
            ) : (
              <>
                <AppButton type="button" variant="secondary" onClick={handleClose} className="w-full sm:w-auto">Huỷ</AppButton>
                <AppButton
                  type="submit"
                  disabled={!roomId || !paidBy}
                  loading={loading}
                  icon={ArrowRight}
                  className="w-full sm:w-auto"
                >
                  Tạo khoản chi
                </AppButton>
              </>
            )}
          </ModalFooter>
        </form>
      )}
    </ModalLayout>
  );
}
