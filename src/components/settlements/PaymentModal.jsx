// PaymentModal.jsx — Manual payment between two members
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Wallet, AlertCircle, CheckCircle2 } from 'lucide-react';
import Modal from '../ui/Modal';
import Avatar from '../ui/Avatar';
import AppButton from '../ui/AppButton';
import { useApp } from '../../context/AppContext';
import { formatCurrency, todayStr } from '../../utils/formatters';

const DEFAULT_FORM = {
  from: '',
  to: '',
  amount: '',
  date: todayStr(),
  note: '',
};

export default function PaymentModal({ open, onClose, prefill = null }) {
  const { members, balances, addPayment } = useApp();
  const [form, setForm] = useState(DEFAULT_FORM);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  // Pre-fill from a settlement suggestion
  useEffect(() => {
    if (!open) return;
    if (prefill) {
      setForm({
        ...DEFAULT_FORM,
        from: prefill.from || '',
        to: prefill.to || '',
        amount: prefill.amount ? String(prefill.amount) : '',
        date: todayStr(),
      });
    } else {
      setForm({ ...DEFAULT_FORM, date: todayStr() });
    }
    setErrors({});
  }, [open, prefill]);

  const set = (field, val) => {
    setForm((p) => ({ ...p, [field]: val }));
    setErrors((p) => ({ ...p, [field]: undefined }));
  };

  // Current debt of `from` toward `to`
  const currentDebt = (() => {
    if (!form.from || !form.to || form.from === form.to) return null;
    const fromBal = balances[form.from] ?? 0;
    const toBal   = balances[form.to]   ?? 0;
    // How much from owes to: only meaningful if from is negative & to is positive
    // We show the net theoretical debt between the pair
    return null; // handled via settlements display below
  })();

  // Find suggested amount from settlement algorithm
  const suggestedSettlement = (() => {
    if (!form.from || !form.to || form.from === form.to) return null;
    // Use raw balances to compute pair debt
    const fromBal = Math.round(balances[form.from] ?? 0);
    const toBal   = Math.round(balances[form.to]   ?? 0);
    if (fromBal < 0 && toBal > 0) {
      return Math.min(-fromBal, toBal);
    }
    return null;
  })();

  const fromMember = members.find((m) => m.id === form.from);
  const toMember   = members.find((m) => m.id === form.to);
  const enteredAmount = Number(form.amount) || 0;

  const validate = () => {
    const e = {};
    if (!form.from) e.from = 'Chọn người trả';
    if (!form.to)   e.to   = 'Chọn người nhận';
    if (form.from === form.to && form.from) e.to = 'Người trả và nhận không được giống nhau';
    if (!form.amount || isNaN(Number(form.amount)) || Number(form.amount) <= 0)
      e.amount = 'Nhập số tiền hợp lệ';
    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    
    setLoading(true);
    try {
      await addPayment({ ...form, amount: enteredAmount });
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const isOverpaying = suggestedSettlement !== null && enteredAmount > suggestedSettlement;
  const isExact      = suggestedSettlement !== null && enteredAmount === suggestedSettlement;

  return (
    <Modal open={open} onClose={onClose} title="Ghi nhận thanh toán" size="sm">
      <form onSubmit={handleSubmit} className="space-y-4">

        {/* From → To selector */}
        <div className="space-y-3">
          {/* From */}
          <div>
            <label className="label-field">Người trả tiền *</label>
            <div className="flex flex-wrap gap-2">
              {members.map((m) => {
                const bal = Math.round(balances[m.id] ?? 0);
                const isDebtor = bal < 0;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => { set('from', m.id); if (form.to === m.id) set('to', ''); }}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm transition-all duration-150
                      ${form.from === m.id
                        ? 'border-red-500/50 bg-red-500/10 text-white'
                        : 'border-white/8 text-gray-400 hover:border-white/20'
                      }`}
                  >
                    <Avatar member={m} size="xs" />
                    <span>{m.name}</span>
                    {isDebtor && (
                      <span className="text-[10px] text-red-400 font-medium">
                        nợ {formatCurrency(-bal, true)}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            {errors.from && <p className="text-red-400 text-xs mt-1">{errors.from}</p>}
          </div>

          {/* Arrow */}
          {form.from && form.to && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center justify-center gap-3 py-1"
            >
              <Avatar member={fromMember} size="sm" />
              <div className="flex items-center gap-1.5">
                <div className="w-12 h-px bg-gradient-to-r from-red-500 to-emerald-500" />
                <ArrowRight className="w-4 h-4 text-emerald-400" />
              </div>
              <Avatar member={toMember} size="sm" />
            </motion.div>
          )}

          {/* To */}
          <div>
            <label className="label-field">Người nhận tiền *</label>
            <div className="flex flex-wrap gap-2">
              {members.map((m) => {
                const bal = Math.round(balances[m.id] ?? 0);
                const isCreditor = bal > 0;
                const disabled = m.id === form.from;
                return (
                  <button
                    key={m.id}
                    type="button"
                    disabled={disabled}
                    onClick={() => set('to', m.id)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm transition-all duration-150
                      ${disabled ? 'opacity-30 cursor-not-allowed border-white/5' :
                        form.to === m.id
                          ? 'border-emerald-500/50 bg-emerald-500/10 text-white'
                          : 'border-white/8 text-gray-400 hover:border-white/20'
                      }`}
                  >
                    <Avatar member={m} size="xs" />
                    <span>{m.name}</span>
                    {isCreditor && (
                      <span className="text-[10px] text-emerald-400 font-medium">
                        được {formatCurrency(bal, true)}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            {errors.to && <p className="text-red-400 text-xs mt-1">{errors.to}</p>}
          </div>
        </div>

        {/* Suggested settlement hint */}
        <AnimatePresence>
          {suggestedSettlement !== null && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="rounded-xl px-4 py-3 bg-blue-500/8 border border-blue-500/20 text-xs text-blue-300 flex items-center gap-2"
            >
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>
                Số nợ gợi ý: <strong>{formatCurrency(suggestedSettlement)}</strong>
                <button
                  type="button"
                  onClick={() => set('amount', String(suggestedSettlement))}
                  className="ml-2 underline text-blue-400 hover:text-blue-200"
                >
                  Dùng số này
                </button>
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Amount */}
        <div>
          <label className="label-field">Số tiền thanh toán (VND) *</label>
          <input
            className="input-field text-lg font-semibold"
            type="number"
            placeholder="Nhập số tiền..."
            min="1"
            value={form.amount}
            onChange={(e) => set('amount', e.target.value)}
          />
          {errors.amount && <p className="text-red-400 text-xs mt-1">{errors.amount}</p>}

          {/* Status indicator */}
          <AnimatePresence>
            {enteredAmount > 0 && suggestedSettlement !== null && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className={`text-xs mt-1.5 flex items-center gap-1.5
                  ${isExact ? 'text-emerald-400' : isOverpaying ? 'text-yellow-400' : 'text-blue-400'}`}
              >
                {isExact
                  ? <><CheckCircle2 className="w-3 h-3" /> Thanh toán đúng số nợ — sẽ cân bằng hoàn toàn</>
                  : isOverpaying
                  ? <><AlertCircle className="w-3 h-3" /> Trả thừa {formatCurrency(enteredAmount - suggestedSettlement, true)} — {toMember?.name} sẽ nợ lại</>
                  : <><AlertCircle className="w-3 h-3" /> Thanh toán một phần — còn nợ {formatCurrency(suggestedSettlement - enteredAmount, true)}</>
                }
              </motion.p>
            )}
          </AnimatePresence>
        </div>

        {/* Date & Note */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label-field">Ngày</label>
            <input
              className="input-field"
              type="date"
              value={form.date}
              onChange={(e) => set('date', e.target.value)}
            />
          </div>
          <div>
            <label className="label-field">Ghi chú</label>
            <input
              className="input-field"
              placeholder="Chuyển khoản, tiền mặt..."
              value={form.note}
              onChange={(e) => set('note', e.target.value)}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-1">
          <AppButton type="button" variant="secondary" onClick={onClose} className="flex-1">
            Huỷ
          </AppButton>
          <AppButton type="submit" loading={loading} icon={Wallet} className="flex-1">
            Ghi nhận thanh toán
          </AppButton>
        </div>
      </form>
    </Modal>
  );
}
