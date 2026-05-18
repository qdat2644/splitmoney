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
        `relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors
        ${isActive ? 'text-white' : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'}`
      }
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <motion.div
              layoutId={`sidebar-active-${mode}`}
              className="absolute inset-0 rounded-lg border border-blue-500/20 bg-blue-500/10"
              transition={{ type: 'spring', stiffness: 380, damping: 30 }}
            />
          )}
          <item.icon className={`relative z-10 h-4.5 w-4.5 ${isActive ? 'text-blue-400' : 'text-gray-500'}`} size={18} />
          <span className="relative z-10">{item.label}</span>
        </>
      )}
    </NavLink>
  );
}

function NavSection({ title, items, onClose, mode }) {
  if (items.length === 0) return null;
  return (
    <section className="space-y-1">
      <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-600">{title}</p>
      {items.map((item) => <NavItem key={item.to} item={item} onClick={onClose} mode={mode} />)}
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
      title: 'Personal',
      items: [
        { to: '/', icon: House, label: 'Home', exact: true },
        { to: '/insights', icon: Sparkles, label: 'Insights' },
        { to: '/budget', icon: PiggyBank, label: 'Budgets' },
        { to: '/plans', icon: Map, label: 'Plans' },
      ],
    },
    {
      title: 'Group',
      items: [
        { to: '/rooms', icon: DoorOpen, label: 'Rooms' },
      ],
    },
    {
      title: 'AI',
      items: [
        { to: '/copilot', icon: Bot, label: 'AI Copilot' },
        { to: '/plans', icon: Map, label: 'Smart Planning' },
        { to: '/forecasts', icon: TrendingUp, label: 'Forecasts' },
      ],
    },
    {
      title: 'System',
      items: [
        { to: '/settings', icon: Settings, label: 'Settings' },
        ...(currentUser?.role === 'admin' ? [{ to: '/admin', icon: Shield, label: 'Admin' }] : []),
      ],
    },
  ];

  const roomSections = [
    {
      title: 'Workspace',
      items: [
        { to: `/rooms/${roomId}/dashboard`, icon: LayoutDashboard, label: 'Overview' },
        { to: `/rooms/${roomId}/expenses`, icon: Activity, label: 'Shared Activity' },
        { to: `/rooms/${roomId}/settlements`, icon: ArrowLeftRight, label: 'Settlements' },
      ],
    },
    {
      title: 'People',
      items: [
        { to: `/rooms/${roomId}/members`, icon: Users, label: 'Members' },
      ],
    },
    {
      title: 'Intelligence',
      items: [
        { to: `/rooms/${roomId}/analytics`, icon: BarChart3, label: 'Analytics' },
      ],
    },
  ];

  const sections = mode === 'global' ? globalSections : roomSections;

  const content = (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 border-b border-white/5 px-4 py-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-purple-600">
          <Wallet className="h-4 w-4 text-white" />
        </div>
        <div>
          <h1 className="text-sm font-bold text-white">SplitEasy</h1>
          <p className="text-[10px] text-gray-500">Financial OS</p>
        </div>
        <button className="btn-icon ml-auto lg:hidden" onClick={onClose}>
          <X className="h-4 w-4" />
        </button>
      </div>

      <nav className="flex-1 space-y-5 overflow-y-auto p-3">
        {sections.map((section) => (
          <NavSection key={section.title} title={section.title} items={section.items} onClose={onClose} mode={mode} />
        ))}
      </nav>

      {mode === 'room' && (
        <div className="border-t border-white/5 p-3">
          <div className="rounded-xl border border-white/5 bg-white/3 p-3">
            <p className="text-[10px] uppercase tracking-wider text-gray-500">Workspace pulse</p>
            <div className="mt-2 flex items-center justify-between text-sm">
              <span className="text-gray-400">{members.length} members</span>
              <span className="font-semibold text-white">{stats.totalCount} expenses</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <>
      <aside className="hidden h-screen w-60 shrink-0 border-r border-white/5 bg-dark-800/60 backdrop-blur-xl lg:flex lg:flex-col">
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
              className="fixed inset-0 z-40 bg-black/60"
              onClick={onClose}
            />
          )}
          {mobileOpen && (
            <motion.aside
              key="sidebar-aside"
              initial={{ x: -320 }}
              animate={{ x: 0 }}
              exit={{ x: -320 }}
              transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              className="fixed bottom-0 left-0 top-0 z-50 w-[min(19rem,86vw)] border-r border-white/5 bg-dark-800"
            >
              {content}
            </motion.aside>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}
