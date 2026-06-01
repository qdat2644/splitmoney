// main.jsx — Entry point
import React from 'react';
import ReactDOM from 'react-dom/client';
import * as Sentry from '@sentry/react';
import App from './App.jsx';
import './index.css'
import { AuthProvider } from './context/AuthContext.jsx'
import { AppProvider } from './context/AppContext.jsx';
import { ToastProvider } from './hooks/useToast.jsx';
import { ConfirmProvider } from './hooks/useConfirm.jsx';
import { initSentry } from './monitoring/sentry.js';

initSentry();

// Force clear local storage to apply new mock data
if (!localStorage.getItem('data_seeded_v3')) {
  localStorage.clear();
  localStorage.setItem('data_seeded_v3', 'true');
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Sentry.ErrorBoundary fallback={ErrorFallback}>
      <AuthProvider>
        <ToastProvider>
          <ConfirmProvider>
            <AppProvider>
              <App />
            </AppProvider>
          </ConfirmProvider>
        </ToastProvider>
      </AuthProvider>
    </Sentry.ErrorBoundary>
  </React.StrictMode>
);

function ErrorFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-dark-900 p-4 text-white">
      <div className="card w-full max-w-md p-8 text-center">
        <h1 className="mb-3 text-2xl font-bold">Đã có lỗi xảy ra</h1>
        <p className="mb-6 text-sm text-gray-300">
          Bạn có thể tải lại trang hoặc quay về tổng quan.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <button type="button" className="btn-primary" onClick={() => window.location.reload()}>
            Tải lại trang
          </button>
          <button type="button" className="btn-secondary" onClick={() => window.location.assign('/')}>
            Về tổng quan
          </button>
        </div>
      </div>
    </div>
  );
}
