// Expenses.jsx — Full expense list page with filter/search/sort
import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, SlidersHorizontal, X, ArrowUpDown, Plus } from 'lucide-react';
import { useApp } from '../context/AppContext';
import ExpenseCard from '../components/expenses/ExpenseCard';
import PlannedExpensesList from '../components/expenses/PlannedExpensesList';
import { CATEGORIES } from '../data/mockData';
import PageHeader from '../components/ui/PageHeader';
import EmptyState from '../components/ui/EmptyState';
import AppButton from '../components/ui/AppButton';
import { SkeletonPage } from '../components/ui/Skeleton';

const SORT_OPTIONS = [
  { value: 'date-desc', label: 'Mới nhất' },
  { value: 'date-asc', label: 'Cũ nhất' },
  { value: 'amount-desc', label: 'Tiền cao nhất' },
  { value: 'amount-asc', label: 'Tiền thấp nhất' },
];

export default function Expenses({ onAddExpense, onEditExpense }) {
  const { expenses, members, loadingRoom } = useApp();
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterPaidBy, setFilterPaidBy] = useState('all');
  const [sort, setSort] = useState('date-desc');
  const [showFilters, setShowFilters] = useState(false);

  const filtered = useMemo(() => {
    let result = [...expenses];

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (e) =>
          e.title.toLowerCase().includes(q) ||
          e.note?.toLowerCase().includes(q) ||
          members.find((m) => m.id === e.paidBy)?.name.toLowerCase().includes(q)
      );
    }

    // Category filter
    if (filterCategory !== 'all') {
      result = result.filter((e) => e.category === filterCategory);
    }

    // PaidBy filter
    if (filterPaidBy !== 'all') {
      result = result.filter((e) => e.paidBy === filterPaidBy);
    }

    // Sort
    const [field, dir] = sort.split('-');
    result.sort((a, b) => {
      const va = field === 'date' ? new Date(a.date) : a.amount;
      const vb = field === 'date' ? new Date(b.date) : b.amount;
      return dir === 'desc' ? vb - va : va - vb;
    });

    return result;
  }, [expenses, search, filterCategory, filterPaidBy, sort, members]);

  const totalFiltered = filtered.reduce((s, e) => s + e.amount, 0);
  const hasFilters = search || filterCategory !== 'all' || filterPaidBy !== 'all';

  return (
    <div className="space-y-5 max-w-4xl mx-auto">
      {/* Header */}
      <PageHeader
        title="Khoản chi"
        subtitle={`${expenses.length} khoản chi · ${filtered.length} kết quả`}
        actions={
          <AppButton onClick={onAddExpense} icon={Plus} className="hidden sm:flex">
            Thêm
          </AppButton>
        }
      />

      {loadingRoom ? (
        <SkeletonPage />
      ) : (
        <>
          <PlannedExpensesList />

          {/* Search & filter bar */}
      <div className="space-y-3">
        <div className="flex gap-2">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              className="input-field pl-9 pr-4"
              placeholder="Tìm kiếm khoản chi..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Sort */}
          <select
            className="input-field w-auto pr-8 text-sm"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value} className="bg-dark-700">{o.label}</option>
            ))}
          </select>

          {/* Filter toggle */}
          <button
            onClick={() => setShowFilters((v) => !v)}
            className={`btn-icon px-3 gap-1.5 flex items-center ${showFilters ? 'text-blue-400 bg-blue-500/10' : ''}`}
          >
            <SlidersHorizontal className="w-4 h-4" />
          </button>
        </div>

        {/* Filter options */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden space-y-3"
            >
              {/* Category filter */}
              <div>
                <p className="label-field">Danh mục</p>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setFilterCategory('all')}
                    className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${filterCategory === 'all' ? 'border-blue-500/50 bg-blue-500/10 text-blue-400' : 'border-white/8 text-gray-400 hover:border-white/20'}`}
                  >
                    Tất cả
                  </button>
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => setFilterCategory(cat.id)}
                      className={`text-xs px-3 py-1.5 rounded-lg border flex items-center gap-1.5 transition-all
                        ${filterCategory === cat.id ? `${cat.bg} ${cat.color} border-current` : 'border-white/8 text-gray-400 hover:border-white/20'}`}
                    >
                      {cat.icon} {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Paid by filter */}
              <div>
                <p className="label-field">Người trả</p>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setFilterPaidBy('all')}
                    className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${filterPaidBy === 'all' ? 'border-blue-500/50 bg-blue-500/10 text-blue-400' : 'border-white/8 text-gray-400 hover:border-white/20'}`}
                  >
                    Tất cả
                  </button>
                  {members.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => setFilterPaidBy(m.id)}
                      className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${filterPaidBy === m.id ? 'border-purple-500/50 bg-purple-500/10 text-purple-400' : 'border-white/8 text-gray-400 hover:border-white/20'}`}
                    >
                      {m.name}
                    </button>
                  ))}
                </div>
              </div>

              {hasFilters && (
                <button
                  onClick={() => { setSearch(''); setFilterCategory('all'); setFilterPaidBy('all'); }}
                  className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1"
                >
                  <X className="w-3 h-3" /> Xoá bộ lọc
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Results summary */}
      {filtered.length > 0 && (
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>{filtered.length} khoản chi</span>
          <span className="text-gray-400 font-medium">
            Tổng: <span className="gradient-text font-bold text-sm">
              {filtered.reduce((s, e) => s + e.amount, 0).toLocaleString('vi-VN')}đ
            </span>
          </span>
        </div>
      )}

      {/* Expense list */}
      <div className="space-y-2">
        <AnimatePresence mode="popLayout">
          {filtered.length === 0 ? (
            <motion.div key="empty" layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <EmptyState
                icon={Search}
                title="Không tìm thấy khoản chi"
                description="Hiện tại chưa có khoản chi nào phù hợp với bộ lọc, hoặc bạn chưa thêm khoản chi nào."
                action={
                  <AppButton onClick={onAddExpense} icon={Plus}>
                    Thêm khoản chi mới
                  </AppButton>
                }
              />
            </motion.div>
          ) : (
            filtered.map((e, i) => (
              <ExpenseCard key={e.id} expense={e} onEdit={onEditExpense} index={i} />
            ))
          )}
        </AnimatePresence>
      </div>
        </>
      )}
    </div>
  );
}
