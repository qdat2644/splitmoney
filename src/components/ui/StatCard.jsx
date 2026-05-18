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
    blue: { iconBg: 'bg-blue-500/10', iconColor: 'text-blue-400' },
    emerald: { iconBg: 'bg-emerald-500/10', iconColor: 'text-emerald-400' },
    purple: { iconBg: 'bg-purple-500/10', iconColor: 'text-purple-400' },
    amber: { iconBg: 'bg-amber-500/10', iconColor: 'text-amber-400' },
  };

  const scheme = colorMap[color] || colorMap.blue;

  return (
    <AppCard className={`p-5 flex flex-col ${className}`} hover>
      <div className="flex items-center justify-between mb-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${scheme.iconBg}`}>
          {Icon && <Icon className={`w-5 h-5 ${scheme.iconColor}`} />}
        </div>
        {trend !== undefined && (
          <div className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${
            trend > 0 ? 'text-emerald-400 bg-emerald-500/10' : 
            trend < 0 ? 'text-red-400 bg-red-500/10' : 
            'text-gray-400 bg-gray-500/10'
          }`}>
            {trend > 0 ? <TrendingUp className="w-3 h-3" /> : 
             trend < 0 ? <TrendingDown className="w-3 h-3" /> : 
             <Minus className="w-3 h-3" />}
            <span>{Math.abs(trend)}%</span>
          </div>
        )}
      </div>
      <div>
        <p className="text-sm text-gray-400 mb-1">{title}</p>
        <h3 className="text-2xl font-bold text-white">{value}</h3>
        {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
      </div>
    </AppCard>
  );
}
