import { useState, useEffect, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useParams, Link } from 'react-router-dom';

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
const AICopilotPage = lazy(() => import('./pages/AICopilotPage'));
const ForecastsPage = lazy(() => import('./pages/ForecastsPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));

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

function RoomRoutes() {
  const { loadingRoom, currentRoom } = useApp();
  const [expenseModal, setExpenseModal] = useState({ open: false, editData: null });

  if (loadingRoom) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-dark-900">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-500" />
      </div>
    );
  }

  const openAdd = () => setExpenseModal({ open: true, editData: null });
  const openEdit = (expense) => setExpenseModal({ open: true, editData: expense });
  const closeModal = () => setExpenseModal({ open: false, editData: null });

  return (
    <AppShell mode="room" topBarTitle={currentRoom?.room?.name} topBarActions={<RoomTopBarActions onAddExpense={openAdd} />}>
      <Routes>
        <Route path="dashboard" element={<Dashboard onAddExpense={openAdd} onEditExpense={openEdit} />} />
        <Route path="expenses" element={<Expenses onAddExpense={openAdd} onEditExpense={openEdit} />} />
        <Route path="members" element={<Members />} />
        <Route path="settlements" element={<Settlements />} />
        <Route path="analytics" element={<Analytics />} />
        <Route path="*" element={<Navigate to="dashboard" replace />} />
      </Routes>

      <AddExpenseModal open={expenseModal.open} onClose={closeModal} editData={expenseModal.editData} />
    </AppShell>
  );
}

function AppContent() {
  const { user, loading } = useAuth();

  if (loading) return null;
  if (!user) return <AuthScreen />;

  return (
    <Routes>
      <Route path="/" element={<AppShell mode="global" topBarTitle="Tổng quan"><PersonalDashboard /></AppShell>} />
      <Route path="/insights" element={<AppShell mode="global" topBarTitle="Phân tích"><Suspense fallback={<PageFallback />}><AICopilotPage /></Suspense></AppShell>} />
      <Route path="/rooms" element={<AppShell mode="global" topBarTitle="Phòng"><RoomList /></AppShell>} />
      <Route path="/plans" element={<AppShell mode="global" topBarTitle="Kế hoạch"><Suspense fallback={<PageFallback />}><PlansPage /></Suspense></AppShell>} />
      <Route path="/budget" element={<AppShell mode="global" topBarTitle="Ngân sách"><Suspense fallback={<PageFallback />}><BudgetPage /></Suspense></AppShell>} />
      <Route path="/copilot" element={<AppShell mode="global" topBarTitle="Trợ lý AI"><Suspense fallback={<PageFallback />}><AICopilotPage /></Suspense></AppShell>} />
      <Route path="/forecasts" element={<AppShell mode="global" topBarTitle="Dự báo"><Suspense fallback={<PageFallback />}><ForecastsPage /></Suspense></AppShell>} />
      <Route path="/settings" element={<AppShell mode="global" topBarTitle="Cài đặt"><Suspense fallback={<PageFallback />}><SettingsPage /></Suspense></AppShell>} />
      <Route path="/admin" element={<AdminGuard><AppShell mode="global" topBarTitle="Quản trị"><Suspense fallback={<PageFallback />}><AdminDashboard /></Suspense></AppShell></AdminGuard>} />
      <Route path="/rooms/:roomId/*" element={<RoomGuard><RoomRoutes /></RoomGuard>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppContent />
      <ToastContainer />
    </BrowserRouter>
  );
}
