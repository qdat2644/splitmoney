import AppCard from '../../components/ui/AppCard';
import { MetricTile, EventRow, TrendChart } from './AdminOverviewTab';

export default function AdminSecurityTab({ data, trends, loading }) {
  if (loading || !data) {
    return (
      <div className="space-y-3">
        {[0, 1].map(i => <div key={i} className="h-28 animate-pulse rounded-xl border border-white/5 bg-white/[0.03]" />)}
      </div>
    );
  }

  const m = data.metrics || {};

  return (
    <div className="space-y-5">
      {/* Metrics */}
      <div className="grid gap-2 sm:grid-cols-5">
        <MetricTile label="Failed auth" value={m.failedAuthAttempts ?? 0} />
        <MetricTile label="Denied room access" value={m.deniedCrossRoomMutations ?? 0} />
        <MetricTile label="Rate-limit hits" value={m.rateLimitHits ?? 0} />
        <MetricTile label="Suspicious imports" value={m.suspiciousImportFailures ?? 0} />
        <MetricTile label="Guest conflicts" value={m.guestClaimConflicts ?? 0} />
      </div>

      {/* Chart */}
      {trends && (
        <TrendChart
          title="Tín hiệu bảo mật"
          subtitle="Failed auth và rate-limit trong 14 ngày"
          days={trends.days}
          lines={[
            { data: trends.security.failedAuth, label: 'Failed auth', color: '#71717a' },
            { data: trends.security.rateLimit, label: 'Rate-limit', color: '#a1a1aa' },
          ]}
        />
      )}

      {/* Security Narrative */}
      <AppCard className="p-4">
        <h3 className="text-sm font-semibold text-white mb-2">Đánh giá</h3>
        {m.failedAuthAttempts === 0 && m.rateLimitHits === 0 ? (
          <p className="text-xs text-zinc-400">Không phát hiện bất thường lớn. Hệ thống vận hành ổn định.</p>
        ) : (
          <p className="text-xs text-zinc-400">
            Có tín hiệu vận hành cần theo dõi. {m.failedAuthAttempts > 0 ? `${m.failedAuthAttempts} lần đăng nhập lỗi gần đây. ` : ''}
            {m.rateLimitHits > 0 ? `${m.rateLimitHits} lần chạm rate-limit.` : ''}
          </p>
        )}
      </AppCard>

      {/* Security Signals */}
      <AppCard className="p-4">
        <h3 className="text-sm font-semibold text-white mb-3">Tín hiệu gần đây</h3>
        <div className="space-y-2">
          {(data.signals || []).slice(0, 15).map((e) => (
            <EventRow key={e.id} event={e} />
          ))}
          {(!data.signals || data.signals.length === 0) && (
            <p className="text-xs text-zinc-500">Không có tín hiệu bảo mật gần đây.</p>
          )}
        </div>
      </AppCard>
    </div>
  );
}
