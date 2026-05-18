// App.jsx — Root application component
import { useState, useEffect, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

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
const PlansPage  = lazy(() => import('./pages/PlansPage'));
const BudgetPage = lazy(() => import('./pages/BudgetPage'));
import { useApp } from './context/AppContext';
import { useAuth } from './context/AuthContext';
import ToastContainer from './components/ui/Toast';

import { Navigate, useParams, Link } from 'react-router-dom';

function PageFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-dark-900">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
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
          room: { name: 'Dữ liệu cũ (Local)', code: 'OFFLINE' }
        });
        return;
      }

      const membership = rooms.find(m => m.roomId === roomId);
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
      <div className="min-h-screen flex items-center justify-center bg-dark-900">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!currentRoom || currentRoom.roomId !== roomId) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-dark-900 text-white">
        <h2 className="text-xl font-bold mb-4">Phòng không tồn tại hoặc bạn chưa tham gia</h2>
        <Link to="/rooms" className="text-blue-400 hover:underline">Về danh sách phòng</Link>
      </div>
    );
  }

  if (currentRoom.status === 'pending') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-dark-900 text-white">
        <h2 className="text-xl font-bold mb-4 text-yellow-400">Bạn đang chờ được duyệt vào phòng này</h2>
        <Link to="/rooms" className="text-blue-400 hover:underline">Về danh sách phòng</Link>
      </div>
    );
  }

  return children;
}

function AppRoutes() {
  const { loadingRoom, currentRoom } = useApp();
  const [expenseModal, setExpenseModal] = useState({ open: false, editData: null });

  if (loadingRoom) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-900">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
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

      <AddExpenseModal
        open={expenseModal.open}
        onClose={closeModal}
        editData={expenseModal.editData}
      />
    </AppShell>
  );
}

function AppContent() {
  const { user, loading } = useAuth();

  if (loading) return null;

  if (!user) {
    return <AuthScreen />;
  }

  return (
    <Routes>
      <Route path="/" element={<AppShell mode="global" topBarTitle="Dashboard"><PersonalDashboard /></AppShell>} />
      <Route path="/rooms" element={<AppShell mode="global" topBarTitle="Phòng của bạn"><RoomList /></AppShell>} />
      <Route path="/plans" element={<AppShell mode="global" topBarTitle="Kế hoạch"><Suspense fallback={<PageFallback />}><PlansPage /></Suspense></AppShell>} />
      <Route path="/budget" element={<AppShell mode="global" topBarTitle="Ngân sách"><Suspense fallback={<PageFallback />}><BudgetPage /></Suspense></AppShell>} />
      <Route path="/rooms/:roomId/*" element={<RoomGuard><AppRoutes /></RoomGuard>} />
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
