import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { roomApi, expenseApi, guestApi, paymentApi } from '../services/apiClient';
import { useAuth } from './AuthContext';
import { useToast } from '../hooks/useToast';
import { calculateBalances, calculateSettlements, calculateStats } from '../utils/calculations';
import { memberService, expenseService } from '../services/storageService';

// Reusing AppContext structure but connected to API
const AppContext = createContext(null);

export function AppProvider({ children }) {
  const { user } = useAuth();
  const { toasts, toast, removeToast } = useToast();

  const [currentRoom, setCurrentRoom] = useState(null);
  const [rooms, setRooms] = useState([]);
  
  const [members, setMembers] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [payments, setPayments] = useState([]); // Can stay local or be migrated later

  // Removed plannedExpenses and budgets as they are unused legacy features.
  // TODO: Add backend API endpoints for planned expenses and budgets in the future if needed.
  const [theme, setTheme] = useState(() => localStorage.getItem('spliteasy_theme') || 'dark');

  const [loadingRooms, setLoadingRooms] = useState(true);
  const [loadingRoom, setLoadingRoom] = useState(false);

  // Load rooms when user logs in
  useEffect(() => {
    if (user) {
      setLoadingRooms(true);
      roomApi.getRooms().then(data => {
        setRooms(data.memberships);
      }).catch(err => console.error(err))
      .finally(() => setLoadingRooms(false));
    } else {
      setRooms([]);
      setCurrentRoom(null);
      setLoadingRooms(false);
    }
  }, [user]);

  // Load room data when currentRoom changes
  useEffect(() => {
    if (currentRoom && currentRoom.roomId === 'local') {
      const localMembers = memberService.getAll() || [];
      const localExpenses = expenseService.getAll() || [];
      setMembers(localMembers.map(m => ({ ...m, status: 'approved' })));
      setExpenses(localExpenses);
      setPayments([]);
      return;
    }

    if (currentRoom && currentRoom.status === 'approved') {
      setLoadingRoom(true);
      setMembers([]);
      setExpenses([]);
      setPayments([]);

      Promise.all([
        roomApi.getMembers(currentRoom.roomId),
        expenseApi.getExpenses(currentRoom.roomId),
        guestApi.getGuests(currentRoom.roomId),
        paymentApi.getPayments(currentRoom.roomId),
      ]).then(([membersData, expensesData, guestsData, paymentsData]) => {
        // Map backend members to frontend structure
        const mappedMembers = membersData.members.map((m, i) => ({
          id: m.user.id,
          name: m.user.name || m.user.displayName || m.user.username || m.user.email || 'Unknown',
          status: m.status,
          role: m.role,
          type: 'user',
          claimGuestMemberId: m.claimGuestMemberId,
          colorIndex: i % 5,
        }));
        
        const mappedGuests = guestsData.guests.map((g, i) => ({
          id: g.id,
          name: g.displayName || g.name || g.username || g.email || 'Unknown',
          status: g.status,
          type: 'guest',
          claimedByUserId: g.claimedByUserId,
          colorIndex: (i + mappedMembers.length) % 5,
        }));

        setMembers([...mappedMembers, ...mappedGuests]);

        // Map backend expenses — include shareMap for canonical balance calculation
        const mappedExpenses = expensesData.expenses.map(e => {
          const shareMap = {};
          e.participants.forEach(p => {
            const pid = p.userId || p.guestMemberId;
            if (pid) shareMap[pid] = p.shareAmount;
          });
          return {
            id:           e.id,
            title:        e.title,
            amount:       e.amount,
            date:         e.date.split('T')[0],
            paidBy:       e.paidByUserId || e.paidByGuestMemberId,
            createdBy:    e.createdByUserId,
            category:     e.category,
            note:         e.note,
            splitType:    e.splitType || 'equal',
            participants: e.participants.map(p => p.userId || p.guestMemberId),
            shareMap,
          };
        });
        setExpenses(mappedExpenses);

        // Map backend payments — flatten from/to objects to IDs for calculations
        const mappedPayments = paymentsData.payments.map(p => ({
          id:        p.id,
          from:      p.from.id,
          to:        p.to.id,
          fromName:  p.from.name,
          toName:    p.to.name,
          amount:    p.amount,
          note:      p.note,
          date:      p.paidAt?.split('T')[0],
          createdAt: p.createdAt,
          createdByUserId: p.createdByUserId,
        }));
        setPayments(mappedPayments);
      }).catch(err => toast.error('Lỗi tải dữ liệu room')).finally(() => setLoadingRoom(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentRoom]);

  // Theme
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') root.classList.add('dark');
    else root.classList.remove('dark');
    localStorage.setItem('spliteasy_theme', theme);
  }, [theme]);

  // Derived (only use approved users and active guests for calculations and display)
  const approvedMembers = useMemo(() => 
    members.filter(m => m.status === 'approved' || m.status === 'active'), 
  [members]);

  const normalizedExpenses = useMemo(() => {
    return expenses.map(e => {
      const payer = members.find(m => m.id === e.paidBy);
      const normalizedPaidBy = (payer?.type === 'guest' && payer.claimedByUserId) ? payer.claimedByUserId : e.paidBy;
        
      const normalizedParticipants = e.participants.map(p => {
        const pm = members.find(m => m.id === p);
        return (pm?.type === 'guest' && pm.claimedByUserId) ? pm.claimedByUserId : p;
      });

      return { ...e, paidBy: normalizedPaidBy, participants: normalizedParticipants };
    });
  }, [expenses, members]);

  const balances = useMemo(() => calculateBalances(approvedMembers, normalizedExpenses, payments), [approvedMembers, normalizedExpenses, payments]);
  const settlements = useMemo(() => calculateSettlements(balances), [balances]);
  const stats = useMemo(() => calculateStats(approvedMembers, normalizedExpenses, payments), [approvedMembers, normalizedExpenses, payments]);

  // Actions
  const addExpense = useCallback(async (data) => {
    if (!currentRoom) return;

    if (currentRoom.roomId === 'local') {
      toast.error('Chế độ Local chỉ cho phép xem. Hãy tạo phòng mới để thêm chi tiêu.');
      return;
    }

    try {
      // transform frontend data to backend data
      const payload = {
        title: data.title,
        amount: data.amount,
        category: data.category,
        note: data.note,
        paidByUserId: members.find(m => m.id === data.paidBy)?.type === 'user' ? data.paidBy : null,
        paidByGuestMemberId: members.find(m => m.id === data.paidBy)?.type === 'guest' ? data.paidBy : null,
        splitType: data.splitType || 'equal',
        date: new Date(data.date).toISOString(),
        participants: data.participants.map(id => ({ 
          userId: members.find(m => m.id === id)?.type === 'user' ? id : null,
          guestMemberId: members.find(m => m.id === id)?.type === 'guest' ? id : null,
          ...(data.splitType === 'exact' ? { shareAmount: data.splitShares?.[id] || 0 } : {}),
          ...(data.splitType === 'percentage' ? { sharePercent: data.splitShares?.[id] || 0 } : {})
        }))
      };
      const res = await expenseApi.addExpense(currentRoom.roomId, payload);
      
      const newExpense = {
        id: res.expense.id,
        title: res.expense.title,
        amount: res.expense.amount,
        date: res.expense.date.split('T')[0],
        paidBy: res.expense.paidByUserId || res.expense.paidByGuestMemberId,
        createdBy: res.expense.createdByUserId,
        category: res.expense.category,
        note: res.expense.note,
        participants: res.expense.participants.map(p => p.userId || p.guestMemberId),
        splitType: 'equal'
      };

      setExpenses(prev => [newExpense, ...prev]);
      toast.success('Đã thêm khoản chi!');
      return newExpense;
    } catch (err) {
      toast.error(err.message || 'Lỗi thêm khoản chi');
      throw err;
    }
  }, [currentRoom, members, toast]);

  const updateExpense = useCallback(async (id, data) => {
    if (!currentRoom) return;
    if (currentRoom.roomId === 'local') {
      toast.error('Chế độ Local chỉ cho phép xem.');
      return;
    }
    try {
      const payload = {
        title: data.title,
        amount: data.amount,
        category: data.category,
        note: data.note,
        paidByUserId: members.find(m => m.id === data.paidBy)?.type === 'user' ? data.paidBy : null,
        paidByGuestMemberId: members.find(m => m.id === data.paidBy)?.type === 'guest' ? data.paidBy : null,
        splitType: data.splitType || 'equal',
        date: new Date(data.date).toISOString(),
        participants: data.participants.map(id => ({ 
          userId: members.find(m => m.id === id)?.type === 'user' ? id : null,
          guestMemberId: members.find(m => m.id === id)?.type === 'guest' ? id : null,
          ...(data.splitType === 'exact' ? { shareAmount: data.splitShares?.[id] || 0 } : {}),
          ...(data.splitType === 'percentage' ? { sharePercent: data.splitShares?.[id] || 0 } : {})
        }))
      };
      const res = await expenseApi.updateExpense(currentRoom.roomId, id, payload);
      
      const updatedExpense = {
        id: res.expense.id,
        title: res.expense.title,
        amount: res.expense.amount,
        date: res.expense.date.split('T')[0],
        paidBy: res.expense.paidByUserId || res.expense.paidByGuestMemberId,
        createdBy: res.expense.createdByUserId,
        category: res.expense.category,
        note: res.expense.note,
        participants: res.expense.participants.map(p => p.userId || p.guestMemberId),
        splitType: 'equal'
      };

      setExpenses(prev => prev.map(e => e.id === id ? updatedExpense : e));
      toast.success('Đã cập nhật khoản chi!');
    } catch (err) {
      toast.error(err.message || 'Lỗi cập nhật khoản chi');
      throw err;
    }
  }, [currentRoom, members, toast]);

  const deleteExpense = useCallback(async (id) => {
    if (!currentRoom) return;
    if (currentRoom.roomId === 'local') {
      toast.error('Chế độ Local chỉ cho phép xem.');
      return;
    }
    const backup = [...expenses];
    setExpenses(prev => prev.filter(e => e.id !== id));
    try {
      await expenseApi.deleteExpense(currentRoom.roomId, id);
      toast.success('Đã xoá khoản chi!');
    } catch (err) {
      setExpenses(backup);
      toast.error(err.message || 'Lỗi xoá khoản chi');
      throw err;
    }
  }, [currentRoom, expenses, toast]);

  const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark');

  const approveMember = useCallback(async (userId) => {
    if (currentRoom?.roomId === 'local') return toast.error('Chế độ Local chỉ cho phép xem.');
    try {
      const res = await roomApi.approveMember(currentRoom.roomId, userId);
      setMembers(prev => {
        let newMembers = prev.map(m => m.id === userId ? { ...m, status: 'approved' } : m);
        if (res.guest) {
          newMembers = newMembers.map(m => m.id === res.guest.id ? { ...m, status: 'claimed', claimedByUserId: userId } : m);
        }
        return newMembers;
      });
      toast.success('Đã duyệt thành viên');
    } catch (err) {
      toast.error('Lỗi duyệt thành viên');
      throw err;
    }
  }, [currentRoom, toast]);

  const rejectMember = useCallback(async (userId) => {
    if (currentRoom?.roomId === 'local') return toast.error('Chế độ Local chỉ cho phép xem.');
    try {
      await roomApi.rejectMember(currentRoom.roomId, userId);
      setMembers(prev => prev.map(m => m.id === userId ? { ...m, status: 'rejected' } : m));
      toast.success('Đã từ chối thành viên');
    } catch (err) {
      toast.error('Lỗi từ chối thành viên');
      throw err;
    }
  }, [currentRoom, toast]);

  const removeMember = useCallback(async (userId) => {
    if (currentRoom?.roomId === 'local') return toast.error('Chế độ Local chỉ cho phép xem.');
    try {
      await roomApi.removeMember(currentRoom.roomId, userId);
      setMembers(prev => {
        let newMembers = prev.filter(m => m.id !== userId);
        newMembers = newMembers.map(m => m.claimedByUserId === userId ? { ...m, status: 'active', claimedByUserId: null } : m);
        return newMembers;
      });
      toast.success('Đã xoá thành viên');
    } catch (err) {
      toast.error('Lỗi xoá thành viên');
      throw err;
    }
  }, [currentRoom, toast]);

  const addPayment = useCallback(async (data) => {
    if (!currentRoom || currentRoom.roomId === 'local') return;
    try {
      const fromMember = members.find(m => m.id === data.from);
      const toMember   = members.find(m => m.id === data.to);
      const payload = {
        fromUserId:        fromMember?.type === 'user'  ? data.from : null,
        fromGuestMemberId: fromMember?.type === 'guest' ? data.from : null,
        toUserId:          toMember?.type   === 'user'  ? data.to   : null,
        toGuestMemberId:   toMember?.type   === 'guest' ? data.to   : null,
        amount: Number(data.amount),
        note:   data.note  || null,
        paidAt: data.date  ? new Date(data.date).toISOString() : new Date().toISOString(),
      };
      const res = await paymentApi.addPayment(currentRoom.roomId, payload);
      const p = res.payment;
      setPayments(prev => [{
        id:        p.id,
        from:      p.from.id,
        to:        p.to.id,
        fromName:  p.from.name,
        toName:    p.to.name,
        amount:    p.amount,
        note:      p.note,
        date:      p.paidAt?.split('T')[0],
        createdAt: p.createdAt,
        createdByUserId: p.createdByUserId,
      }, ...prev]);
      toast.success('Đã ghi nhận thanh toán!');
      return res;
    } catch (err) {
      toast.error(err.message || 'Lỗi ghi thanh toán');
      throw err;
    }
  }, [currentRoom, members, toast]);

  const deletePayment = useCallback(async (paymentId) => {
    if (!currentRoom || currentRoom.roomId === 'local') return;
    const backup = [...payments];
    setPayments(prev => prev.filter(p => p.id !== paymentId));
    try {
      await paymentApi.deletePayment(currentRoom.roomId, paymentId);
      toast.success('Đã xoá thanh toán!');
    } catch (err) {
      setPayments(backup);
      toast.error(err.message || 'Lỗi xoá thanh toán');
      throw err;
    }
  }, [currentRoom, payments, toast]);

  const value = useMemo(() => ({
    members, expenses, payments, balances, settlements, stats, theme,
    approvedMembers,
    currentUser: user, // Map user to currentUser for existing components
    currentRoom, setCurrentRoom, rooms, setRooms,
    loadingRoom, loadingRooms,
    toasts, removeToast, toast,
    addExpense, updateExpense, deleteExpense,
    removeMember, approveMember, rejectMember,
    addPayment, deletePayment,
    toggleTheme,
    setMembers,
    setExpenses,
  }), [
    members, expenses, payments, balances, settlements, stats, theme,
    user, currentRoom, rooms, loadingRoom,
    toasts, removeToast, toast,
    addExpense, updateExpense, deleteExpense, removeMember, approveMember, rejectMember,
    addPayment, deletePayment, setMembers, setExpenses
  ]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be inside AppProvider');
  return ctx;
};
