import {
  AlertTriangle,
  CalendarClock,
  Gauge,
  LineChart,
  RefreshCw,
  Repeat2,
  ShieldCheck,
  TrendingUp,
  WalletCards,
} from 'lucide-react';
import { useForecasts } from '../hooks/useForecasts';
import { formatCurrency } from '../utils/formatters';
import AppButton from '../components/ui/AppButton';
import AppCard from '../components/ui/AppCard';
import EmptyState from '../components/ui/EmptyState';
import PageHeader from '../components/ui/PageHeader';
import StatCard from '../components/ui/StatCard';

const categoryLabels = {
  food: 'Ăn uống',
  drinks: 'Đồ uống',
  transport: 'Di chuyển',
  housing: 'Nhà ở',
  accommodation: 'Lưu trú',
  entertainment: 'Giải trí',
  shopping: 'Mua sắm',
  overall: 'Tổng chi',
  other: 'Khác',
};

const confidenceLabels = {
  high: 'Tin cậy cao',
  medium: 'Tin cậy vừa',
  low: 'Tin cậy thấp',
};

const riskLabels = {
  low: 'Thấp',
  medium: 'Cần theo dõi',
  high: 'Cao',
  unknown: 'Chưa rõ',
};

const trendLabels = {
  up: 'Tăng',
  down: 'Giảm',
  stable: 'Ổn định',
  unknown: 'Chưa rõ',
};

const budgetStatusLabels = {
  safe: 'An toàn',
  watch: 'Theo dõi',
  at_risk: 'Có nguy cơ',
  over: 'Đã vượt',
};

const cadenceLabels = {
  weekly: 'Hàng tuần',
  monthly: 'Hàng tháng',
  irregular: 'Chưa đều',
};

export default function ForecastsPage() {
  const { data, loading, error, refetch } = useForecasts();
  const isSparse = data?.meta?.dataQuality === 'sparse';

  return (
    <main data-testid="forecasts-page" className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        eyebrow="Dự báo"
        title="Dự báo tháng này"
        subtitle="Ước tính deterministic từ dữ liệu chi tiêu hiện có, không dùng AI để bịa khoản chi tương lai."
        actions={<AppButton variant="secondary" icon={RefreshCw} onClick={refetch}>Làm mới</AppButton>}
      />

      {loading && <ForecastSkeleton />}
      {!loading && error && <AppCard className="border border-red-500/20 p-5 text-sm text-red-300">{error}</AppCard>}

      {!loading && data && (
        <div className="space-y-6">
          {isSparse && (
            <EmptyState
              icon={CalendarClock}
              title="Cần thêm dữ liệu để tạo dự báo đáng tin cậy."
              description="Zyra vẫn hiển thị các tín hiệu hiện có, nhưng sẽ không đưa ra kết luận mạnh khi lịch sử chi tiêu còn mỏng."
              color="gray"
              compact
            />
          )}

          <Hero data={data} />

          <section className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(18rem,0.7fr)]">
            <CategoryOutlook items={data.categoryForecasts} />
            <DataQuality data={data} />
          </section>

          <section className="grid gap-4 lg:grid-cols-2">
            <BudgetOutlook items={data.budgetOutlook} />
            <RecurringForecasts items={data.recurringForecasts} />
          </section>

          <EarlyWarnings items={data.earlyWarnings} />
        </div>
      )}
    </main>
  );
}

function Hero({ data }) {
  const { summary } = data;
  const explanation = summary.confidence.level === 'low'
    ? 'Dữ liệu hiện còn ít, nên Zyra chỉ đưa ra dự báo thận trọng.'
    : `Nếu giữ nhịp hiện tại, tháng này có thể kết thúc quanh mức ${formatCurrency(summary.projectedMonthlySpend, true)}.`;

  return (
    <section className="space-y-4">
      <AppCard className="border border-white/5 bg-dark-800 p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-2xl">
            <div className="mb-2 flex items-center gap-2">
              <LineChart className="h-4 w-4 text-blue-300" />
              <h2 className="text-sm font-semibold text-white">Quỹ đạo cuối tháng</h2>
            </div>
            <p className="text-3xl font-bold tracking-tight text-white">{formatCurrency(summary.projectedMonthlySpend, true)}</p>
            <p className="mt-2 text-sm leading-relaxed text-gray-400">{explanation}</p>
          </div>
          <span className={`w-fit rounded-full border px-3 py-1 text-xs font-medium ${confidenceClass(summary.confidence.level)}`}>
            {confidenceLabels[summary.confidence.level]} · {Math.round(summary.confidence.score * 100)}%
          </span>
        </div>
      </AppCard>

      <div className="grid gap-3 md:grid-cols-3">
        <StatCard title="Đã chi tháng này" value={formatCurrency(summary.currentMonthSpend, true)} icon={WalletCards} color="blue" />
        <StatCard title="Trung bình mỗi ngày" value={formatCurrency(summary.dailyAverage, true)} icon={Gauge} color="emerald" />
        <StatCard title="Rủi ro ngân sách" value={riskLabels[summary.projectedBudgetRisk]} icon={ShieldCheck} color={summary.projectedBudgetRisk === 'high' ? 'amber' : 'purple'} />
      </div>
    </section>
  );
}

