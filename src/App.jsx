import { useState, useEffect, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useParams, Link, useLocation, useNavigate } from 'react-router-dom';

import AppShell from './components/layout/AppShell';
import RoomTopBarActions from './components/layout/RoomTopBarActions';
import Dashboard from './pages/Dashboard';
import Expenses from './pages/Expenses';
import Members from './pages/Members';
import Settlements from './pages/Settlements';
import Analytics from './pages/Analytics';
import AddExpenseModal from './components/expenses/AddExpenseModal';
import AuthScreen from './pages/AuthScreen';
import RoomList from './pages/rooms/RoomList';
import PersonalDashboard from './pages/PersonalDashboard';
import { useApp } from './context/AppContext';
import { useAuth } from './context/AuthContext';
import ToastContainer from './components/ui/Toast';

const PlansPage = lazy(() => import('./pages/PlansPage'));
const BudgetPage = lazy(() => import('./pages/BudgetPage'));
const AnalyticsPage = lazy(() => import('./pages/AnalyticsPage'));
const AICopilotPage = lazy(() => import('./pages/AICopilotPage'));
const ForecastsPage = lazy(() => import('./pages/ForecastsPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const AdminWorkspace = lazy(() => import('./pages/admin/AdminWorkspace'));
const ResetPassword = lazy(() => import('./pages/auth/ResetPassword'));

function PageFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-dark-900">
      <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-500" />
    </div>
  );
}

function RoomGuard({ children }) {
  const { roomId } = useParams();
  const { rooms, currentRoom, setCurrentRoom, loadingRooms } = useApp();

  useEffect(() => {
    if (!loadingRooms && roomId) {
      if (roomId === 'local') {
        setCurrentRoom({
          id: 'local',
          roomId: 'local',
          role: 'owner',
          status: 'approved',
          room: { name: 'Dữ liệu cũ (Local)', code: 'OFFLINE' },
        });
        return;
      }

      const membership = rooms.find((item) => item.roomId === roomId);
      if (membership) {
        if (!currentRoom || currentRoom.roomId !== roomId) {
          setCurrentRoom(membership);
        }
      } else {
        setCurrentRoom(null);
      }
    }
  }, [roomId, rooms, currentRoom, setCurrentRoom, loadingRooms]);

  if (loadingRooms) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-dark-900">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-500" />
      </div>
    );
  }

  if (!currentRoom || currentRoom.roomId !== roomId) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-dark-900 text-white">
        <h2 className="mb-4 text-xl font-bold">Phòng không tồn tại hoặc bạn chưa tham gia</h2>
        <Link to="/rooms" className="text-blue-400 hover:underline">Về danh sách phòng</Link>
      </div>
    );
  }

  if (currentRoom.status === 'pending') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-dark-900 text-white">
        <h2 className="mb-4 text-xl font-bold text-yellow-400">Bạn đang chờ được duyệt vào phòng này</h2>
        <Link to="/rooms" className="text-blue-400 hover:underline">Về danh sách phòng</Link>
      </div>
    );
  }

  return children;
}

function AdminGuard({ children }) {
  const { user } = useAuth();
  return user?.role === 'admin' ? children : <Navigate to="/" replace />;
}

function getRoomIdFromPath(pathname) {
  return pathname.match(/^\/rooms\/([^/]+)/)?.[1] ?? null;
}

function getTopBarTitle(pathname, currentRoom, roomShellActive) {
  if (roomShellActive) return currentRoom?.room?.name || 'Phòng';
  if (pathname === '/' || pathname === '') return 'Tổng quan';
  if (pathname.startsWith('/analytics') || pathname.startsWith('/insights')) return 'Phân tích';
  if (pathname.startsWith('/rooms')) return 'Phòng';
  if (pathname.startsWith('/plans')) return 'Kế hoạch';
  if (pathname.startsWith('/budget')) return 'Ngân sách';
  if (pathname.startsWith('/copilot')) return 'Trợ lý AI';
  if (pathname.startsWith('/forecasts')) return 'Dự báo';
  if (pathname.startsWith('/settings')) return 'Cài đặt';
  if (pathname.startsWith('/admin')) return 'Quản trị';
  return 'Tổng quan';
}

