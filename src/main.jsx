// main.jsx — Entry point
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css'
import { AuthProvider } from './context/AuthContext.jsx'
import { AppProvider } from './context/AppContext.jsx';
import { ToastProvider } from './hooks/useToast.jsx';
import { ConfirmProvider } from './hooks/useConfirm.jsx';

// Force clear local storage to apply new mock data
if (!localStorage.getItem('data_seeded_v3')) {
  localStorage.clear();
  localStorage.setItem('data_seeded_v3', 'true');
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <ToastProvider>
        <ConfirmProvider>
          <AppProvider>
            <App />
          </AppProvider>
        </ConfirmProvider>
      </ToastProvider>
    </AuthProvider>
  </React.StrictMode>
);
