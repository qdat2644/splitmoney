import { useState, useEffect, useCallback } from 'react';
import { Search, UserX, UserCheck, ShieldCheck, RefreshCw, Brain } from 'lucide-react';
import AppCard from '../../components/ui/AppCard';
import { adminApi } from '../../services/apiClient';
import { MetricTile, StatusBadge, formatDate } from './AdminOverviewTab';

export default function AdminUsersTab({ onRefresh }) {
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState('');
  const [inspected, setInspected] = useState(null);
  const [feedback, setFeedback] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (search) params.search = search;
      if (roleFilter) params.role = roleFilter;
      if (statusFilter) params.status = statusFilter;
      params.page = page;
      const res = await adminApi.getUsers(params);
      setUsers(res.users || []);
      setTotal(res.total || 0);
      setTotalPages(res.totalPages || 1);
    } catch (err) {
      setFeedback({ type: 'error', message: err.message });
    } finally {
      setLoading(false);
    }
  }, [search, roleFilter, statusFilter, page]);

  useEffect(() => { load(); }, [load]);

  const showFeedback = (type, message) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 4000);
  };

  const doAction = async (label, action) => {
    setActionLoading(label);
    try {
      await action();
      showFeedback('success', `${label} thành công.`);
      load();
      onRefresh?.();
    } catch (err) {
      showFeedback('error', err.message);
    } finally {
      setActionLoading('');
    }
  };

  const inspectUser = async (userId) => {
    try {
      const res = await adminApi.getUser(userId);
      setInspected(res.user);
    } catch (err) {
      showFeedback('error', err.message);
    }
  };

  return (
    <div className="space-y-4">
      {/* Search & Filters */}
      <AppCard className="p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500" />
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Tìm theo tên hoặc email…"
              className="w-full rounded-lg border border-white/10 bg-dark-800 pl-9 pr-3 py-2 text-xs text-zinc-200 outline-none placeholder:text-zinc-600"
            />
          </div>
          <select
            value={roleFilter}
            onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
            className="rounded-lg border border-white/10 bg-dark-800 px-3 py-2 text-xs text-zinc-200 outline-none"
          >
            <option value="">Tất cả vai trò</option>
            <option value="admin">Admin</option>
            <option value="member">Member</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="rounded-lg border border-white/10 bg-dark-800 px-3 py-2 text-xs text-zinc-200 outline-none"
          >
            <option value="">Tất cả trạng thái</option>
            <option value="active">Hoạt động</option>
            <option value="suspended">Tạm ngưng</option>
          </select>
          <p className="text-[11px] text-zinc-500 shrink-0">{total} người dùng</p>
        </div>
      </AppCard>

      {/* Feedback */}
      {feedback && (
        <div className={`rounded-lg border px-4 py-2.5 text-xs ${
          feedback.type === 'success'
            ? 'border-emerald-400/20 bg-emerald-400/5 text-emerald-200'
            : 'border-rose-400/20 bg-rose-400/5 text-rose-200'
        }`}>
          {feedback.message}
        </div>
      )}

      {/* User List */}
      {loading ? (
        <div className="space-y-2">
          {[0, 1, 2].map(i => (
            <div key={i} className="h-16 animate-pulse rounded-xl border border-white/5 bg-white/[0.03]" />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {users.map((user) => (
            <AppCard key={user.id} className="p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-white truncate">{user.name}</p>
                    <StatusBadge status={user.role} />
                    <StatusBadge status={user.status} labels={{ active: 'Hoạt động', suspended: 'Tạm ngưng' }} />
                  </div>
                  <p className="text-[11px] text-zinc-500">
                    {user.email} · {user.rooms} phòng · {user.expenses} chi phí · Tham gia {formatDate(user.createdAt)}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                  <ActionButton
                    icon={Search}
                    label="Kiểm tra"
                    onClick={() => inspectUser(user.id)}
                  />
                  {user.status === 'active' && user.role !== 'admin' && (
                    <ActionButton
                      icon={UserX}
                      label="Tạm ngưng"
                      variant="warning"
                      loading={actionLoading === `suspend-${user.id}`}
                      onClick={() => doAction(`suspend-${user.id}`, () => adminApi.suspendUser(user.id, 'Admin action'))}
                    />
                  )}
                  {user.status === 'suspended' && (
                    <ActionButton
                      icon={UserCheck}
                      label="Kích hoạt"
                      variant="success"
                      loading={actionLoading === `reactivate-${user.id}`}
                      onClick={() => doAction(`reactivate-${user.id}`, () => adminApi.reactivateUser(user.id))}
                    />
                  )}
                  {user.role === 'member' && (
                    <ActionButton
                      icon={ShieldCheck}
                      label="→ Admin"
                      variant="neutral"
                      loading={actionLoading === `promote-${user.id}`}
                      onClick={() => doAction(`promote-${user.id}`, () => adminApi.assignRole(user.id, 'admin'))}
                    />
                  )}
                  <ActionButton
                    icon={Brain}
                    label="Recompute AI"
                    variant="neutral"
                    loading={actionLoading === `ai-${user.id}`}
                    onClick={() => doAction(`ai-${user.id}`, () => adminApi.recomputeAiProfile(user.id))}
                  />
                </div>
              </div>
            </AppCard>
          ))}
          {users.length === 0 && (
            <p className="text-center text-xs text-zinc-500 py-8">Không tìm thấy người dùng.</p>
          )}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            disabled={page <= 1}
            onClick={() => setPage(p => p - 1)}
            className="rounded-md border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-zinc-300 disabled:opacity-40"
          >
            Trước
          </button>
          <span className="text-xs text-zinc-500">{page}/{totalPages}</span>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage(p => p + 1)}
            className="rounded-md border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-zinc-300 disabled:opacity-40"
          >
            Sau
          </button>
        </div>
      )}

      {/* Inspector Panel */}
      {inspected && (
        <AppCard className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-white">Hồ sơ hỗ trợ: {inspected.name}</h3>
            <button onClick={() => setInspected(null)} className="text-xs text-zinc-500 hover:text-zinc-300">Đóng</button>
          </div>
          <div className="grid gap-2 sm:grid-cols-4 mb-4">
            <MetricTile label="Phòng" value={inspected.counts?.rooms ?? 0} />
            <MetricTile label="Chi phí tạo" value={inspected.counts?.expensesCreated ?? 0} />
            <MetricTile label="Thanh toán" value={inspected.counts?.paymentsCreated ?? 0} />
            <MetricTile label="Ngân sách" value={inspected.counts?.budgets ?? 0} />
          </div>
          {inspected.aiProfileStatus && (
            <div className="rounded-lg border border-white/5 bg-dark-900/40 p-3 text-xs text-zinc-400 mb-3">
              Temporal memory: {String(inspected.aiProfileStatus.temporalMemoryAvailable)}
              {inspected.aiProfileStatus.temporalConfidence != null
                ? ` · confidence ${inspected.aiProfileStatus.temporalConfidence}`
                : ''}
            </div>
          )}
          {inspected.rooms?.length > 0 && (
            <div className="space-y-1">
              <p className="text-[11px] text-zinc-500 font-medium">Phòng tham gia</p>
              {inspected.rooms.map((r) => (
                <div key={r.roomId} className="flex items-center gap-2 text-xs text-zinc-300">
                  <span>{r.roomName}</span>
                  <StatusBadge status={r.role} />
                  <StatusBadge status={r.status} />
                </div>
              ))}
            </div>
          )}
        </AppCard>
      )}
    </div>
  );
}

function ActionButton({ icon: Icon, label, onClick, variant = 'default', loading = false }) {
  const variants = {
    default: 'border-white/10 bg-white/[0.04] text-zinc-300 hover:bg-white/[0.07]',
    warning: 'border-amber-400/20 bg-amber-400/5 text-amber-200 hover:bg-amber-400/10',
    success: 'border-emerald-400/20 bg-emerald-400/5 text-emerald-200 hover:bg-emerald-400/10',
    neutral: 'border-white/10 bg-white/[0.04] text-zinc-400 hover:bg-white/[0.07]',
  };

  return (
    <button
      onClick={onClick}
      disabled={loading}
      className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-[11px] font-medium transition-colors disabled:opacity-50 ${variants[variant]}`}
    >
      {loading ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Icon className="h-3 w-3" />}
      {label}
    </button>
  );
}
