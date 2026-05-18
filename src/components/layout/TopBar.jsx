import { Menu, Wallet, Sun, Moon, Bot } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useLocation, useNavigate } from 'react-router-dom';
import UserMenu from '../ui/UserMenu';

export default function TopBar({ onMenuClick, title, children }) {
  const { theme, toggleTheme } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const section = location.pathname.startsWith('/rooms/')
    ? 'Nhóm'
    : location.pathname.startsWith('/copilot') || location.pathname.startsWith('/forecasts') || location.pathname.startsWith('/insights')
      ? 'AI'
      : 'Cá nhân';

  return (
    <header className="sticky top-0 z-30 flex h-12 items-center gap-3.5 border-b border-white/5 bg-dark-950 px-4 sm:px-6">
      {/* Mobile menu trigger */}
      {onMenuClick && (
        <button onClick={onMenuClick} className="btn-icon lg:hidden p-1" aria-label="Menu">
          <Menu className="w-4 h-4 text-gray-400" />
        </button>
      )}

      {/* Brand logo (Mobile only, hidden on Desktop since sidebar shows it) */}
      <div 
        className={`flex items-center gap-2 cursor-pointer ${onMenuClick ? 'lg:hidden' : ''}`}
        onClick={() => navigate('/')}
      >
        <div className="w-5.5 h-5.5 rounded bg-zinc-800 border border-white/10 flex items-center justify-center">
          <Wallet className="w-3 h-3 text-gray-300" />
        </div>
        <span className="text-xs font-semibold tracking-tight text-white">Zyra</span>
      </div>

      {/* Page Context (Desktop/Tablet) */}
      <div className="hidden min-w-0 sm:flex sm:items-center sm:gap-2">
        <span className="text-[11px] font-medium text-gray-500">{section}</span>
        {title && (
          <>
            <span className="text-gray-600 text-xs">/</span>
            <span className="truncate text-xs font-medium text-white">{title}</span>
          </>
        )}
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Action group */}
      <div className="flex items-center gap-2.5">
        {/* Contextual actions passed as children */}
        {children}

        {/* Copilot button */}
        <button 
          onClick={() => navigate('/copilot')} 
          className="btn-secondary h-8 px-2.5 text-xs flex items-center gap-1.5 font-medium border border-white/5 bg-white/[0.01]" 
          title="Trợ lý AI"
        >
          <Bot className="h-3.5 w-3.5 text-purple-400" />
          <span>Trợ lý AI</span>
        </button>

        {/* Theme Toggle */}
        <button 
          onClick={toggleTheme} 
          className="btn-icon h-8 w-8 text-gray-400 border border-transparent" 
          title="Đổi giao diện"
        >
          {theme === 'dark' ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
        </button>

        {/* Global User Menu */}
        <div className="pl-1 border-l border-white/5 h-5 flex items-center">
          <UserMenu />
        </div>
      </div>
    </header>
  );
}
