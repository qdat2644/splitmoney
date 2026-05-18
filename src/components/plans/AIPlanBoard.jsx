import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Save, X, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';

const CATEGORY_ICONS = {
  food: '🍜', drinks: '☕', transport: '🚗', accommodation: '🏠',
  grocery: '🛒', entertainment: '🎮', other: '📦',
};

function AIPlanItemCard({ item, index, onUpdate, onRemove }) {
  const [editing, setEditing] = useState(false);
  const [amount, setAmount] = useState(item.recommendedAmount || item.estimatedAmountMax || 0);
  const [title, setTitle] = useState(item.title);
  const [category, setCategory] = useState(item.category || 'other');
  
  const handleSave = () => {
    onUpdate(index, { ...item, recommendedAmount: Number(amount), title, category });
    setEditing(false);
  };

  return (
    <motion.div layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
      className="bg-dark-800/80 border border-white/10 rounded-xl p-3 mb-2 flex flex-col gap-2 relative group"
    >
      <button onClick={() => onRemove(index)} className="absolute top-2 right-2 text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity p-1">
        <X className="w-3.5 h-3.5" />
      </button>

      {editing ? (
        <div className="space-y-2">
          <input className="input-field py-1 text-sm font-medium" value={title} onChange={e=>setTitle(e.target.value)} />
          <div className="flex gap-2">
            <input type="number" className="input-field py-1 text-sm w-full" value={amount} onChange={e=>setAmount(e.target.value)} />
            <select className="input-field py-1 text-sm" value={category} onChange={e=>setCategory(e.target.value)}>
              {Object.keys(CATEGORY_ICONS).map(c => <option key={c} value={c}>{CATEGORY_ICONS[c]} {c}</option>)}
            </select>
          </div>
          <button onClick={handleSave} className="btn-primary text-xs py-1 w-full flex items-center justify-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" /> Xong
          </button>
        </div>
      ) : (
        <div className="flex items-start justify-between pr-6" onClick={() => setEditing(true)}>
          <div className="flex items-center gap-2 cursor-pointer">
            <span className="text-xl bg-white/5 p-1.5 rounded-lg">{CATEGORY_ICONS[item.category] || '📦'}</span>
            <div>
              <p className="text-sm font-medium text-white">{item.title}</p>
              <p className="text-[10px] text-gray-400 line-clamp-1">{item.notes}</p>
            </div>
          </div>
          <div className="text-right cursor-pointer">
            <p className="text-sm font-bold text-blue-400">{formatCurrency(item.recommendedAmount || item.estimatedAmountMax, true)}</p>
            {item.estimatedAmountMin && item.estimatedAmountMax && (
               <p className="text-[10px] text-gray-500">
                 {formatCurrency(item.estimatedAmountMin, true)} - {formatCurrency(item.estimatedAmountMax, true)}
               </p>
            )}
          </div>
        </div>
      )}
    </motion.div>
  );
}

export default function AIPlanBoard({ planData, onSaveToPlan, onDiscard }) {
  const [items, setItems] = useState(planData.items || []);
  const [saving, setSaving] = useState(false);

  const total = items.reduce((s, i) => s + Number(i.recommendedAmount || i.estimatedAmountMax || 0), 0);

  const handleUpdateItem = (idx, newData) => {
    const newItems = [...items];
    newItems[idx] = newData;
    setItems(newItems);
  };

  const handleRemoveItem = (idx) => {
    setItems(items.filter((_, i) => i !== idx));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSaveToPlan({ ...planData, items, estimatedTotal: total });
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
      className="glass-card border border-blue-500/30 shadow-[0_0_20px_rgba(59,130,246,0.1)] overflow-hidden mb-6 flex flex-col max-h-[80vh]"
    >
      {/* Summary Card */}
      <div className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 p-5 border-b border-white/5 shrink-0">
        <h3 className="text-xl font-extrabold text-white mb-1">{planData.title}</h3>
        <div className="flex items-center gap-4 text-sm mt-3">
          <div className="bg-white/5 px-3 py-1.5 rounded-lg border border-white/10">
            <span className="text-gray-400 block text-[10px] uppercase">Đề xuất</span>
            <span className="text-blue-400 font-bold">{formatCurrency(total, true)}</span>
          </div>
          {planData.estimatedTotalMin && planData.estimatedTotalMax && (
            <div className="bg-white/5 px-3 py-1.5 rounded-lg border border-white/10">
              <span className="text-gray-400 block text-[10px] uppercase">Khoảng giá</span>
              <span className="text-gray-300 font-medium">{formatCurrency(planData.estimatedTotalMin, true)} - {formatCurrency(planData.estimatedTotalMax, true)}</span>
            </div>
          )}
        </div>

        {planData.warnings?.length > 0 && (
          <div className="mt-4 p-2 bg-yellow-500/10 border border-yellow-500/20 rounded-lg text-xs text-yellow-400 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <ul className="list-disc list-inside">
              {planData.warnings.map((w, i) => <li key={i}>{w}</li>)}
            </ul>
          </div>
        )}
      </div>

      {/* Scrollable Items */}
      <div className="p-4 overflow-y-auto flex-1 custom-scrollbar bg-dark-900/50">
        <p className="text-xs text-gray-400 mb-3 font-medium uppercase tracking-wider">Các khoản chi dự kiến ({items.length})</p>
        <AnimatePresence>
          {items.map((item, idx) => (
            <AIPlanItemCard key={idx} item={item} index={idx} onUpdate={handleUpdateItem} onRemove={handleRemoveItem} />
          ))}
        </AnimatePresence>
      </div>

      {/* Sticky Action Bar */}
      <div className="p-4 border-t border-white/10 bg-dark-800 shrink-0">
        <div className="flex gap-3">
          <button onClick={onDiscard} className="btn-secondary flex-1 py-2.5">
            Huỷ bỏ
          </button>
          <button onClick={handleSave} disabled={saving} className="btn-primary flex-1 py-2.5 flex items-center justify-center gap-2 bg-gradient-to-r from-blue-500 to-purple-500 border-none hover:opacity-90">
            {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Save className="w-4 h-4" /> Lưu thành Kế hoạch</>}
          </button>
        </div>
      </div>
    </motion.div>
  );
}
