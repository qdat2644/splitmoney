// Toast.jsx — Toast notification system
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle, XCircle, Info, AlertTriangle, X, Loader2 } from 'lucide-react';
import { useToast } from '../../hooks/useToast';

const ICONS = {
  success: <CheckCircle className="w-4 h-4 text-emerald-400" />,
  error: <XCircle className="w-4 h-4 text-red-400" />,
  info: <Info className="w-4 h-4 text-blue-400" />,
  warning: <AlertTriangle className="w-4 h-4 text-yellow-400" />,
  loading: <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />,
};

const STYLES = {
  success: 'border-emerald-500/20 bg-emerald-500/5',
  error: 'border-red-500/20 bg-red-500/5 text-red-100',
  info: 'border-blue-500/20 bg-blue-500/5',
  warning: 'border-yellow-500/20 bg-yellow-500/5',
  loading: 'border-blue-500/20 bg-blue-500/10',
};

function ToastItem({ toast, onRemove }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 60, scale: 0.9 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 60, scale: 0.9 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      className={`
        flex items-center gap-3 px-4 py-3 rounded-xl border backdrop-blur-xl
        glass-card w-[min(360px,calc(100vw-2rem))] cursor-pointer
        ${STYLES[toast.type] ?? STYLES.info}
      `}
      onClick={() => onRemove(toast.id)}
    >
      {ICONS[toast.type]}
      <p className="text-sm text-gray-200 flex-1">{toast.message}</p>
      <button className="text-gray-500 hover:text-gray-300 transition-colors ml-1">
        <X className="w-3.5 h-3.5" />
      </button>
    </motion.div>
  );
}

export default function ToastContainer() {
  const { toasts, removeToast } = useToast();

  return (
    <div className="toast-container pointer-events-none">
      <AnimatePresence mode="popLayout">
        {toasts.map((t) => (
          <div key={t.id} className="pointer-events-auto">
            <ToastItem toast={t} onRemove={removeToast} />
          </div>
        ))}
      </AnimatePresence>
    </div>
  );
}
