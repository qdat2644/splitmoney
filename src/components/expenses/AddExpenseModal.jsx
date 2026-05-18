// AddExpenseModal.jsx — Form to add/edit expenses
import { useState, useEffect } from 'react';
import { ModalLayout, ModalHeader, ModalBody, ModalFooter } from '../ui/ModalLayout';
import AppInput from '../ui/AppInput';
import AppButton from '../ui/AppButton';
import Avatar from '../ui/Avatar';
import { useApp } from '../../context/AppContext';
import { CATEGORIES } from '../../data/mockData';
import { todayStr } from '../../utils/formatters';
import { Check, Sparkles, Loader2, AlertTriangle, Info } from 'lucide-react';
import { aiParseApi } from '../../services/apiClient';
import SplitTypeSelector from './SplitTypeSelector';

const safeLower = (value) => String(value || '').toLowerCase().trim();
const memberDisplayName = (member) => member?.name || member?.displayName || member?.username || member?.email || 'Unknown';

const DEFAULT_FORM = {
  title: '',
  amount: '',
  date: todayStr(),
  paidBy: '',
  participants: [],
  note: '',
  category: 'food',
  splitType: 'equal',
};

// Build default splitData from participants
const buildEmptySplitData = (participantIds) =>
  Object.fromEntries((participantIds ?? []).map(id => [id, '']));

