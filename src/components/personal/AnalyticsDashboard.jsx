import { motion } from 'framer-motion';
import { Activity, AlertTriangle, CalendarClock, Gauge, RefreshCw, Repeat2, WalletCards } from 'lucide-react';
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from 'recharts';
import { useDashboardAnalytics } from '../../hooks/useDashboardAnalytics';
import { formatCurrency } from '../../utils/formatters';

function MetricCard({ label, value, meta, tone = 'blue' }) {
  const toneClass = {
    blue: 'text-blue-300',
    emerald: 'text-emerald-300',
    amber: 'text-amber-300',
    red: 'text-red-300',
  }[tone];
  return (
    <div className="glass-card border border-white/5 p-4">
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`mt-1 text-xl font-bold ${toneClass}`}>{value}</p>
      {meta && <p className="mt-1 text-xs text-gray-500">{meta}</p>}
    </div>
  );
}

function EmptyBlock({ children }) {
  return <p className="py-4 text-center text-xs text-gray-500">{children}</p>;
}

function TrendTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-card border border-white/10 px-3 py-2 text-xs">
      <p className="text-gray-400">{label}</p>
      <p className="font-semibold text-white">{formatCurrency(payload[0].value, true)}</p>
    </div>
  );
}

export default function AnalyticsDashboard() {
  const { data, loading, error, refetch } = useDashboardAnalytics();

  if (loading) {
    return (
      <div className="glass-card border border-white/5 p-5 animate-pulse">
        <div className="h-4 w-36 rounded bg-white/5" />
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((item) => <div key={item} className="h-24 rounded-xl bg-white/5" />)}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass-card border border-red-500/20 p-5">
        <div className="flex items-center justify-between">
          <p className="text-sm text-red-300">{error}</p>
          <button onClick={refetch} className="btn-secondary text-xs flex items-center gap-1.5">
            <RefreshCw className="h-3.5 w-3.5" /> Thử lại
          </button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { forecast, spendingVelocity, debtHealth, budgetHealth } = data;

  return (
    <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-white">Phân tích nâng cao</h2>
          <p className="text-xs text-gray-500">Dự báo, nhịp chi tiêu, khoản lặp lại và bất thường</p>
        </div>
        <button onClick={refetch} className="btn-icon text-gray-500 hover:text-gray-300" title="Làm mới">
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Dự báo cuối tháng" value={formatCurrency(forecast.forecastMonthTotal, true)} meta={`Tin cậy ${Math.round((forecast.confidence || 0) * 100)}%`} />
        <MetricCard label="Tốc độ chi/ngày" value={formatCurrency(spendingVelocity.dailyAverage || 0, true)} meta={`Đã qua ${spendingVelocity.daysElapsed || 0}/${spendingVelocity.daysInMonth || 0} ngày`} tone="emerald" />
        <MetricCard label="Ngân sách có rủi ro" value={budgetHealth.atRiskCount ?? 0} meta={`${budgetHealth.overBudgetCount ?? 0} đã vượt`} tone={budgetHealth.overBudgetCount ? 'red' : budgetHealth.atRiskCount ? 'amber' : 'emerald'} />
        <MetricCard label="Xu hướng nợ" value={debtHealth.direction === 'improving' ? 'Cải thiện' : debtHealth.direction === 'worsening' ? 'Xấu đi' : 'Ổn định'} meta={formatCurrency(debtHealth.currentNetBalance || 0, true)} tone={debtHealth.direction === 'worsening' ? 'red' : debtHealth.direction === 'improving' ? 'emerald' : 'blue'} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="glass-card border border-white/5 p-5 lg:col-span-2">
          <div className="mb-4 flex items-center gap-2">
            <Activity className="h-4 w-4 text-blue-400" />
            <h3 className="text-sm font-semibold text-white">Xu hướng chi tiêu 12 tháng</h3>
          </div>
          {data.monthlyTrend.length === 0 ? (
            <EmptyBlock>Chưa có dữ liệu xu hướng.</EmptyBlock>
          ) : (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.monthlyTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="month" tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} width={42} tickFormatter={(value) => value >= 1000000 ? `${(value / 1000000).toFixed(1)}M` : `${Math.round(value / 1000)}k`} />
                  <Tooltip content={<TrendTooltip />} />
                  <Line type="monotone" dataKey="amount" stroke="#60a5fa" strokeWidth={2.5} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="glass-card border border-white/5 p-5">
            <div className="mb-3 flex items-center gap-2">
              <CalendarClock className="h-4 w-4 text-amber-400" />
              <h3 className="text-sm font-semibold text-white">Rủi ro ngân sách</h3>
            </div>
            {forecast.riskCategories.length === 0 ? <EmptyBlock>Chưa thấy danh mục có nguy cơ vượt hạn.</EmptyBlock> : (
              <div className="space-y-2">
                {forecast.riskCategories.slice(0, 4).map((item) => (
                  <div key={item.category} className="flex items-center justify-between gap-2 text-xs">
                    <span className="text-gray-300">{item.category}</span>
                    <span className="text-amber-300">{formatCurrency(item.forecastAmount, true)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="glass-card border border-white/5 p-5">
            <div className="mb-3 flex items-center gap-2">
              <Gauge className="h-4 w-4 text-emerald-400" />
              <h3 className="text-sm font-semibold text-white">Top danh mục</h3>
            </div>
            {data.topCategories.length === 0 ? <EmptyBlock>Chưa có dữ liệu danh mục.</EmptyBlock> : (
              <div className="space-y-2">
                {data.topCategories.map((item) => (
                  <div key={item.category} className="flex items-center justify-between text-xs">
                    <span className="text-gray-300">{item.category}</span>
                    <span className="text-white">{formatCurrency(item.amount, true)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="glass-card border border-white/5 p-5">
          <div className="mb-3 flex items-center gap-2">
            <Repeat2 className="h-4 w-4 text-purple-400" />
            <h3 className="text-sm font-semibold text-white">Khoản chi lặp lại</h3>
          </div>
          {data.recurringCandidates.length === 0 ? <EmptyBlock>Chưa có mẫu lặp đủ chắc chắn.</EmptyBlock> : (
            <div className="space-y-2">
              {data.recurringCandidates.map((item) => (
                <div key={`${item.title}-${item.frequency}`} className="flex items-center justify-between gap-3 rounded-lg bg-white/3 px-3 py-2 text-xs">
                  <div className="min-w-0">
                    <p className="truncate text-white">{item.title}</p>
                    <p className="text-gray-500">{item.frequency} · {Math.round(item.confidence * 100)}%</p>
                  </div>
                  <span className="shrink-0 text-purple-300">{formatCurrency(item.estimatedAmount, true)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="glass-card border border-white/5 p-5">
          <div className="mb-3 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-red-400" />
            <h3 className="text-sm font-semibold text-white">Bất thường</h3>
          </div>
          {data.anomalies.length === 0 ? <EmptyBlock>Chưa phát hiện bất thường đáng kể.</EmptyBlock> : (
            <div className="space-y-2">
              {data.anomalies.map((item, index) => (
                <div key={`${item.type}-${index}`} className="rounded-lg border border-white/5 bg-white/3 px-3 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-medium text-white">{item.title}</p>
                    <span className={`text-[10px] ${item.severity === 'warning' ? 'text-red-300' : 'text-blue-300'}`}>{Math.round(item.confidence * 100)}%</span>
                  </div>
                  <p className="mt-1 text-xs text-gray-400">{item.message}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="glass-card border border-white/5 p-5">
        <div className="mb-3 flex items-center gap-2">
          <WalletCards className="h-4 w-4 text-cyan-400" />
          <h3 className="text-sm font-semibold text-white">Giả định dự báo</h3>
        </div>
        <div className="grid gap-2 md:grid-cols-3">
          {forecast.assumptions.map((item) => (
            <p key={item} className="rounded-lg bg-white/3 px-3 py-2 text-xs text-gray-400">{item}</p>
          ))}
        </div>
      </div>
    </motion.section>
  );
}
