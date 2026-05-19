import { useState, useEffect, useCallback } from 'react';
import AppCard from '../../components/ui/AppCard';
import { adminApi } from '../../services/apiClient';
import { StatusBadge, formatDate } from './AdminOverviewTab';

const actionLabels = {
  'user.suspend': 'Tạm ngưng người dùng',
  'user.reactivate': 'Kích hoạt lại người dùng',
  'user.role_change': 'Thay đổi vai trò',
  'room.archive': 'Lưu trữ phòng',
  'room.reopen': 'Mở lại phòng',
  'ai.recompute': 'Tính lại hồ sơ AI',
};

const targetTypeLabels = {
  user: 'Người dùng',
  room: 'Phòng',
  ai_profile: 'Hồ sơ AI',
  import: 'Nhập dữ liệu',
};

export default function AdminAuditTab() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { limit: 100 };
      if (filter) params.actionType = filter;
      const data = await adminApi.getAuditLog(params);
      setEntries(Array.isArray(data) ? data : []);
    } catch {
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-4">
      {/* Filter */}
      <AppCard className="p-4">
        <div className="flex items-center gap-3">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="rounded-lg border border-white/10 bg-dark-800 px-3 py-2 text-xs text-zinc-200 outline-none"
          >
            <option value="">Tất cả hành động</option>
            <option value="user.suspend">Tạm ngưng người dùng</option>
            <option value="user.reactivate">Kích hoạt lại</option>
            <option value="user.role_change">Thay đổi vai trò</option>
            <option value="room.archive">Lưu trữ phòng</option>
            <option value="room.reopen">Mở lại phòng</option>
            <option value="ai.recompute">Tính lại AI</option>
          </select>
          <p className="text-[11px] text-zinc-500">{entries.length} bản ghi</p>
        </div>
      </AppCard>

      {/* Audit Entries */}
      {loading ? (
        <div className="space-y-2">
          {[0, 1, 2].map(i => (
            <div key={i} className="h-14 animate-pulse rounded-xl border border-white/5 bg-white/[0.03]" />
          ))}
        </div>
      ) : entries.length === 0 ? (
        <AppCard className="p-6">
          <p className="text-center text-xs text-zinc-500">Chưa có nhật ký kiểm toán.</p>
        </AppCard>
      ) : (
        <div className="space-y-2">
          {entries.map((entry) => (
            <AppCard key={entry.id} className="px-4 py-3">
              <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0 space-y-0.5">
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-medium text-white">
                      {actionLabels[entry.actionType] || entry.actionType}
                    </p>
                    <StatusBadge status={entry.actionType.split('.')[0]} labels={{
                      user: 'Người dùng',
                      room: 'Phòng',
                      ai: 'AI',
                    }} />
                  </div>
                  <p className="text-[11px] text-zinc-500">
                    {targetTypeLabels[entry.targetType] || entry.targetType} · {entry.targetId.slice(0, 8)}…
                    {entry.metadata?.reason ? ` · ${entry.metadata.reason}` : ''}
                    {entry.metadata?.previousRole ? ` · ${entry.metadata.previousRole} → ${entry.metadata.newRole}` : ''}
                    {entry.metadata?.roomName ? ` · ${entry.metadata.roomName}` : ''}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-[11px] text-zinc-500">{formatDate(entry.createdAt)}</p>
                  <p className="text-[10px] text-zinc-600">admin {entry.actorId.slice(0, 8)}…</p>
                </div>
              </div>
            </AppCard>
          ))}
        </div>
      )}
    </div>
  );
}
