import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

export function ModalLayout({ open, onClose, children, size = 'md' }) {
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    if (open) document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  const sizes = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-3xl',
    full: 'max-w-full m-4',
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 16 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className={`relative w-full ${sizes[size]} glass-card bg-dark-800/95 z-10 flex flex-col max-h-[90vh] overflow-hidden rounded-2xl`}
          >
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

export function ModalHeader({ title, subtitle, icon: Icon, onClose }) {
  return (
    <div className="flex items-start justify-between px-6 pt-6 pb-4 border-b border-white/5 shrink-0">
      <div className="flex items-center gap-3">
        {Icon && (
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0 border border-blue-500/20">
            <Icon className="w-5 h-5 text-blue-400" />
          </div>
        )}
        <div>
          <h2 className="text-xl font-bold text-white">{title}</h2>
          {subtitle && <p className="text-sm text-gray-400 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {onClose && (
        <button onClick={onClose} className="btn-icon rounded-full w-8 h-8 flex items-center justify-center shrink-0 mt-1" aria-label="Đóng">
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

export function ModalBody({ children, className = '', noPadding = false }) {
  return (
    <div className={`overflow-y-auto custom-scrollbar flex-1 ${noPadding ? '' : 'px-6 py-5'} ${className}`}>
      {children}
    </div>
  );
}

export function ModalFooter({ children, className = '' }) {
  return (
    <div className={`px-6 py-4 border-t border-white/5 bg-dark-900/50 shrink-0 flex flex-col-reverse sm:flex-row sm:justify-end gap-3 ${className}`}>
      {children}
    </div>
  );
}