export default function AddExpenseModal({ open, onClose, editData = null }) {
  const { members, expenses, addExpense, updateExpense, toast, currentUser, currentRoom } = useApp();
  const [form, setForm] = useState(DEFAULT_FORM);
  const [errors, setErrors] = useState({});
  const [aiText, setAiText] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  // Split data: { [memberId]: string } — exact amounts or percentages
  const [splitData, setSplitData] = useState({});
  
  // New States for AI Upgrades
  const [confidence, setConfidence] = useState(null);
  const [isFallback, setIsFallback] = useState(false);
  const [aiWarnings, setAiWarnings] = useState([]);
  const [aiSignals, setAiSignals] = useState(null);
  const [duplicateWarning, setDuplicateWarning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Populate form when editing
  useEffect(() => {
    if (editData) {
      setForm({
        ...DEFAULT_FORM,
        ...editData,
        amount: String(editData.amount),
      });
      setSplitData(buildEmptySplitData(editData.participants));
    } else {
      const defaultParticipants = members.map((m) => m.id);
      setForm({
        ...DEFAULT_FORM,
        paidBy: currentUser ? currentUser.id : (members[0]?.id || ''),
        participants: defaultParticipants,
        date: todayStr(),
      });
      setSplitData(buildEmptySplitData(defaultParticipants));
    }
    setErrors({});
    setAiText('');
    setConfidence(null);
    setIsFallback(false);
    setAiWarnings([]);
    setAiSignals(null);
    setDuplicateWarning(false);
  }, [editData, open, members]);

  const set = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
    setDuplicateWarning(false); // Reset duplicate warning on manual edit
  };

  const toggleParticipant = (id) => {
    setForm((prev) => {
      const next = prev.participants.includes(id)
        ? prev.participants.filter((p) => p !== id)
        : [...prev.participants, id];
      // Reset splitData for new participant set
      setSplitData(buildEmptySplitData(next));
      return { ...prev, participants: next };
    });
    setDuplicateWarning(false);
  };

  const validate = () => {
    const e = {};
    if (!form.title.trim()) e.title = 'Vui lòng nhập tên khoản chi';
    if (!form.amount || isNaN(Number(form.amount)) || Number(form.amount) <= 0)
      e.amount = 'Số tiền không hợp lệ';
    if (!form.paidBy) e.paidBy = 'Chọn người trả tiền';
    if (form.participants.length === 0) e.participants = 'Chọn ít nhất 1 người tham gia';
    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }

    // Build split shares payload for exact / percentage modes
    let splitShares = undefined;
    if (form.splitType === 'exact' || form.splitType === 'percentage') {
      splitShares = {};
      form.participants.forEach(pid => {
        splitShares[pid] = Number(splitData[pid]) || 0;
      });
    }

    const payload = {
      ...form,
      amount: Number(form.amount),
      ...(splitShares ? { splitShares } : {}),
    };

    // Duplicate detection check
    if (!editData && !duplicateWarning) {
      const isDuplicate = expenses.some(
        exp => exp.amount === payload.amount && exp.paidBy === payload.paidBy && exp.date === payload.date
      );
      if (isDuplicate) {
        setDuplicateWarning(true);
        return; // Pause submission, require second click
      }
    }

    setIsSubmitting(true);
    try {
      if (editData) {
        await updateExpense(editData.id, payload);
      } else {
        await addExpense(payload);
      }
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAiParse = async () => {
    if (!aiText.trim()) return;
    setIsAiLoading(true);
    setDuplicateWarning(false);
    
    try {
      const result = await aiParseApi.parseExpense(currentRoom.roomId, {
        text: aiText,
        selectedParticipantIds: form.participants,
        currentUserId: currentUser?.id,
        currentUserName: currentUser?.name,
      });
      const data = result.data;
      
      const payerId = members.find((member) => safeLower(memberDisplayName(member)) === safeLower(data.payer))?.id;
      const participantIds = data.participants
        .map((name) => members.find((member) => safeLower(memberDisplayName(member)) === safeLower(name))?.id)
        .filter(Boolean);
        
      setForm(prev => ({
        ...prev,
        title: data.title || prev.title,
        amount: data.amount ? String(data.amount) : prev.amount,
        paidBy: payerId || '',
        participants: participantIds.length > 0 ? participantIds : prev.participants,
        category: CATEGORIES.find(c => c.id === data.category) ? data.category : 'other',
        date: data.date || prev.date
      }));
      
      setConfidence(data.confidence ?? (result.isFallback ? 0.3 : 0.9));
      setIsFallback(result.isFallback);
      setAiWarnings(result.warnings || []);
      setAiSignals(data.signals || null);
      if (!payerId) {
        setErrors((prev) => ({ ...prev, paidBy: 'AI chưa xác định được người trả. Vui lòng chọn thủ công.' }));
      }

      if (result.isFallback) {
        toast.error('AI chính đang gặp lỗi, đã dùng bộ phân tích cơ bản dự phòng.');
      } else {
        toast.success('Đã điền tự động dữ liệu từ AI!');
        setAiText(''); // Clear only on full success
      }
      
    } catch (error) {
      toast.error(error.message || 'Không thể phân tích bằng AI');
    } finally {
      setIsAiLoading(false);
    }
  };

  return (
    <ModalLayout open={open} onClose={onClose} size="md">
      <ModalHeader title={editData ? 'Chỉnh sửa khoản chi' : 'Thêm khoản chi mới'} onClose={onClose} />
      <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
        <ModalBody className="space-y-5">
          {/* AI Input Area */}
        {!editData && (
          <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 p-4 rounded-xl border border-blue-500/20 mb-2">
            <label className="label-field text-blue-400 flex items-center gap-1.5 mb-2">
              <Sparkles className="w-4 h-4" />
              Nhập nhanh bằng AI
            </label>
            <div className="flex gap-2">
              <input
                className="input-field bg-dark-800/50 border-white/10"
                placeholder="VD: Nam trả 350k ăn lẩu cho Minh và Hùng..."
                value={aiText}
                onChange={(e) => setAiText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAiParse();
                  }
                }}
              />
              <AppButton 
                type="button" 
                onClick={handleAiParse}
                disabled={isAiLoading || !aiText.trim()}
                className="bg-gradient-to-r from-blue-500 to-purple-500 border-none whitespace-nowrap min-w-[70px]"
                icon={isAiLoading ? Loader2 : null}
              >
                {!isAiLoading && 'Tạo'}
              </AppButton>
            </div>
            
            {/* Confidence Indicators */}
            {confidence !== null && (
              <div className={`mt-3 flex items-start gap-2 p-2.5 rounded-lg text-xs ${
                confidence >= 0.8 ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
                confidence >= 0.5 ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20' :
                'bg-red-500/10 text-red-400 border border-red-500/20'
              }`}>
                {confidence >= 0.8 ? <Check className="w-4 h-4 shrink-0 mt-0.5" /> : 
                 confidence >= 0.5 ? <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" /> : 
                 <Info className="w-4 h-4 shrink-0 mt-0.5" />}
                <div>
                  <p className="font-medium">
                    {confidence >= 0.8 ? 'Độ tin cậy cao' : 
                     confidence >= 0.5 ? 'Cần kiểm tra lại một số thông tin' : 
                     'Chưa chắc chắn, vui lòng nhập thủ công phần còn thiếu'}
                  </p>
                  {isFallback && <p className="opacity-80 mt-0.5">Dữ liệu được bóc tách bằng bộ phân tích dự phòng cơ bản.</p>}
                </div>
              </div>
            )}
            {(aiWarnings.length > 0 || aiSignals) && (
              <div className="mt-2 space-y-1 text-xs text-gray-300">
                {aiSignals && (
                  <p>
                    Số tiền: {aiSignals.amountDetected ? 'đã nhận diện' : 'chưa nhận diện'} · Người trả: {aiSignals.payerMatched ? 'đã khớp' : 'chưa khớp'} · Người tham gia: {aiSignals.participantsMatched ? 'đã khớp' : 'giữ lựa chọn hiện tại'}
                  </p>
                )}
                {aiWarnings.map((warning) => (
                  <p key={warning} className="text-yellow-300">{warning}</p>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Title */}
        <AppInput
          label="Tên khoản chi"
          required
          placeholder="VD: Ăn lẩu, Xăng xe..."
          value={form.title}
          onChange={(e) => set('title', e.target.value)}
          error={errors.title}
        />

        {/* Amount & Date */}
        <div className="grid grid-cols-2 gap-3">
          <AppInput
            label="Số tiền (VND)"
            required
            type="number"
            min="0"
            placeholder="VD: 300000"
            value={form.amount}
            onChange={(e) => set('amount', e.target.value)}
            error={errors.amount}
          />
          <AppInput
            label="Ngày chi"
            required
            type="date"
            value={form.date}
            onChange={(e) => set('date', e.target.value)}
          />
        </div>

        {/* Category */}
        <div>
          <label className="label-field">Danh mục</label>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => set('category', cat.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all duration-150
                  ${form.category === cat.id
                    ? `${cat.bg} ${cat.color} border-current`
                    : 'border-white/8 text-gray-400 hover:border-white/20'
                  }`}
              >
                <span>{cat.icon}</span>
                <span>{cat.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Paid by */}
        <div>
          <label className="label-field">Người trả tiền *</label>
          <div className="flex flex-wrap gap-2">
            {members.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => set('paidBy', m.id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm transition-all duration-150
                  ${form.paidBy === m.id
                    ? 'border-blue-500/50 bg-blue-500/10 text-white'
                    : 'border-white/8 text-gray-400 hover:border-white/20'
                  }`}
              >
                <Avatar member={m} size="xs" />
                <span>{m.name}</span>
              </button>
            ))}
          </div>
          {errors.paidBy && <p className="text-red-400 text-xs mt-1">{errors.paidBy}</p>}
        </div>

        {/* Participants */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="label-field mb-0">Người tham gia *</label>
            <button
              type="button"
              onClick={() =>
                set('participants',
                  form.participants.length === members.length ? [] : members.map((m) => m.id)
                )
              }
              className="text-[10px] text-blue-400 hover:text-blue-300"
            >
              {form.participants.length === members.length ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {members.map((m) => {
              const selected = form.participants.includes(m.id);
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => toggleParticipant(m.id)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm transition-all duration-150
                    ${selected
                      ? 'border-purple-500/50 bg-purple-500/10 text-white'
                      : 'border-white/8 text-gray-400 hover:border-white/20'
                    }`}
                >
                  <Avatar member={m} size="xs" />
                  <span>{m.name}</span>
                  {selected && <Check className="w-3 h-3 text-purple-400" />}
                </button>
              );
            })}
          </div>
          {errors.participants && <p className="text-red-400 text-xs mt-1">{errors.participants}</p>}
        </div>

        {/* ── Split Type Selector ── */}
        {form.participants.length > 0 && (
          <SplitTypeSelector
            splitType={form.splitType}
            setSplitType={(v) => set('splitType', v)}
            total={form.amount}
            participants={form.participants}
            members={members}
            splitData={splitData}
            setSplitData={setSplitData}
          />
        )}

        {/* Note */}
        <AppInput
          multiline
          label="Ghi chú"
          rows={2}
          placeholder="Ghi chú thêm..."
          value={form.note}
          onChange={(e) => set('note', e.target.value)}
        />

        {/* Duplicate Warning Modal/Alert */}
        {duplicateWarning && (
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-3 flex items-start gap-3 mt-4">
            <AlertTriangle className="w-5 h-5 text-yellow-400 shrink-0" />
            <div>
              <p className="text-sm font-medium text-yellow-400">Khoản chi có thể bị trùng lặp!</p>
              <p className="text-xs text-yellow-500/80 mt-1">
                Hệ thống phát hiện một khoản chi cùng số tiền và người trả vào ngày này đã tồn tại. Bạn có chắc chắn muốn lưu thêm?
              </p>
            </div>
          </div>
        )}

        </ModalBody>
        <ModalFooter>
          <AppButton type="button" variant="secondary" onClick={onClose} className="w-full sm:w-auto" disabled={isSubmitting}>
            Huỷ
          </AppButton>
          <AppButton 
            type="submit" 
            loading={isSubmitting}
            variant={duplicateWarning ? 'danger' : 'primary'} 
            className={`w-full sm:w-auto ${duplicateWarning ? 'bg-yellow-500 hover:bg-yellow-600 border-none' : ''}`}
          >
            {duplicateWarning ? 'Vẫn lưu khoản chi' : (editData ? 'Lưu thay đổi' : 'Thêm khoản chi')}
          </AppButton>
        </ModalFooter>
      </form>
    </ModalLayout>
  );
}
