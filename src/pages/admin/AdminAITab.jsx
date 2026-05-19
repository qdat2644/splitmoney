import AppCard from '../../components/ui/AppCard';
import { MetricTile, EventRow, TrendChart } from './AdminOverviewTab';

export default function AdminAITab({ data, trends, loading }) {
  if (loading || !data) {
    return (
      <div className="space-y-3">
        {[0, 1].map(i => <div key={i} className="h-28 animate-pulse rounded-xl border border-white/5 bg-white/[0.03]" />)}
      </div>
    );
  }

  const m = data.metrics || {};
  const profile = data.profileHealth || {};

  return (
    <div className="space-y-5">
      {/* Metrics */}
      <div className="grid gap-2 sm:grid-cols-4">
        <MetricTile label="Parser usage" value={m.parserUsage ?? 0} />
        <MetricTile label="Parser failure rate" value={`${Math.round((m.parserFailureRate || 0) * 100)}%`} />
        <MetricTile label="Fallback usage" value={m.fallbackUsage ?? 0} />
        <MetricTile label="AI adoption" value={m.aiFeatureAdoption ?? 0} />
      </div>

      {/* Charts */}
      {trends && (
        <TrendChart
          title="AI Parser & Fallback"
          subtitle="Lượt sử dụng parser AI và fallback engine trong 14 ngày"
          days={trends.days}
          lines={[
            { data: trends.ai.parser, label: 'Parser', color: '#71717a' },
            { data: trends.ai.fallback, label: 'Fallback', color: '#a1a1aa' },
          ]}
        />
      )}

      {/* Profile Health */}
      <AppCard className="p-4">
        <h3 className="text-sm font-semibold text-white mb-3">Temporal Profile Health</h3>
        <div className="grid gap-2 sm:grid-cols-3">
          <MetricTile label="Tổng profiles" value={profile.total ?? 0} />
          <MetricTile label="Temporal memory sẵn sàng" value={profile.available ?? 0} />
          <MetricTile label="Low confidence" value={profile.lowConfidence ?? 0} />
        </div>
        {profile.total > 0 && profile.lowConfidence > 0 && (
          <p className="mt-3 text-xs text-zinc-400">
            Một số hồ sơ AI còn thiếu dữ liệu theo thời gian. Chúng sẽ tự cải thiện khi người dùng hoạt động thêm.
          </p>
        )}
        {profile.total > 0 && profile.lowConfidence === 0 && (
          <p className="mt-3 text-xs text-zinc-400">
            Phần lớn hồ sơ AI đã có đủ dữ liệu vận hành.
          </p>
        )}
      </AppCard>

      {/* Recent Activity */}
      <AppCard className="p-4">
        <h3 className="text-sm font-semibold text-white mb-3">Hoạt động AI gần đây</h3>
        <div className="space-y-2">
          {(data.recentActivity || []).slice(0, 10).map((e) => (
            <EventRow key={e.id} event={e} />
          ))}
          {(!data.recentActivity || data.recentActivity.length === 0) && (
            <p className="text-xs text-zinc-500">Chưa có hoạt động AI gần đây.</p>
          )}
        </div>
      </AppCard>
    </div>
  );
}
