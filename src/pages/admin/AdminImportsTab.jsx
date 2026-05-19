import AppCard from '../../components/ui/AppCard';
import { MetricTile, EventRow, TrendChart } from './AdminOverviewTab';

export default function AdminImportsTab({ data, trends, loading }) {
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
      <div className="grid gap-2 sm:grid-cols-4">
        <MetricTile label="Imports hôm nay" value={m.importsToday ?? 0} />
        <MetricTile label="Failed imports" value={m.failedImports ?? 0} />
        <MetricTile label="Warning rate" value={`${Math.round((m.warningRate || 0) * 100)}%`} />
        <MetricTile label="Avg confidence" value={m.averageConfidence ?? '—'} />
      </div>

      {/* Chart */}
      {trends && (
        <TrendChart
          title="Import Activity"
          subtitle="Tổng import, warning, và failed trong 14 ngày"
          days={trends.days}
          lines={[
            { data: trends.imports.total, label: 'Total', color: '#71717a' },
            { data: trends.imports.warning, label: 'Warning', color: '#a1a1aa' },
            { data: trends.imports.failed, label: 'Failed', color: '#78716c' },
          ]}
        />
      )}

      {/* Additional Metrics */}
      <div className="grid gap-2 sm:grid-cols-3">
        <MetricTile label="Warning-heavy imports" value={m.warningHeavyImports ?? 0} />
        <MetricTile label="Unresolved mappings" value={m.unresolvedMappings ?? 0} />
        <MetricTile label="Total rows processed" value={m.totalRows ?? 0} />
      </div>

      {/* Warning-heavy imports */}
      {data.warningHeavyImports?.length > 0 && (
        <AppCard className="p-4">
          <h3 className="text-sm font-semibold text-white mb-3">Import cảnh báo nhiều</h3>
          <div className="space-y-2">
            {data.warningHeavyImports.map((e) => <EventRow key={e.id} event={e} />)}
          </div>
        </AppCard>
      )}

      {/* Failed imports */}
      {data.failedImports?.length > 0 && (
        <AppCard className="p-4">
          <h3 className="text-sm font-semibold text-white mb-3">Import thất bại</h3>
          <div className="space-y-2">
            {data.failedImports.map((e) => <EventRow key={e.id} event={e} />)}
          </div>
        </AppCard>
      )}

      {/* Recent Imports */}
      <AppCard className="p-4">
        <h3 className="text-sm font-semibold text-white mb-3">Import gần đây</h3>
        <div className="space-y-2">
          {(data.recentImports || []).slice(0, 10).map((e) => (
            <EventRow key={e.id} event={e} />
          ))}
          {(!data.recentImports || data.recentImports.length === 0) && (
            <p className="text-xs text-zinc-500">Import gần đây hoạt động ổn định.</p>
          )}
        </div>
      </AppCard>
    </div>
  );
}
