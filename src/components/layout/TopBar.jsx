import { Menu, Wallet, Sun, Moon } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useNavigate } from 'react-router-dom';
import UserMenu from '../ui/UserMenu';

export default function TopBar({ onMenuClick, title, children }) {
  const { theme, toggleTheme } = useApp();
  const navigate = useNavigate();

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
      {title && (
        <span className="hidden sm:inline font-semibold text-white bg-white/10 px-3 py-1 rounded-full text-xs ml-2">
          {title}
        </span>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Contextual children (Action buttons like Export, Add) */}
      {children}

      {/* Theme Toggle */}
      <button onClick={toggleTheme} className="btn-icon ml-1" title="Đổi theme">
        {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
      </button>

      {/* Global User Menu */}
      <UserMenu />
    </header>
  );
}
