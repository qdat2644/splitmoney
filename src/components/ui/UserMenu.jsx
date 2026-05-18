import { useState, useRef, useEffect } from 'react';
import { LogOut, Lock, User, LayoutDashboard } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Avatar from './Avatar';
import ChangePasswordModal from './ChangePasswordModal';

export default function UserMenu() {
  const { currentUser } = useApp();
  const { logout } = useAuth();
  const navigate = useNavigate();

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [changePwOpen, setChangePwOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    if (dropdownOpen) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [dropdownOpen]);

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') setDropdownOpen(false); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  const handleLogout = () => {
    setDropdownOpen(false);
    logout();
  };

  const handleChangePassword = () => {
    setDropdownOpen(false);
    setChangePwOpen(true);
  };

  const menuItems = [
    {
      icon: LayoutDashboard,
      label: 'Personal Dashboard',
      onClick: () => { setDropdownOpen(false); navigate('/'); },
    },
    {
      icon: User,
      label: 'Tài khoản',
      sublabel: currentUser?.email,
      onClick: () => { setDropdownOpen(false); },
      disabled: true,
    },
    {
      icon: Lock,
      label: 'Đổi mật khẩu',
      onClick: handleChangePassword,
    },
    {
      icon: LogOut,
      label: 'Đăng xuất',
      onClick: handleLogout,
      danger: true,
    },
  ];

  if (!currentUser) return null;

  return (
    <>
      <div className="relative ml-1" ref={dropdownRef}>
        <button
          onClick={() => setDropdownOpen(v => !v)}
          className="flex items-center gap-2 pl-2 border-l border-white/10 hover:opacity-80 transition-opacity"
          aria-label="User menu"
        >
          <Avatar member={{ ...currentUser, colorIndex: 0 }} size="xs" />
          <span className="text-xs font-medium hidden sm:inline text-gray-300">{currentUser.name}</span>
        </button>

        <AnimatePresence>
          {dropdownOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -8 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 top-full mt-2 w-56 glass-card border border-white/10 shadow-2xl rounded-xl overflow-hidden z-50"
            >
              <div className="px-4 py-3 border-b border-white/5">
                <p className="text-sm font-semibold text-white truncate">{currentUser.name}</p>
                <p className="text-xs text-gray-500 truncate">{currentUser.email}</p>
              </div>

              <div className="py-1">
                {menuItems.map((item, i) => (
                  <button
                    key={i}
                    onClick={item.onClick}
                    disabled={item.disabled}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors
                      ${item.danger
                        ? 'text-red-400 hover:bg-red-500/10'
                        : item.disabled
                        ? 'text-gray-600 cursor-not-allowed'
                        : 'text-gray-200 hover:bg-white/5'
                      }`}
                  >
                    <item.icon className={`w-4 h-4 shrink-0 ${item.danger ? 'text-red-400' : item.disabled ? 'text-gray-600' : 'text-gray-400'}`} />
                    <span className="flex-1 text-left">{item.label}</span>
                    {item.sublabel && item.disabled && (
                      <span className="text-[10px] bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded-full">
                        {item.sublabel === currentUser?.email ? '' : item.sublabel}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <ChangePasswordModal open={changePwOpen} onClose={() => setChangePwOpen(false)} />
    </>
  );
}
