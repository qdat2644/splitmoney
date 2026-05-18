import AppCard from './AppCard';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

export default function StatCard({ 
  title, 
  value, 
  icon: Icon, 
  trend, 
  color = 'blue',
  subtitle,
  className = ''
}) {
  const colorMap = {
    blue: { iconBg: 'bg-dark-900 border border-white/5', iconColor: 'text-blue-400' },
    emerald: { iconBg: 'bg-dark-900 border border-white/5', iconColor: 'text-emerald-400' },
    purple: { iconBg: 'bg-dark-900 border border-white/5', iconColor: 'text-purple-400' },
    amber: { iconBg: 'bg-dark-900 border border-white/5', iconColor: 'text-amber-400' },
  };

  const scheme = colorMap[color] || colorMap.blue;

  return (
    <AppCard className={`p-4 flex flex-col justify-between ${className}`} hover>
      <div className="flex items-center justify-between mb-3">
        <div className={`w-8 h-8 rounded flex items-center justify-center ${scheme.iconBg}`}>
          {Icon && <Icon className={`w-4 h-4 ${scheme.iconColor}`} />}
        </div>
        {trend !== undefined && (
          <div className={`flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded border ${
            trend > 0 ? 'text-emerald-400 bg-emerald-500/5 border-emerald-500/10' : 
            trend < 0 ? 'text-red-400 bg-red-500/5 border-red-500/10' : 
            'text-gray-400 bg-white/5 border-white/5'
          }`}>
            {trend > 0 ? <TrendingUp className="w-3 h-3" /> : 
             trend < 0 ? <TrendingDown className="w-3 h-3" /> : 
             <Minus className="w-3 h-3" />}
            <span>{Math.abs(trend)}%</span>
          </div>
        )}
      </div>
      <div>
        <p className="mb-0.5 text-[11px] font-medium text-gray-500">{title}</p>
        <h3 className="text-lg font-bold tracking-tight text-white">{value}</h3>
        {subtitle && <p className="text-[10px] text-gray-500/80 mt-1 font-medium">{subtitle}</p>}
      </div>
    </AppCard>
  );
}
