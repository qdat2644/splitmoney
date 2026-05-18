// Sidebar.jsx — Navigation sidebar
import { useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Receipt, Users, ArrowLeftRight,
  BarChart3, X, Wallet, Map, PiggyBank, DoorOpen
} from 'lucide-react';
import { useApp } from '../../context/AppContext';



function NavItem({ item, onClick, mode }) {
  return (
    <NavLink
      to={item.to}
      end={item.exact}
      onClick={onClick}
      className={({ isActive }) =>
        `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group relative
        ${isActive
          ? 'text-white'
          : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
        }`
      }
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <motion.div
              layoutId={`sidebar-active-${mode}`}
              className="absolute inset-0 rounded-xl"
              style={{ background: 'linear-gradient(135deg, rgba(59,130,246,0.2), rgba(139,92,246,0.15))' }}
              transition={{ type: 'spring', stiffness: 380, damping: 30 }}
            />
          )}
          <item.icon className={`w-4.5 h-4.5 relative z-10 transition-colors ${isActive ? 'text-blue-400' : 'text-gray-500 group-hover:text-gray-300'}`} size={18} />
          <span className="relative z-10">{item.label}</span>
          {isActive && (
            <div className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-400 relative z-10" />
          )}
        </>
      )}
    </NavLink>
  );
}

export default function Sidebar({ mobileOpen, onClose, mode = 'room' }) {
  const { stats, members, currentRoom } = useApp();
  const roomId = currentRoom?.roomId || 'local';
  const location = useLocation();

  // Close sidebar on Escape key
  useEffect(() => {
    if (!mobileOpen) return;
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [mobileOpen, onClose]);

  // Close sidebar on route change (safety net)
  useEffect(() => {
    if (mobileOpen) onClose();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  const ROOM_NAV_ITEMS = [
    { to: `/rooms/${roomId}/dashboard`, icon: LayoutDashboard, label: 'Dashboard' },
    { to: `/rooms/${roomId}/expenses`, icon: Receipt, label: 'Khoản chi' },
    { to: `/rooms/${roomId}/members`, icon: Users, label: 'Thành viên' },
    { to: `/rooms/${roomId}/settlements`, icon: ArrowLeftRight, label: 'Công nợ' },
    { to: `/rooms/${roomId}/analytics`, icon: BarChart3, label: 'Thống kê' },
  ];

  const GLOBAL_NAV_ITEMS = [
    { to: '/', icon: LayoutDashboard, label: 'Dashboard', exact: true },
    { to: '/rooms', icon: DoorOpen, label: 'Phòng' },
    { to: '/plans', icon: Map, label: 'Kế hoạch' },
    { to: '/budget', icon: PiggyBank, label: 'Ngân sách' },
  ];

  const NAV_ITEMS = mode === 'global' ? GLOBAL_NAV_ITEMS : ROOM_NAV_ITEMS;

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-white/5">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-glow-blue">
          <Wallet className="w-4 h-4 text-white" />
        </div>
        <div>
          <h1 className="text-sm font-bold text-white">SplitEasy</h1>
          <p className="text-[10px] text-gray-500">Chia tiền nhóm</p>
        </div>
        <button className="ml-auto lg:hidden btn-icon" onClick={onClose}>
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-0.5">
        {NAV_ITEMS.map((item) => (
          <NavItem key={item.to} item={item} onClick={onClose} mode={mode} />
        ))}
      </nav>

      {/* Group summary (Only show in room mode) */}
      {mode === 'room' && (
        <div className="p-3 border-t border-white/5">
          <div className="glass-card p-3 rounded-xl">
            <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">Nhóm của bạn</p>
            <div className="flex items-baseline gap-1 mb-1">
              <span className="text-xl font-bold text-white">{members.length}</span>
              <span className="text-xs text-gray-500">thành viên</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-bold gradient-text">{stats.totalCount}</span>
              <span className="text-xs text-gray-500">khoản chi</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-56 h-screen bg-dark-800/60 border-r border-white/5 backdrop-blur-xl sticky top-0 shrink-0">
        <SidebarContent />
      </aside>

      {/* Mobile drawer — pointer-events-none wrapper prevents ghost elements from blocking clicks */}
      <div className={`lg:hidden ${mobileOpen ? '' : 'pointer-events-none'}`}>
        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              key="sidebar-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 z-40"
              onClick={onClose}
            />
          )}
          {mobileOpen && (
            <motion.aside
              key="sidebar-aside"
              initial={{ x: -260 }}
              animate={{ x: 0 }}
              exit={{ x: -260 }}
              transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              className="fixed left-0 top-0 bottom-0 w-56 z-50 bg-dark-800 border-r border-white/5"
            >
              <SidebarContent />
            </motion.aside>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}
