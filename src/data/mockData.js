// Mock data - 4 members, 10 expenses
// Structured to be easy to replace with API calls later

export const MEMBER_COLORS = [
  { bg: 'from-blue-500 to-cyan-500', text: 'text-white', ring: 'ring-blue-500/30' },
  { bg: 'from-purple-500 to-pink-500', text: 'text-white', ring: 'ring-purple-500/30' },
  { bg: 'from-emerald-500 to-teal-500', text: 'text-white', ring: 'ring-emerald-500/30' },
  { bg: 'from-orange-500 to-red-500', text: 'text-white', ring: 'ring-orange-500/30' },
  { bg: 'from-yellow-400 to-orange-500', text: 'text-white', ring: 'ring-yellow-500/30' },
  { bg: 'from-pink-500 to-rose-500', text: 'text-white', ring: 'ring-pink-500/30' },
  { bg: 'from-indigo-500 to-blue-600', text: 'text-white', ring: 'ring-indigo-500/30' },
  { bg: 'from-cyan-400 to-sky-500', text: 'text-white', ring: 'ring-cyan-500/30' },
];

export const INITIAL_MEMBERS = [
  { id: 'member-1', name: 'Tuấn', colorIndex: 0, joinedAt: '2024-05-12' },
  { id: 'member-2', name: 'Trà', colorIndex: 1, joinedAt: '2024-05-12' },
  { id: 'member-3', name: 'Đạt', colorIndex: 2, joinedAt: '2024-05-12' },
];

export const INITIAL_EXPENSES = [
  {
    id: 'expense-1',
    title: 'Ăn lẩu',
    amount: 500000,
    date: '2024-05-12',
    paidBy: 'member-1',
    participants: ['member-1', 'member-2', 'member-3'],
    note: 'Liên hoan lẩu',
    category: 'food',
    createdAt: new Date().toISOString(),
    splitType: 'equal',
  },
  {
    id: 'expense-2',
    title: 'Mua xôi',
    amount: 30000,
    date: '2024-05-12',
    paidBy: 'member-2',
    participants: ['member-1', 'member-2', 'member-3'],
    note: 'Ăn sáng',
    category: 'food',
    createdAt: new Date(Date.now() + 1000).toISOString(),
    splitType: 'equal',
  },
  {
    id: 'expense-3',
    title: 'Uống trà sữa',
    amount: 90000,
    date: '2024-05-12',
    paidBy: 'member-3',
    participants: ['member-1', 'member-2', 'member-3'],
    note: 'Trà sữa buổi chiều',
    category: 'drinks',
    createdAt: new Date(Date.now() + 2000).toISOString(),
    splitType: 'equal',
  },
];

export const CATEGORIES = [
  { id: 'food', label: 'Ăn uống', icon: '🍜', color: 'text-orange-400', bg: 'bg-orange-500/10' },
  { id: 'drinks', label: 'Đồ uống', icon: '☕', color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
  { id: 'transport', label: 'Di chuyển', icon: '🚗', color: 'text-blue-400', bg: 'bg-blue-500/10' },
  { id: 'accommodation', label: 'Chỗ ở', icon: '🏠', color: 'text-purple-400', bg: 'bg-purple-500/10' },
  { id: 'grocery', label: 'Siêu thị', icon: '🛒', color: 'text-green-400', bg: 'bg-green-500/10' },
  { id: 'entertainment', label: 'Giải trí', icon: '🎮', color: 'text-pink-400', bg: 'bg-pink-500/10' },
  { id: 'other', label: 'Khác', icon: '📦', color: 'text-gray-400', bg: 'bg-gray-500/10' },
];
