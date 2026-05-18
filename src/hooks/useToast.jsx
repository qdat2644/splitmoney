import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';

const ToastContext = createContext(null);
let toastIdCounter = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timers = useRef({});

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
    if (timers.current[id]) {
      clearTimeout(timers.current[id]);
      delete timers.current[id];
    }
  }, []);

  const addToast = useCallback(({ message, type = 'info', duration = 3500 }) => {
    const id = ++toastIdCounter;
    setToasts((prev) => [...prev, { id, message, type }]);
    
    // Only set auto-dismiss if duration is > 0. Loading toasts often don't auto-dismiss.
    if (duration > 0) {
      timers.current[id] = setTimeout(() => removeToast(id), duration);
    }
    return id;
  }, [removeToast]);

  const toast = useMemo(() => ({
    success: (message, options) => addToast({ message, type: 'success', ...options }),
    error: (message, options) => addToast({ message, type: 'error', duration: 5000, ...options }),
    warning: (message, options) => addToast({ message, type: 'warning', ...options }),
    info: (message, options) => addToast({ message, type: 'info', ...options }),
    loading: (message, options) => addToast({ message, type: 'loading', duration: 0, ...options }), // No auto-dismiss by default
    dismiss: removeToast,
  }), [addToast, removeToast]);

  const value = useMemo(() => ({ toasts, toast, removeToast }), [toasts, toast, removeToast]);

  return <ToastContext.Provider value={value}>{children}</ToastContext.Provider>;
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within ToastProvider');
  return context;
}
