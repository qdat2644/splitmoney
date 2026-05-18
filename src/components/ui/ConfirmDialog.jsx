import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, X } from 'lucide-react';

export default function ConfirmDialog({ dialog, onCancel, onConfirm }) {
  return (
    <AnimatePresence>
      {dialog && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 20 }}
            className="glass-card w-full max-w-sm border border-white/10 p-5"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 rounded-lg bg-red-500/15 p-2">
                  <AlertTriangle className="h-4 w-4 text-red-400" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-white">{dialog.title}</h2>
                  {dialog.message && <p className="mt-1 text-sm text-gray-400">{dialog.message}</p>}
                </div>
              </div>
              <button onClick={onCancel} className="btn-icon text-gray-400 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-5 flex gap-3">
              <button onClick={onCancel} className="btn-secondary flex-1">{dialog.cancelLabel}</button>
              <button onClick={onConfirm} className="btn-danger flex-1">{dialog.confirmLabel}</button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
