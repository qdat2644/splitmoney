import { useState, useEffect, useCallback } from 'react';
import { Search, Archive, RotateCcw, RefreshCw } from 'lucide-react';
import AppCard from '../../components/ui/AppCard';
import { adminApi } from '../../services/apiClient';
import { MetricTile, StatusBadge, formatDate } from './AdminOverviewTab';

export default function AdminRoomsTab({ onRefresh }) {
  const [rooms, setRooms] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
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
      if (statusFilter) params.status = statusFilter;
      params.page = page;
      const res = await adminApi.getRooms(params);
      setRooms(res.rooms || []);
      setTotal(res.total || 0);
      setTotalPages(res.totalPages || 1);
    } catch (err) {
      setFeedback({ type: 'error', message: err.message });
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, page]);

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

  const inspectRoom = async (roomId) => {
    try {
      const res = await adminApi.getRoom(roomId);
      setInspected(res.room);
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
              placeholder="Tìm theo tên phòng…"
              className="w-full rounded-lg border border-white/10 bg-dark-800 pl-9 pr-3 py-2 text-xs text-zinc-200 outline-none placeholder:text-zinc-600"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="rounded-lg border border-white/10 bg-dark-800 px-3 py-2 text-xs text-zinc-200 outline-none"
          >
            <option value="">Tất cả trạng thái</option>
            <option value="active">Hoạt động</option>
            <option value="archived">Đã lưu trữ</option>
          </select>
          <p className="text-[11px] text-zinc-500 shrink-0">{total} phòng</p>
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

      {/* Room List */}
      {loading ? (
        <div className="space-y-2">
          {[0, 1, 2].map(i => (
            <div key={i} className="h-16 animate-pulse rounded-xl border border-white/5 bg-white/[0.03]" />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {rooms.map((room) => (
            <AppCard key={room.id} className="p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-white truncate">{room.name}</p>
                    <StatusBadge status={room.status} labels={{ active: 'Hoạt động', archived: 'Lưu trữ' }} />
                  </div>
                  <p className="text-[11px] text-zinc-500">
                    {room.ownerName} · {room.members} thành viên · {room.expenses} chi phí · {room.guests} khách · Tạo {formatDate(room.createdAt)}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <ActionButton icon={Search} label="Kiểm tra" onClick={() => inspectRoom(room.id)} />
                  {room.status === 'active' && (
                    <ActionButton
                      icon={Archive}
                      label="Lưu trữ"
                      variant="warning"
                      loading={actionLoading === `archive-${room.id}`}
                      onClick={() => doAction(`archive-${room.id}`, () => adminApi.archiveRoom(room.id))}
                    />
                  )}
                  {room.status === 'archived' && (
                    <ActionButton
                      icon={RotateCcw}
                      label="Mở lại"
                      variant="success"
                      loading={actionLoading === `reopen-${room.id}`}
                      onClick={() => doAction(`reopen-${room.id}`, () => adminApi.reopenRoom(room.id))}
                    />
                  )}
                </div>
              </div>
            </AppCard>
          ))}
          {rooms.length === 0 && (
            <p className="text-center text-xs text-zinc-500 py-8">Không tìm thấy phòng.</p>
          )}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
            className="rounded-md border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-zinc-300 disabled:opacity-40">Trước</button>
          <span className="text-xs text-zinc-500">{page}/{totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}
            className="rounded-md border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-zinc-300 disabled:opacity-40">Sau</button>
        </div>
      )}

      {/* Inspector Panel */}
      {inspected && (
        <AppCard className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-white">Hồ sơ: {inspected.name}</h3>
            <button onClick={() => setInspected(null)} className="text-xs text-zinc-500 hover:text-zinc-300">Đóng</button>
          </div>
          <div className="grid gap-2 sm:grid-cols-4 mb-4">
            <MetricTile label="Thành viên" value={inspected.counts?.members ?? 0} />
            <MetricTile label="Chi phí" value={inspected.counts?.expenses ?? 0} />
            <MetricTile label="Khách chưa gắn" value={inspected.counts?.unresolvedGuests ?? 0} />
            <MetricTile label="Thanh toán" value={inspected.counts?.payments ?? 0} />
          </div>

          {inspected.members?.length > 0 && (
            <div className="mb-3">
              <p className="text-[11px] text-zinc-500 font-medium mb-1">Thành viên</p>
              <div className="space-y-1">
                {inspected.members.map((m) => (
                  <div key={m.userId} className="flex items-center gap-2 text-xs text-zinc-300">
                    <span>{m.name}</span> <StatusBadge status={m.role} /> <StatusBadge status={m.status} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {inspected.guests?.length > 0 && (
            <div className="mb-3">
              <p className="text-[11px] text-zinc-500 font-medium mb-1">Khách</p>
              <div className="space-y-1">
                {inspected.guests.map((g) => (
                  <div key={g.id} className="flex items-center gap-2 text-xs text-zinc-300">
                    <span>{g.displayName}</span>
                    <StatusBadge status={g.claimed ? 'claimed' : g.status} labels={{ claimed: 'Đã gắn', active: 'Chưa gắn' }} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {inspected.aiProfileStatus && (
            <div className="rounded-lg border border-white/5 bg-dark-900/40 p-3 text-xs text-zinc-400 mb-3">
              Temporal memory: {String(inspected.temporalMemoryAvailable)}
              · AI profiles: {inspected.aiProfileStatus.available}/{inspected.aiProfileStatus.total}
            </div>
          )}

          {inspected.importHistory?.length > 0 && (
            <div>
              <p className="text-[11px] text-zinc-500 font-medium mb-1">Lịch sử nhập gần đây</p>
              <div className="space-y-1.5">
                {inspected.importHistory.slice(0, 5).map((e) => (
                  <div key={e.id} className="text-[11px] text-zinc-400">
                    {e.type} · {formatDate(e.createdAt)}
                  </div>
                ))}
              </div>
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
