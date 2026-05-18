// SplitTypeSelector.jsx — Multi-mode split type UI (equal / exact / percentage)
import { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Equal, Hash, Percent, AlertTriangle } from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';
import Avatar from '../ui/Avatar';

const MODES = [
  { id: 'equal',      label: 'Đều nhau',    icon: Equal,   desc: 'Chia đều cho tất cả' },
  { id: 'exact',      label: 'Số tiền cụ thể', icon: Hash, desc: 'Mỗi người trả một số tiền xác định' },
  { id: 'percentage', label: 'Phần trăm',   icon: Percent, desc: 'Chia theo tỷ lệ %' },
];

/**
 * Props:
 *   splitType     — 'equal' | 'exact' | 'percentage'
 *   setSplitType  — setter
 *   total         — number (total expense amount)
 *   participants  — string[] (member IDs)
 *   members       — Member[] (full member list)
 *   splitData     — { [memberId]: number }  (exact amounts or percentages)
 *   setSplitData  — setter
 */
export default function SplitTypeSelector({
  splitType, setSplitType,
  total, participants, members,
  splitData, setSplitData,
}) {
  const participantMembers = useMemo(
    () => members.filter(m => participants.includes(m.id)),
    [members, participants]
  );

  const totalNum = Number(total) || 0;

  // ── Derived computations ──────────────────────────────────────────────────
  const equalShare = participantMembers.length > 0
    ? Math.round(totalNum / participantMembers.length)
    : 0;

  const exactSum = useMemo(
    () => participantMembers.reduce((s, m) => s + (Number(splitData[m.id]) || 0), 0),
    [participantMembers, splitData]
  );

  const pctSum = useMemo(
    () => participantMembers.reduce((s, m) => s + (Number(splitData[m.id]) || 0), 0),
    [participantMembers, splitData]
  );

  const exactRemaining = totalNum - exactSum;
  const pctRemaining   = 100 - pctSum;

  const exactInvalid   = Math.abs(exactRemaining) > 1; // allow ±1đ rounding
  const pctInvalid     = Math.abs(pctRemaining) > 0.1;
  const anyExactExceeds = exactSum > totalNum + 1;
  const pctExceeds     = pctSum > 100.05;

  // ── Helpers ───────────────────────────────────────────────────────────────
  const handleModeChange = (mode) => {
    setSplitType(mode);
    // Reset splitData on mode switch to avoid stale values
    const reset = {};
    participantMembers.forEach(m => { reset[m.id] = ''; });
    setSplitData(reset);
  };

  const handleExactChange = (memberId, val) => {
    setSplitData(prev => ({ ...prev, [memberId]: val }));
  };

  const handlePctChange = (memberId, val) => {
    const num = Math.min(Number(val) || 0, 100);
    setSplitData(prev => ({ ...prev, [memberId]: String(num) }));
  };

  if (participantMembers.length === 0) return null;

  return (
    <div className="space-y-3">
      {/* ── Mode selector ── */}
      <label className="label-field">Cách chia tiền</label>
      <div className="grid grid-cols-3 gap-2">
        {MODES.map(m => {
          const Icon = m.icon;
          const active = splitType === m.id;
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => handleModeChange(m.id)}
              className={`flex flex-col items-center gap-1.5 p-2.5 rounded-xl border text-xs font-medium transition-all duration-200
                ${active
                  ? 'border-blue-500/60 bg-blue-500/15 text-blue-300'
                  : 'border-white/8 text-gray-400 hover:border-white/20 hover:text-gray-300'
                }`}
            >
              <Icon className={`w-4 h-4 ${active ? 'text-blue-400' : ''}`} />
              {m.label}
            </button>
          );
        })}
      </div>

      {/* ── Preview per mode ── */}
      <AnimatePresence mode="wait">
        {/* EQUAL */}
        {splitType === 'equal' && (
          <motion.div
            key="equal"
            initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.18 }}
            className="space-y-1.5"
          >
            {participantMembers.map(m => (
              <div key={m.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-white/4 border border-white/5">
                <div className="flex items-center gap-2">
                  <Avatar member={m} size="xs" />
                  <span className="text-sm text-gray-300">{m.name}</span>
                </div>
                <span className="text-sm font-semibold text-blue-300">
                  {totalNum > 0 ? formatCurrency(equalShare, true) : '—'}
                </span>
              </div>
            ))}
            {totalNum > 0 && participantMembers.length > 1 && (
              <p className="text-xs text-gray-500 text-center pt-0.5">
                Chia đều {participantMembers.length} người • mỗi người {formatCurrency(equalShare, true)}
              </p>
            )}
          </motion.div>
        )}

        {/* EXACT */}
        {splitType === 'exact' && (
          <motion.div
            key="exact"
            initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.18 }}
            className="space-y-2"
          >
            {participantMembers.map(m => (
              <div key={m.id} className="flex items-center gap-3">
                <div className="flex items-center gap-2 w-28 shrink-0">
                  <Avatar member={m} size="xs" />
                  <span className="text-xs text-gray-300 truncate">{m.name}</span>
                </div>
                <input
                  type="number"
                  min="0"
                  className={`input-field flex-1 text-sm py-1.5 ${
                    Number(splitData[m.id]) > totalNum ? 'border-red-500/50' : ''
                  }`}
                  placeholder="0"
                  value={splitData[m.id] ?? ''}
                  onChange={e => handleExactChange(m.id, e.target.value)}
                />
                <span className="text-xs text-gray-500 w-6">đ</span>
              </div>
            ))}

            {/* Status bar */}
            <div className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs border ${
              anyExactExceeds
                ? 'bg-red-500/10 border-red-500/30 text-red-400'
                : exactInvalid
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
            }`}>
              {anyExactExceeds
                ? <><AlertTriangle className="w-3.5 h-3.5 mr-1 inline" />Vượt quá tổng {formatCurrency(Math.abs(exactRemaining), true)}</>
                : exactInvalid
                ? `Còn lại: ${formatCurrency(Math.abs(exactRemaining), true)}${exactRemaining < 0 ? ' (vượt)' : ''}`
                : '✓ Tổng khớp với số tiền'}
            </div>
          </motion.div>
        )}

        {/* PERCENTAGE */}
        {splitType === 'percentage' && (
          <motion.div
            key="pct"
            initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.18 }}
            className="space-y-2"
          >
            {participantMembers.map(m => {
              const pct = Number(splitData[m.id]) || 0;
              const vnd = totalNum > 0 ? Math.round(totalNum * pct / 100) : 0;
              return (
                <div key={m.id} className="flex items-center gap-3">
                  <div className="flex items-center gap-2 w-28 shrink-0">
                    <Avatar member={m} size="xs" />
                    <span className="text-xs text-gray-300 truncate">{m.name}</span>
                  </div>
                  <div className="flex-1 relative">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      className={`input-field w-full text-sm py-1.5 pr-8 ${pct > 100 ? 'border-red-500/50' : ''}`}
                      placeholder="0"
                      value={splitData[m.id] ?? ''}
                      onChange={e => handlePctChange(m.id, e.target.value)}
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-500">%</span>
                  </div>
                  <span className="text-xs text-blue-300 w-20 text-right shrink-0">
                    {totalNum > 0 && pct > 0 ? formatCurrency(vnd, true) : '—'}
                  </span>
                </div>
              );
            })}

            {/* % status bar */}
            <div className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs border ${
              pctExceeds
                ? 'bg-red-500/10 border-red-500/30 text-red-400'
                : pctInvalid
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
            }`}>
              <span>Tổng: <strong>{pctSum.toFixed(1)}%</strong></span>
              {pctExceeds
                ? <span className="flex items-center gap-1"><AlertTriangle className="w-3 h-3" />Vượt 100%</span>
                : pctInvalid
                ? <span>Còn lại: {pctRemaining.toFixed(1)}%</span>
                : <span>✓ Đủ 100%</span>}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
