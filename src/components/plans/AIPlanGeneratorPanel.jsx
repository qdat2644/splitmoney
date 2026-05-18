import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X, Wand2, ChevronDown, ChevronUp } from 'lucide-react';
import PlanParticipantsInput from './PlanParticipantsInput';
import { useApp } from '../../context/AppContext';

export default function AIPlanGeneratorPanel({ onGenerate, onClose }) {
  const { currentUser } = useApp();
  const [mode, setMode] = useState('quick');
  const [prompt, setPrompt] = useState('');
  const [advanced, setAdvanced] = useState({
    destination: '', days: '', budget: '', style: '', transport: '', preferences: ''
  });
  const [participants, setParticipants] = useState(currentUser ? [{ name: currentUser.name, type: 'user', id: currentUser.userId || currentUser.id }] : []);
  const [peopleCountInput, setPeopleCountInput] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const peopleCount = Number(peopleCountInput) || Math.max(participants.length, 1);
      await onGenerate({ mode, prompt, ...advanced, participants, peopleCount });
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
      className="glass-card p-5 mb-6 border border-purple-500/30 shadow-[0_0_15px_rgba(168,85,247,0.15)] relative overflow-hidden"
    >
      <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl" />
      
      <div className="flex items-center justify-between mb-4 relative z-10">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-purple-400" />
          Tạo kế hoạch với AI
        </h2>
        <button onClick={onClose} className="btn-icon text-gray-400 hover:text-white">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-4 relative z-10">
        <div>
          <label className="text-xs text-gray-400 mb-1.5 block">Nêu ý tưởng của bạn</label>
          <textarea
            className="w-full bg-dark-800/50 border border-white/10 rounded-xl px-3 py-3 text-sm text-white focus:outline-none focus:border-purple-500/50 resize-none min-h-[80px]"
            placeholder="VD: Đi Đà Lạt 3 ngày 2 đêm, 4 người, chill style, đi xe khách, budget 8 triệu..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
          />
        </div>

        <div>
          <button 
            type="button" 
            onClick={() => setMode(mode === 'quick' ? 'advanced' : 'quick')}
            className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1 font-medium"
          >
            {mode === 'quick' ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
            Cài đặt nâng cao
          </button>
        </div>

        <AnimatePresence>
          {mode === 'advanced' && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="space-y-3 pt-2 pb-1">
                <PlanParticipantsInput value={participants} onChange={setParticipants} showRoomMembers={true} />
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] text-gray-400 mb-1 block">Số người (nếu khác danh sách)</label>
                    <input type="number" className="input-field py-1.5" value={peopleCountInput} onChange={e => setPeopleCountInput(e.target.value)} placeholder={participants.length.toString()} />
                  </div>
                  <div>
                    <label className="text-[11px] text-gray-400 mb-1 block">Ngân sách tổng</label>
                    <input type="number" className="input-field py-1.5" value={advanced.budget} onChange={e => setAdvanced({...advanced, budget: e.target.value})} />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] text-gray-400 mb-1 block">Điểm đến</label>
                    <input className="input-field py-1.5" value={advanced.destination} onChange={e => setAdvanced({...advanced, destination: e.target.value})} />
                  </div>
                  <div>
                    <label className="text-[11px] text-gray-400 mb-1 block">Số ngày</label>
                    <input type="number" className="input-field py-1.5" value={advanced.days} onChange={e => setAdvanced({...advanced, days: e.target.value})} />
                  </div>
                  <div>
                    <label className="text-[11px] text-gray-400 mb-1 block">Phương tiện</label>
                    <input className="input-field py-1.5" value={advanced.transport} onChange={e => setAdvanced({...advanced, transport: e.target.value})} />
                  </div>
                  <div>
                    <label className="text-[11px] text-gray-400 mb-1 block">Phong cách</label>
                    <input className="input-field py-1.5" value={advanced.style} onChange={e => setAdvanced({...advanced, style: e.target.value})} />
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <button 
          onClick={handleSubmit} 
          disabled={loading || (!prompt && mode === 'quick')}
          className="w-full bg-gradient-to-r from-purple-500 to-blue-500 text-white font-medium py-2.5 rounded-xl flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-50 transition-all shadow-[0_0_15px_rgba(168,85,247,0.3)] border-none"
        >
          {loading ? (
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <><Wand2 className="w-4 h-4" /> Tạo kế hoạch</>
          )}
        </button>
      </div>
    </motion.div>
  );
}
