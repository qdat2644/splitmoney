import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopBar from './TopBar';

export default function AppShell({ children, topBarTitle, topBarActions, mode = 'global' }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen">
      <Sidebar
        mobileOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
        mode={mode}
      />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar
          onMenuClick={() => setMobileOpen(true)}
          title={topBarTitle}
        >
          {topBarActions}
        </TopBar>
        <main className="flex-1 overflow-auto p-4 pb-20 sm:p-6 sm:pb-8">
          {children}
        </main>
      </div>
    </div>
  );
}