function CategoryOutlook({ items }) {
  return (
    <AppCard className="border border-white/5 bg-dark-800 p-5">
      <SectionTitle icon={TrendingUp} title="Danh mục cần chú ý" description="Dự phóng theo nhịp chi hiện tại và so sánh với tháng trước." />
      {items.length === 0 ? (
        <EmptyText>Chưa có danh mục đủ dữ liệu để dự báo.</EmptyText>
      ) : (
        <div className="mt-4 space-y-3">
          {items.slice(0, 6).map((item) => (
            <div key={item.category} className="rounded-lg border border-white/5 bg-white/3 p-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-white">{labelCategory(item.category)}</p>
                  <p className="mt-1 text-xs text-gray-500">{item.reason}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-white">{formatCurrency(item.projectedSpend, true)}</p>
                  <p className="text-xs text-gray-500">Hiện tại {formatCurrency(item.currentSpend, true)}</p>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Pill tone={trendTone(item.trend)}>{trendLabels[item.trend]}</Pill>
                <Pill tone={riskTone(item.riskLevel)}>Rủi ro {riskLabels[item.riskLevel]}</Pill>
                <Pill>{Math.round(item.confidence * 100)}% tin cậy</Pill>
              </div>
            </div>
          ))}
        </div>
      )}
    </AppCard>
  );
}

function BudgetOutlook({ items }) {
  return (
    <AppCard className="border border-white/5 bg-dark-800 p-5">
      <SectionTitle icon={ShieldCheck} title="Ngân sách có nguy cơ" description="So sánh hạn mức với chi hiện tại và dự phóng cuối tháng." />
      {items.length === 0 ? (
        <EmptyText>Chưa có ngân sách để đối chiếu rủi ro.</EmptyText>
      ) : (
        <div className="mt-4 space-y-3">
          {items.map((item) => (
            <div key={`${item.category}-${item.budgetAmount}`} className="rounded-lg bg-white/3 px-3 py-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-white">{labelCategory(item.category)}</p>
                  <p className="text-xs text-gray-500">Ngân sách {formatCurrency(item.budgetAmount, true)}</p>
                </div>
                <Pill tone={budgetTone(item.status)}>{budgetStatusLabels[item.status]}</Pill>
              </div>
              <div className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
                <Metric label="Hiện tại" value={formatCurrency(item.currentSpend, true)} />
                <Metric label="Dự phóng" value={formatCurrency(item.projectedSpend, true)} />
              </div>
            </div>
          ))}
        </div>
      )}
    </AppCard>
  );
}

function RecurringForecasts({ items }) {
  return (
    <AppCard className="border border-white/5 bg-dark-800 p-5">
      <SectionTitle icon={Repeat2} title="Khoản chi có thể lặp lại" description="Các mẫu lặp được nhận diện từ lịch sử giao dịch tương tự." />
      {items.length === 0 ? (
        <EmptyText>Chưa thấy khoản chi lặp lại đủ chắc chắn.</EmptyText>
      ) : (
        <div className="mt-4 space-y-3">
          {items.map((item) => (
            <div key={`${item.title}-${item.cadence}`} className="rounded-lg bg-white/3 px-3 py-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-white">{item.title}</p>
                  <p className="mt-1 text-xs text-gray-500">{labelCategory(item.category)} · {item.nextExpectedWindow}</p>
                </div>
                <p className="shrink-0 text-sm font-semibold text-white">{formatCurrency(item.estimatedAmount, true)}</p>
              </div>
              <div className="mt-3 flex gap-2">
                <Pill tone="blue">{cadenceLabels[item.cadence]}</Pill>
                <Pill>{Math.round(item.confidence * 100)}% tin cậy</Pill>
              </div>
            </div>
          ))}
        </div>
      )}
    </AppCard>
  );
}

