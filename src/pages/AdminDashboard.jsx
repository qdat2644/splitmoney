import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  Brain,
  Building2,
  LockKeyhole,
  RefreshCw,
  Search,
  Shield,
  UploadCloud,
  Users,
} from 'lucide-react';
import AppCard from '../components/ui/AppCard';
import PageHeader from '../components/ui/PageHeader';
import { adminApi } from '../services/apiClient';

const sections = [
  { key: 'systemHealth', title: 'Hệ thống', icon: Activity },
  { key: 'aiActivity', title: 'AI', icon: Brain },
  { key: 'importActivity', title: 'Nhập dữ liệu', icon: UploadCloud },
  { key: 'roomActivity', title: 'Nhóm', icon: Users },
  { key: 'securitySignals', title: 'Bảo mật', icon: Shield },
];

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [supportType, setSupportType] = useState('room');
  const [supportId, setSupportId] = useState('');
  const [supportResult, setSupportResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [supportLoading, setSupportLoading] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [overview, imports, ai, security] = await Promise.all([
        adminApi.getOverview(),
        adminApi.getImports(),
        adminApi.getAi(),
        adminApi.getSecurity(),
      ]);
      setData({ overview, imports, ai, security });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const primaryMetrics = useMemo(() => {
    const metrics = data?.overview?.metrics || {};
    return [
      { label: 'Người dùng', value: metrics.totalUsers },
      { label: 'Phòng hoạt động', value: metrics.activeRooms },
      { label: 'Chi phí hôm nay', value: metrics.expensesCreatedToday },
      { label: 'Nhập hôm nay', value: metrics.importsToday },
      { label: 'AI parse hôm nay', value: metrics.aiParsesToday },
      { label: 'Rate-limit', value: metrics.rateLimitHits },
    ];
  }, [data]);

  const inspectSupport = async () => {
    if (!supportId.trim()) return;
    setSupportLoading(true);
    setSupportResult(null);
    try {
      const result = supportType === 'room'
        ? await adminApi.getRoom(supportId.trim())
        : await adminApi.getUser(supportId.trim());
      setSupportResult(result.room || result.user);
    } catch (err) {
      setSupportResult({ error: err.message });
    } finally {
      setSupportLoading(false);
    }
  };

  return (
    <main className="mx-auto max-w-6xl space-y-5">
      <PageHeader
        eyebrow="Zyra / Admin operations"
        title="Bảng điều hành vận hành"
        subtitle="Theo dõi hệ thống, AI, nhập dữ liệu, nhóm và tín hiệu bảo mật ở mức tổng hợp."
        actions={(
          <button
            type="button"
            onClick={load}
            className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-medium text-zinc-200 hover:bg-white/[0.07]"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Làm mới
          </button>
        )}
      />

      {error && (
        <div className="rounded-lg border border-amber-400/20 bg-amber-400/5 px-4 py-3 text-sm text-amber-100">
          {error}
        </div>
      )}

      {loading ? (
        <div className="grid gap-3 md:grid-cols-3">
          {[0, 1, 2].map((item) => (
            <div key={item} className="h-28 animate-pulse rounded-xl border border-white/5 bg-white/[0.03]" />
          ))}
        </div>
      ) : data && (
        <>
          <AppCard className="p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="flex items-center gap-2 text-sm font-semibold text-white">
                  <LockKeyhole className="h-4 w-4 text-zinc-300" />
                  Trạng thái vận hành
                </div>
                <div className="mt-3 space-y-1.5">
                  {data.overview.narrative?.map((line) => (
                    <p key={line} className="text-sm text-zinc-300">{line}</p>
                  ))}
                </div>
              </div>
              <div className="grid min-w-0 gap-2 sm:grid-cols-3 lg:w-[520px]">
                {primaryMetrics.map((metric) => (
                  <MetricTile key={metric.label} label={metric.label} value={metric.value ?? 0} />
                ))}
              </div>
            </div>
          </AppCard>

          <div className="grid gap-4 lg:grid-cols-5">
            {sections.map((section) => (
              <OperationalSection
                key={section.key}
                title={section.title}
                icon={section.icon}
                items={data.overview.sections?.[section.key] || []}
              />
            ))}
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <SignalPanel
              title="Quan sát AI"
              icon={Brain}
              metrics={[
                ['Parser usage', data.ai.metrics.parserUsage],
                ['Parser failure', percent(data.ai.metrics.parserFailureRate)],
                ['Fallback usage', data.ai.metrics.fallbackUsage],
                ['Adoption', data.ai.metrics.aiFeatureAdoption],
              ]}
              events={data.ai.recentActivity}
            />
            <SignalPanel
              title="Quan sát nhập dữ liệu"
              icon={UploadCloud}
              metrics={[
                ['Imports today', data.imports.metrics.importsToday],
                ['Failed imports', data.imports.metrics.failedImports],
                ['Warning rate', percent(data.imports.metrics.warningRate)],
                ['Unresolved mappings', data.imports.metrics.unresolvedMappings],
              ]}
              events={data.imports.recentImports}
            />
            <SignalPanel
              title="Bảo mật"
              icon={Shield}
              metrics={[
                ['Failed auth', data.security.metrics.failedAuthAttempts],
                ['Denied room access', data.security.metrics.deniedCrossRoomMutations],
                ['Rate-limit hits', data.security.metrics.rateLimitHits],
                ['Guest conflicts', data.security.metrics.guestClaimConflicts],
              ]}
              events={data.security.signals}
            />
          </div>

          <SupportInspector
            supportType={supportType}
            setSupportType={setSupportType}
            supportId={supportId}
            setSupportId={setSupportId}
            loading={supportLoading}
            onInspect={inspectSupport}
            result={supportResult}
          />

          <RecentAnomalies events={data.overview.recentAnomalies} />
        </>
      )}
    </main>
  );
}

