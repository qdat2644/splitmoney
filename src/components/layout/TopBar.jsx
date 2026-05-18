import { Menu, Wallet, Sun, Moon, Bot } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useLocation, useNavigate } from 'react-router-dom';
import UserMenu from '../ui/UserMenu';

export default function TopBar({ onMenuClick, title, children }) {
  const { theme, toggleTheme } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const section = location.pathname.startsWith('/rooms/')
    ? 'Group workspace'
    : location.pathname.startsWith('/copilot') || location.pathname.startsWith('/forecasts') || location.pathname.startsWith('/insights')
      ? 'AI'
      : 'Personal';

  return (
    <header className="sticky top-0 z-30 flex items-center h-14 px-4 gap-3 bg-dark-900/80 backdrop-blur-xl border-b border-white/5">
      {/* Mobile menu button (only visible if onMenuClick is provided) */}
      {onMenuClick && (
        <button onClick={onMenuClick} className="btn-icon lg:hidden" aria-label="Menu">
          <Menu className="w-5 h-5" />
        </button>
      )}

      {/* Brand / Logo (Always visible on mobile if no menu, otherwise handle layout) */}
      <div 
        className={`flex items-center gap-2 cursor-pointer ${onMenuClick ? 'lg:hidden' : ''}`}
        onClick={() => navigate('/')}
      >
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-glow-blue">
          <Wallet className="w-3.5 h-3.5 text-white" />
        </div>
        <span className="text-sm font-bold gradient-text">SplitEasy</span>
      </div>

      {/* Page Title Context (e.g. Room Name) */}
      <div className="hidden min-w-0 sm:block">
        <p className="text-[10px] uppercase tracking-[0.18em] text-gray-500">{section}</p>
        {title && <p className="truncate text-sm font-semibold text-white">{title}</p>}
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Contextual children (Action buttons like Export, Add) */}
      {children}

      <button onClick={() => navigate('/copilot')} className="btn-secondary hidden text-xs sm:flex" title="AI Copilot">
        <Bot className="h-4 w-4 text-purple-300" />
        Copilot
      </button>

      {/* Theme Toggle */}
      <button onClick={toggleTheme} className="btn-icon ml-1" title="Đổi theme">
        {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
      </button>

      {/* Global User Menu */}
      <UserMenu />
    </header>
  );
}