function EarlyWarnings({ items }) {
  return (
    <AppCard className="border border-white/5 bg-dark-800 p-5">
      <SectionTitle icon={AlertTriangle} title="Cảnh báo sớm" description="Tín hiệu nhẹ để theo dõi trước, không phải kết luận chắc chắn." />
      {items.length === 0 ? (
        <EmptyText>Chưa có cảnh báo sớm đáng chú ý.</EmptyText>
      ) : (
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {items.map((item, index) => (
            <div key={`${item.type}-${index}`} className="rounded-lg border border-white/5 bg-white/3 p-3">
              <div className="mb-2 flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-white">{item.title}</p>
                <Pill tone={warningTone(item.severity)}>{Math.round(item.confidence * 100)}%</Pill>
              </div>
              <p className="text-xs leading-relaxed text-gray-400">{item.message}</p>
            </div>
          ))}
        </div>
      )}
    </AppCard>
  );
}

function DataQuality({ data }) {
  const confidence = data.summary.confidence;
  return (
    <AppCard className="border border-white/5 bg-dark-800 p-5">
      <SectionTitle icon={CalendarClock} title="Chất lượng dữ liệu" description="Vì sao dự báo có thể còn giới hạn." />
      <div className="mt-4 space-y-3">
        <Metric label="Mức tin cậy" value={confidenceLabels[confidence.level]} />
        <Metric label="Điểm tin cậy" value={`${Math.round(confidence.score * 100)}%`} />
        <Metric label="Số tháng phân tích" value={`${data.meta.monthsAnalyzed}`} />
        <Metric label="Độ dày dữ liệu" value={qualityLabel(data.meta.dataQuality)} />
      </div>
      <p className="mt-4 rounded-lg bg-white/3 px-3 py-2 text-xs leading-relaxed text-gray-400">{confidence.reason}</p>
    </AppCard>
  );
}

function ForecastSkeleton() {
  return (
    <div className="space-y-4">
      <AppCard className="h-40 animate-pulse bg-white/5" />
      <div className="grid gap-3 md:grid-cols-3">
        {[0, 1, 2].map((item) => <AppCard key={item} className="h-28 animate-pulse bg-white/5" />)}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {[0, 1].map((item) => <AppCard key={item} className="h-72 animate-pulse bg-white/5" />)}
      </div>
    </div>
  );
}

function SectionTitle({ icon: Icon, title, description }) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="mt-0.5 h-4 w-4 text-blue-300" />
      <div>
        <h2 className="text-sm font-semibold text-white">{title}</h2>
        {description && <p className="mt-1 text-xs leading-relaxed text-gray-500">{description}</p>}
      </div>
    </div>
  );
}

function Metric({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-xs text-gray-500">{label}</span>
      <span className="text-sm font-medium text-white">{value}</span>
    </div>
  );
}

function EmptyText({ children }) {
  return <p className="mt-4 rounded-lg bg-white/3 px-3 py-4 text-center text-sm text-gray-400">{children}</p>;
}

function Pill({ tone = 'gray', children }) {
  const classes = {
    gray: 'border-white/5 bg-white/5 text-gray-400',
    blue: 'border-blue-500/15 bg-blue-500/10 text-blue-300',
    emerald: 'border-emerald-500/15 bg-emerald-500/10 text-emerald-300',
    amber: 'border-amber-500/15 bg-amber-500/10 text-amber-300',
    red: 'border-red-500/15 bg-red-500/10 text-red-300',
  };
  return <span className={`rounded-full border px-2 py-1 text-[11px] font-medium ${classes[tone] || classes.gray}`}>{children}</span>;
}

function labelCategory(category) {
  return categoryLabels[category] ?? category;
}

function confidenceClass(level) {
  return {
    high: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300',
    medium: 'border-amber-500/20 bg-amber-500/10 text-amber-300',
    low: 'border-white/10 bg-white/5 text-gray-400',
  }[level] ?? 'border-white/10 bg-white/5 text-gray-400';
}

function trendTone(trend) {
  if (trend === 'up') return 'amber';
  if (trend === 'down') return 'emerald';
  return 'gray';
}

function riskTone(risk) {
  if (risk === 'high') return 'red';
  if (risk === 'medium') return 'amber';
  return 'emerald';
}

function budgetTone(status) {
  if (status === 'over') return 'red';
  if (status === 'at_risk') return 'amber';
  if (status === 'watch') return 'blue';
  return 'emerald';
}

function warningTone(severity) {
  if (severity === 'high') return 'red';
  if (severity === 'medium') return 'amber';
  return 'blue';
}

function qualityLabel(quality) {
  return {
    sparse: 'Còn ít',
    limited: 'Giới hạn',
    usable: 'Có thể dùng',
    strong: 'Khá tốt',
  }[quality] ?? 'Chưa rõ';
}