function OperationalSection({ title, icon: Icon, items }) {
  return (
    <AppCard className="p-4">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-zinc-300" />
        <h2 className="text-sm font-semibold text-white">{title}</h2>
      </div>
      <div className="mt-4 space-y-3">
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
}

function MetricTile({ label, value }) {
  return (
    <div className="rounded-lg border border-white/5 bg-white/[0.03] px-3 py-2">
      <p className="text-[11px] text-zinc-500">{label}</p>
      <p className="mt-1 text-base font-semibold text-white">{value}</p>
    </div>
  );
}

function SignalPanel({ title, icon: Icon, metrics, events }) {
  return (
    <AppCard className="p-4">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-zinc-300" />
        <h2 className="text-sm font-semibold text-white">{title}</h2>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2">
        {metrics.map(([label, value]) => (
          <MetricTile key={label} label={label} value={value ?? 0} />
        ))}
      </div>
      <div className="mt-4 space-y-2">
        {(events || []).slice(0, 5).map((event) => (
          <EventRow key={event.id} event={event} />
        ))}
        {(!events || events.length === 0) && <p className="text-xs text-zinc-500">Chưa có tín hiệu gần đây.</p>}
      </div>
    </AppCard>
  );
}

function SupportInspector({ supportType, setSupportType, supportId, setSupportId, loading, onInspect, result }) {
  return (
    <AppCard className="p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-zinc-300" />
            <h2 className="text-sm font-semibold text-white">Hỗ trợ read-only</h2>
          </div>
          <p className="mt-2 max-w-2xl text-xs leading-relaxed text-zinc-500">
            Kiểm tra nhanh trạng thái phòng hoặc người dùng bằng ID. Khu vực này chỉ hiển thị dữ liệu hỗ trợ đã tóm tắt.
          </p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:flex-row lg:w-auto">
          <select
            value={supportType}
            onChange={(event) => setSupportType(event.target.value)}
            className="rounded-lg border border-white/10 bg-dark-800 px-3 py-2 text-xs text-zinc-200 outline-none"
          >
            <option value="room">Phòng</option>
            <option value="user">Người dùng</option>
          </select>
          <input
            value={supportId}
            onChange={(event) => setSupportId(event.target.value)}
            onKeyDown={(event) => event.key === 'Enter' && onInspect()}
            placeholder={supportType === 'room' ? 'roomId' : 'userId'}
            className="min-w-0 rounded-lg border border-white/10 bg-dark-800 px-3 py-2 text-xs text-zinc-200 outline-none placeholder:text-zinc-600 sm:w-72"
          />
          <button
            type="button"
            onClick={onInspect}
            disabled={loading || !supportId.trim()}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-medium text-zinc-200 hover:bg-white/[0.07] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Search className="h-3.5 w-3.5" />
            Kiểm tra
          </button>
        </div>
      </div>

      {result && (
        <div className="mt-5 rounded-lg border border-white/5 bg-white/[0.025] p-4">
          {result.error ? (
            <p className="text-sm text-amber-100">{result.error}</p>
          ) : (
            <SupportResult result={result} />
          )}
        </div>
      )}
    </AppCard>
  );
}

function SupportResult({ result }) {
  const counts = result.counts || {};
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-white">{result.name || result.id}</p>
          <p className="text-xs text-zinc-500">{result.email || result.code || result.role || 'Hồ sơ hỗ trợ'}</p>
        </div>
        <p className="text-xs text-zinc-500">Cập nhật {formatDate(result.updatedAt || result.createdAt)}</p>
      </div>
      <div className="grid gap-2 sm:grid-cols-4">
        {Object.entries(counts).slice(0, 8).map(([key, value]) => (
          <MetricTile key={key} label={labelize(key)} value={value} />
        ))}
      </div>
      {result.aiProfileStatus && (
        <div className="rounded-lg border border-white/5 bg-dark-900/40 p-3 text-xs text-zinc-400">
          Temporal memory: {String(result.temporalMemoryAvailable ?? result.aiProfileStatus.temporalMemoryAvailable)}
          {result.aiProfileStatus.temporalConfidence !== null && result.aiProfileStatus.temporalConfidence !== undefined
            ? ` / confidence ${result.aiProfileStatus.temporalConfidence}`
            : ''}
        </div>
      )}
    </div>
  );
}

