import { useMemo } from 'react';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area,
} from 'recharts';
import { LockKeyhole } from 'lucide-react';
import AppCard from '../../components/ui/AppCard';

export default function AdminOverviewTab({ data, trends, loading }) {
  const primaryMetrics = useMemo(() => {
    const m = data?.overview?.metrics || {};
    return [
      { label: 'Người dùng', value: m.totalUsers ?? 0 },
      { label: 'Phòng hoạt động', value: m.activeRooms ?? 0 },
      { label: 'Chi phí hôm nay', value: m.expensesCreatedToday ?? 0 },
      { label: 'Nhập hôm nay', value: m.importsToday ?? 0 },
      { label: 'AI parse hôm nay', value: m.aiParsesToday ?? 0 },
      { label: 'Rate-limit', value: m.rateLimitHits ?? 0 },
    ];
  }, [data]);

  if (loading || !data) {
    return (
      <div className="grid gap-3 md:grid-cols-3">
        {[0, 1, 2].map(i => (
          <div key={i} className="h-28 animate-pulse rounded-xl border border-white/5 bg-white/[0.03]" />
        ))}
      </div>
    );
  }

  const narrative = data.overview?.narrative || [];
  const anomalies = data.overview?.recentAnomalies || [];

  return (
    <div className="space-y-5">
      {/* Narrative + Primary Metrics */}
      <AppCard className="p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-white">
              <LockKeyhole className="h-4 w-4 text-zinc-300" />
              Trạng thái vận hành
            </div>
            <div className="mt-3 space-y-1.5">
              {narrative.map((line) => (
                <p key={line} className="text-sm text-zinc-300">{line}</p>
              ))}
            </div>
          </div>
          <div className="grid min-w-0 gap-2 sm:grid-cols-3 lg:w-[520px]">
            {primaryMetrics.map((m) => (
              <MetricTile key={m.label} label={m.label} value={m.value} />
            ))}
          </div>
        </div>
      </AppCard>

      {/* Mini Charts Row */}
      {trends && (
        <div className="grid gap-4 lg:grid-cols-2">
          <TrendChart
            title="Hoạt động gần đây"
            subtitle="Chi phí và phòng mới trong 14 ngày"
            days={trends.days}
            lines={[
              { data: trends.activity.expenses, label: 'Chi phí', color: '#71717a' },
              { data: trends.activity.rooms, label: 'Phòng mới', color: '#52525b' },
            ]}
          />
          <TrendChart
            title="AI Parser"
            subtitle="Lượt sử dụng parser và fallback"
            days={trends.days}
            lines={[
              { data: trends.ai.parser, label: 'Parser', color: '#71717a' },
              { data: trends.ai.fallback, label: 'Fallback', color: '#a1a1aa' },
            ]}
          />
        </div>
      )}

      {/* Section Grid */}
      <div className="grid gap-4 lg:grid-cols-5">
        {['systemHealth', 'aiActivity', 'importActivity', 'roomActivity', 'securitySignals'].map((key) => {
          const items = data.overview?.sections?.[key] || [];
          return (
            <AppCard key={key} className="p-4">
              <h3 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                {sectionLabels[key]}
              </h3>
              <div className="mt-3 space-y-3">
                {items.map((item) => (
                  <div key={item.label} className="border-t border-white/5 pt-3 first:border-t-0 first:pt-0">
                    <div className="flex items-baseline justify-between gap-3">
                      <p className="text-xs text-zinc-500">{item.label}</p>
                      <p className="text-sm font-semibold text-zinc-100">{item.value}</p>
                    </div>
                    <p className="mt-1 text-[11px] leading-relaxed text-zinc-500">{item.help}</p>
                  </div>
                ))}
              </div>
            </AppCard>
          );
        })}
      </div>

      {/* Anomalies */}
      <AppCard className="p-4">
        <h3 className="text-sm font-semibold text-white">Bất thường gần đây</h3>
        <div className="mt-3 space-y-2">
          {anomalies.length === 0 && (
            <p className="text-xs text-zinc-500">Không phát hiện bất thường lớn gần đây.</p>
          )}
          {anomalies.map((e) => (
            <EventRow key={e.id} event={e} />
          ))}
        </div>
      </AppCard>
    </div>
  );
}

// ── Shared Components ────────────────────────────────────────────────────────

export function MetricTile({ label, value }) {
  return (
    <div className="rounded-lg border border-white/5 bg-white/[0.03] px-3 py-2">
      <p className="text-[11px] text-zinc-500">{label}</p>
      <p className="mt-1 text-base font-semibold text-white">{value}</p>
    </div>
  );
}

export function EventRow({ event }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2">
      <div className="min-w-0">
        <p className="truncate text-xs font-medium text-zinc-200">{event.type}</p>
        <p className="truncate text-[11px] text-zinc-500">
          {event.roomId ? `room ${event.roomId.slice(0, 8)}…` : event.source} · {formatDate(event.createdAt)}
        </p>
      </div>
      <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] ${severityClass(event.severity)}`}>
        {event.severity}
      </span>
    </div>
  );
}

export function TrendChart({ title, subtitle, days, lines }) {
  const chartData = days.map((day, i) => {
    const point = { day };
    lines.forEach(l => { point[l.label] = l.data[i] || 0; });
    return point;
  });

  return (
    <AppCard className="p-4">
      <h3 className="text-sm font-semibold text-white">{title}</h3>
      {subtitle && <p className="mt-0.5 text-[11px] text-zinc-500">{subtitle}</p>}
      <div className="mt-3 h-32">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
            <XAxis
              dataKey="day"
              tick={{ fontSize: 10, fill: '#52525b' }}
              axisLine={false}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fontSize: 10, fill: '#52525b' }}
              axisLine={false}
              tickLine={false}
              allowDecimals={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#18181b',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 8,
                fontSize: 11,
                color: '#e4e4e7',
              }}
            />
            {lines.map(l => (
              <Area
                key={l.label}
                type="monotone"
                dataKey={l.label}
                stroke={l.color}
                fill={l.color}
                fillOpacity={0.08}
                strokeWidth={1.5}
                dot={false}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </AppCard>
  );
}

export function StatusBadge({ status, labels = {} }) {
  const statusColors = {
    active: 'border-emerald-400/20 bg-emerald-400/5 text-emerald-200',
    suspended: 'border-rose-400/20 bg-rose-400/5 text-rose-200',
    archived: 'border-zinc-400/20 bg-zinc-400/10 text-zinc-300',
    admin: 'border-violet-400/20 bg-violet-400/5 text-violet-200',
    member: 'border-zinc-400/20 bg-zinc-400/5 text-zinc-300',
    pending: 'border-amber-400/20 bg-amber-400/5 text-amber-200',
  };
  return (
    <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-medium ${statusColors[status] || statusColors.member}`}>
      {labels[status] || status}
    </span>
  );
}

export function formatDate(value) {
  if (!value) return 'không rõ';
  return new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value));
}

function severityClass(severity) {
  if (severity === 'error') return 'border-rose-300/20 bg-rose-300/5 text-rose-100';
  if (severity === 'warning') return 'border-amber-300/20 bg-amber-300/5 text-amber-100';
  return 'border-zinc-300/10 bg-zinc-300/5 text-zinc-300';
}

const sectionLabels = {
  systemHealth: 'Hệ thống',
  aiActivity: 'AI',
  importActivity: 'Nhập dữ liệu',
  roomActivity: 'Nhóm',
  securitySignals: 'Bảo mật',
};