function RoomRoutes({ onAddExpense, onEditExpense }) {
  const { loadingRoom } = useApp();

  if (loadingRoom) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-dark-900">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-500" />
      </div>
    );
  }

  return (
    <Routes>
      <Route path="dashboard" element={<Dashboard onAddExpense={onAddExpense} onEditExpense={onEditExpense} />} />
      <Route path="expenses" element={<Expenses onAddExpense={onAddExpense} onEditExpense={onEditExpense} />} />
      <Route path="members" element={<Members />} />
      <Route path="settlements" element={<Settlements onAddExpense={onAddExpense} />} />
      <Route path="analytics" element={<Analytics />} />
      <Route path="*" element={<Navigate to="dashboard" replace />} />
    </Routes>
  );
}

function AuthenticatedApp() {
  const { currentRoom, loadingRoom } = useApp();
  const location = useLocation();
  const navigate = useNavigate();
  const [expenseModal, setExpenseModal] = useState({ open: false, editData: null });
  const roomIdFromPath = getRoomIdFromPath(location.pathname);
  const roomShellActive = Boolean(
    roomIdFromPath &&
    currentRoom?.roomId === roomIdFromPath &&
    currentRoom?.status !== 'pending'
  );

  const openAddExpense = () => setExpenseModal({ open: true, editData: null });
  const openEditExpense = (expense) => setExpenseModal({ open: true, editData: expense });
  const closeExpenseModal = () => setExpenseModal({ open: false, editData: null });

  useEffect(() => {
    if (!roomShellActive && expenseModal.open) {
      closeExpenseModal();
    }
  }, [expenseModal.open, roomShellActive]);

  useEffect(() => {
    if (!roomShellActive || loadingRoom || !location.state?.openAddExpense) return;
    openAddExpense();
    navigate(location.pathname, { replace: true, state: {} });
  }, [loadingRoom, location.pathname, location.state, navigate, roomShellActive]);

  return (
    <AppShell
      mode={roomShellActive ? 'room' : 'global'}
      topBarTitle={getTopBarTitle(location.pathname, currentRoom, roomShellActive)}
      topBarActions={roomShellActive ? <RoomTopBarActions onAddExpense={openAddExpense} /> : null}
    >
      <Routes>
        <Route path="/" element={<PersonalDashboard />} />
        <Route path="/insights" element={<Navigate to="/analytics" replace />} />
        <Route path="/analytics" element={<Suspense fallback={<PageFallback />}><AnalyticsPage /></Suspense>} />
        <Route path="/rooms" element={<RoomList />} />
        <Route path="/plans" element={<Suspense fallback={<PageFallback />}><PlansPage /></Suspense>} />
        <Route path="/budget" element={<Suspense fallback={<PageFallback />}><BudgetPage /></Suspense>} />
        <Route path="/copilot" element={<Suspense fallback={<PageFallback />}><AICopilotPage /></Suspense>} />
        <Route path="/forecasts" element={<Suspense fallback={<PageFallback />}><ForecastsPage /></Suspense>} />
        <Route path="/settings" element={<Suspense fallback={<PageFallback />}><SettingsPage /></Suspense>} />
        <Route path="/admin/*" element={<AdminGuard><Suspense fallback={<PageFallback />}><AdminWorkspace /></Suspense></AdminGuard>} />
        <Route
          path="/rooms/:roomId/*"
          element={
            <RoomGuard>
              <RoomRoutes onAddExpense={openAddExpense} onEditExpense={openEditExpense} />
            </RoomGuard>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {roomShellActive && (
        <AddExpenseModal open={expenseModal.open} onClose={closeExpenseModal} editData={expenseModal.editData} />
      )}
    </AppShell>
  );
}

function AppContent() {
  const { user, loading } = useAuth();

  if (loading) return null;
  if (!user) {
    return (
      <Routes>
        <Route path="/reset-password" element={<Suspense fallback={<PageFallback />}><ResetPassword /></Suspense>} />
        <Route path="*" element={<AuthScreen />} />
      </Routes>
    );
  }

  return <AuthenticatedApp />;
}

export default function App() {
  return (
    <BrowserRouter>
      <AppContent />
      <ToastContainer />
    </BrowserRouter>
  );
}
