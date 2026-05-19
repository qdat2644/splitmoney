import { useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity, ArrowLeftRight, BarChart3, Bot, DoorOpen, House,
  LayoutDashboard, Map, PiggyBank, Receipt, Settings, Sparkles,
  TrendingUp, Users, Wallet, X, Shield,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

function NavItem({ item, onClick, mode }) {
  return (
    <NavLink
      to={item.to}
      end={item.exact}
      onClick={onClick}
      className={({ isActive }) =>
        `relative flex items-center gap-2.5 rounded-md px-3 py-2 text-xs font-medium transition-colors
        ${isActive ? 'text-white' : 'text-gray-400 hover:text-gray-200 hover:bg-white/[0.02]'}`
      }
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <motion.div
              layoutId={`sidebar-active-${mode}`}
              className="absolute inset-0 rounded-md bg-white/[0.04] border border-white/[0.02]"
              transition={{ type: 'spring', stiffness: 380, damping: 30 }}
            />
          )}
          <item.icon className={`relative z-10 h-4 w-4 ${isActive ? 'text-gray-200' : 'text-gray-500'}`} size={16} />
          <span className="relative z-10">{item.label}</span>
        </>
      )}
    </NavLink>
  );
}

function NavSection({ title, items, onClose, mode }) {
  if (items.length === 0) return null;
  return (
    <section className="space-y-0.5">
      <p className="px-3 pb-1.5 text-[11px] font-medium text-gray-500/90">{title}</p>
      <div className="space-y-0.5">
        {items.map((item) => <NavItem key={item.to} item={item} onClick={onClose} mode={mode} />)}
      </div>
    </section>
  );
}

export default function Sidebar({ mobileOpen, onClose, mode = 'room' }) {
  const { stats, members, currentRoom, currentUser } = useApp();
  const roomId = currentRoom?.roomId || 'local';
  const location = useLocation();

  useEffect(() => {
    if (!mobileOpen) return;
    const handler = (event) => { if (event.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [mobileOpen, onClose]);

  useEffect(() => {
    if (mobileOpen) onClose();
  }, [location.pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  const globalSections = [
    {
      title: 'Cá nhân',
      items: [
        { to: '/', icon: House, label: 'Tổng quan', exact: true },
        { to: '/insights', icon: Sparkles, label: 'Phân tích' },
        { to: '/budget', icon: PiggyBank, label: 'Ngân sách' },
        { to: '/plans', icon: Map, label: 'Kế hoạch' },
      ],
    },
    {
      title: 'Nhóm',
      items: [
        { to: '/rooms', icon: DoorOpen, label: 'Phòng' },
      ],
    },
    {
      title: 'AI',
      items: [
        { to: '/copilot', icon: Bot, label: 'Trợ lý AI' },
        { to: '/plans', icon: Map, label: 'Lập kế hoạch' },
        { to: '/forecasts', icon: TrendingUp, label: 'Dự báo' },
      ],
    },
    {
      title: 'Hệ thống',
      items: [
        { to: '/settings', icon: Settings, label: 'Cài đặt' },
        ...(currentUser?.role === 'admin'
          ? [{ to: '/admin', icon: Shield, label: 'Quản trị', exact: false }]
          : []),
      ],
    },
  ];

  const roomSections = [
    {
      title: 'Nhóm',
      items: [
        { to: `/rooms/${roomId}/dashboard`, icon: LayoutDashboard, label: 'Tổng quan' },
        { to: `/rooms/${roomId}/expenses`, icon: Activity, label: 'Hoạt động' },
        { to: `/rooms/${roomId}/settlements`, icon: ArrowLeftRight, label: 'Thanh toán' },
      ],
    },
    {
      title: 'Thành viên',
      items: [
        { to: `/rooms/${roomId}/members`, icon: Users, label: 'Danh sách' },
      ],
    },
    {
      title: 'Phân tích',
      items: [
        { to: `/rooms/${roomId}/analytics`, icon: BarChart3, label: 'Báo cáo' },
      ],
    },
  ];

  const sections = mode === 'global' ? globalSections : roomSections;

  const content = (
    <div className="flex h-full flex-col bg-dark-950 border-r border-white/5">
      {/* Brand Header */}
      <div className="flex h-12 items-center gap-2.5 border-b border-white/5 px-4">
        <div className="flex h-6.5 w-6.5 items-center justify-center rounded bg-zinc-800 border border-white/10 shadow-sm">
          <Wallet className="h-3.5 w-3.5 text-gray-200" />
        </div>
        <div>
          <h1 className="text-xs font-semibold tracking-tight text-white">Zyra</h1>
          <p className="text-[10px] font-medium text-gray-500/80">Không gian tài chính</p>
        </div>
        <button className="btn-icon ml-auto lg:hidden" onClick={onClose}>
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Navigation section */}
      <nav className="flex-1 space-y-4 overflow-y-auto p-4 custom-scrollbar">
        {sections.map((section) => (
          <NavSection key={section.title} title={section.title} items={section.items} onClose={onClose} mode={mode} />
        ))}
      </nav>

      {/* Workspace Pulse Footer */}
      {mode === 'room' && (
        <div className="p-4 border-t border-white/5">
          <div className="rounded-lg border border-white/5 bg-dark-900/40 p-3">
            <p className="text-[11px] font-medium text-gray-500/80">Tổng quan nhóm</p>
            <div className="mt-2 flex items-center justify-between text-xs">
              <span className="font-medium text-gray-400">{members.length} thành viên</span>
              <span className="font-semibold text-gray-200">{stats.totalCount} chi phí</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <>
      <aside className="hidden h-screen w-56 shrink-0 lg:flex lg:flex-col">
        {content}
      </aside>
      <div className={`lg:hidden ${mobileOpen ? '' : 'pointer-events-none'}`}>
        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              key="sidebar-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
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
              className="fixed bottom-0 left-0 top-0 z-50 w-56 bg-dark-950"
            >
              {content}
            </motion.aside>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}
