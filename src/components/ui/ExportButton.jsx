// ExportButton.jsx — Reusable export trigger with format selection, loading and feedback
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, FileText, FileJson, Check, AlertCircle, Loader2, ChevronDown } from 'lucide-react';
import { useToast } from '../../hooks/useToast';

/**
 * Props:
 *   label      — button label text
 *   onExport   — async (format: 'csv'|'json') => void
 *               Must resolve with raw string (csv) or object (json). 
 *               Caller handles the fetch; this component handles UX.
 *   filename   — base filename without extension (e.g. "personal_data")
 *   variant    — 'primary' | 'secondary' (default secondary)
 */
export default function ExportButton({ label = 'Xuất dữ liệu', onExport, filename = 'export', variant = 'secondary' }) {
  const { toast } = useToast();
  const [open, setOpen]       = useState(false);
  const [loading, setLoading] = useState(false);
  const [status, setStatus]   = useState(null); // 'success' | 'error' | null
  const [errMsg, setErrMsg]   = useState('');

  const trigger = async (format) => {
    setOpen(false);
    setLoading(true);
    setStatus(null);
    try {
      const data = await onExport(format);

      // Build file content
      let content, mime, ext;
      if (format === 'csv') {
        content = typeof data === 'string' ? data : JSON.stringify(data);
        mime = 'text/csv;charset=utf-8;';
        ext  = 'csv';
      } else {
        content = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
        mime = 'application/json';
        ext  = 'json';
      }

      // Trigger download
      const blob = new Blob([content], { type: mime });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      const ts   = new Date().toISOString().slice(0, 10);
      a.href     = url;
      a.download = `${filename}_${ts}.${ext}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setStatus('success');
      toast.success('Đã xuất dữ liệu');
      setTimeout(() => setStatus(null), 3000);
    } catch (err) {
      setErrMsg(err.message || 'Xuất dữ liệu thất bại');
      setStatus('error');
      toast.error(err.message || 'Xuất dữ liệu thất bại');
      setTimeout(() => setStatus(null), 5000);
    } finally {
      setLoading(false);
    }
  };

  const baseClass = variant === 'primary'
    ? 'btn-primary flex items-center gap-2 text-sm relative'
    : 'btn-secondary flex items-center gap-2 text-sm relative';

  return (
    <div className="relative inline-flex">
      {/* Main button */}
      <button
        type="button"
        onClick={() => !loading && setOpen(o => !o)}
        disabled={loading}
        className={`${baseClass} pr-8`}
      >
        {loading
          ? <Loader2 className="w-4 h-4 animate-spin" />
          : status === 'success'
          ? <Check className="w-4 h-4 text-emerald-400" />
          : status === 'error'
          ? <AlertCircle className="w-4 h-4 text-red-400" />
          : <Download className="w-4 h-4" />}
        <span className={status === 'success' ? 'text-emerald-400' : status === 'error' ? 'text-red-400' : ''}>
          {loading ? 'Đang xuất...' : status === 'success' ? 'Đã tải xuống!' : status === 'error' ? 'Thất bại' : label}
        </span>
        <ChevronDown className={`w-3.5 h-3.5 absolute right-2 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {/* Format dropdown */}
      <AnimatePresence>
        {open && !loading && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.97 }}
            transition={{ duration: 0.12 }}
            className="absolute top-full right-0 mt-1.5 z-50 glass-card border border-white/10 overflow-hidden min-w-[140px] shadow-xl"
          >
            <button
              onClick={() => trigger('csv')}
              className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-gray-300 hover:text-white hover:bg-white/5 transition-colors text-left"
            >
              <FileText className="w-4 h-4 text-green-400" />
              CSV (Excel)
            </button>
            <button
              onClick={() => trigger('json')}
              className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-gray-300 hover:text-white hover:bg-white/5 transition-colors text-left"
            >
              <FileJson className="w-4 h-4 text-blue-400" />
              JSON
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error toast */}
      <AnimatePresence>
        {status === 'error' && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="absolute top-full left-0 mt-1.5 z-50 bg-red-950/90 border border-red-500/30 text-red-300 text-xs px-3 py-2 rounded-lg shadow-lg w-60"
          >
            {errMsg}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