function RecentAnomalies({ events }) {
  return (
    <AppCard className="p-4">
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 text-zinc-300" />
        <h2 className="text-sm font-semibold text-white">Bất thường gần đây</h2>
      </div>
      <div className="mt-4 space-y-2">
        {(events || []).map((event) => <EventRow key={event.id} event={event} />)}
        {(!events || events.length === 0) && <p className="text-xs text-zinc-500">Không phát hiện bất thường lớn gần đây.</p>}
      </div>
    </AppCard>
  );
}

function EventRow({ event }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2">
      <div className="min-w-0">
        <p className="truncate text-xs font-medium text-zinc-200">{event.type}</p>
        <p className="truncate text-[11px] text-zinc-500">
          {event.roomId ? `room ${event.roomId}` : event.source} · {formatDate(event.createdAt)}
        </p>
      </div>
      <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] ${severityClass(event.severity)}`}>
        {event.severity}
      </span>
    </div>
  );
}

function percent(value) {
  return `${Math.round(Number(value || 0) * 100)}%`;
}

function formatDate(value) {
  if (!value) return 'không rõ';
  return new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value));
}

function labelize(value) {
  return value.replace(/([A-Z])/g, ' $1').toLowerCase();
}

function severityClass(severity) {
  if (severity === 'error') return 'border-rose-300/20 bg-rose-300/5 text-rose-100';
  if (severity === 'warning') return 'border-amber-300/20 bg-amber-300/5 text-amber-100';
  return 'border-zinc-300/10 bg-zinc-300/5 text-zinc-300';
}
