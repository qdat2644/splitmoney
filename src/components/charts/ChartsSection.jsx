// ChartsSection.jsx — Analytics charts using Recharts
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line, Area, AreaChart
} from 'recharts';
import { useApp } from '../../context/AppContext';
import { CATEGORIES, MEMBER_COLORS } from '../../data/mockData';
import { formatCurrency, formatDate } from '../../utils/formatters';

const PALETTE = ['#3b82f6', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#ec4899'];

const CustomTooltip = ({ active, payload, label, isCurrency = true }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-card px-3 py-2 text-xs">
      <p className="text-gray-400 mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }} className="font-semibold">
          {isCurrency ? formatCurrency(p.value) : p.value}
        </p>
      ))}
    </div>
  );
};

// ─── Expense by Person Bar Chart ─────────────────────────────────────────────
export function ExpenseByPersonChart() {
  const { stats, members } = useApp();
  const data = stats.perMember.map((m) => ({
    name: m.name,
    paid: m.paid,
    share: Math.max(0, -m.balance),
    color: PALETTE[m.colorIndex % PALETTE.length],
  }));

  return (
    <div className="h-56">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} barSize={28}>
          <CartesianGrid vertical={false} />
          <XAxis dataKey="name" tick={{ fontSize: 12 }} />
          <YAxis tickFormatter={(v) => formatCurrency(v, true)} tick={{ fontSize: 11 }} />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="paid" name="Đã trả" radius={[6, 6, 0, 0]}>
            {data.map((entry, i) => (
              <Cell key={i} fill={entry.color} fillOpacity={0.85} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── Expense by Category Pie ──────────────────────────────────────────────────
export function CategoryPieChart() {
  const { stats } = useApp();
  const data = Object.entries(stats.byCategory)
    .map(([catId, amount]) => {
      const cat = CATEGORIES.find((c) => c.id === catId) || CATEGORIES[CATEGORIES.length - 1];
      return { name: cat.label, value: amount, icon: cat.icon };
    })
    .filter((d) => d.value > 0)
    .sort((a, b) => b.value - a.value);

  const renderLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, icon }) => {
    const RADIAN = Math.PI / 180;
    const r = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + r * Math.cos(-midAngle * RADIAN);
    const y = cy + r * Math.sin(-midAngle * RADIAN);
    return (
      <text x={x} y={y} textAnchor="middle" dominantBaseline="central" fontSize="16">
        {icon}
      </text>
    );
  };

  return (
    <div className="h-56">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={45}
            outerRadius={80}
            paddingAngle={3}
            dataKey="value"
            labelLine={false}
            label={renderLabel}
          >
            {data.map((_, i) => (
              <Cell key={i} fill={PALETTE[i % PALETTE.length]} fillOpacity={0.85} />
            ))}
          </Pie>
          <Tooltip formatter={(v) => formatCurrency(v)} />
          <Legend
            formatter={(value) => <span style={{ color: '#9ca3af', fontSize: 11 }}>{value}</span>}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── Expense Over Time Area Chart ─────────────────────────────────────────────
export function ExpenseTimelineChart() {
  const { stats } = useApp();

  const data = Object.entries(stats.byDate)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, amount]) => ({
      date: formatDate(date, { day: '2-digit', month: '2-digit' }),
      amount,
    }));

  return (
    <div className="h-56">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <defs>
            <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} />
          <XAxis dataKey="date" tick={{ fontSize: 11 }} />
          <YAxis tickFormatter={(v) => formatCurrency(v, true)} tick={{ fontSize: 11 }} />
          <Tooltip content={<CustomTooltip label="Ngày" />} />
          <Area
            type="monotone"
            dataKey="amount"
            name="Chi tiêu"
            stroke="#3b82f6"
            strokeWidth={2}
            fill="url(#areaGrad)"
            dot={{ r: 3, fill: '#3b82f6' }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
