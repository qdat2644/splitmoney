import { motion } from 'framer-motion';

export default function EmptyState({ 
  icon: Icon, 
  title, 
  description, 
  action, 
  color = 'blue',
  compact = false 
}) {
  const colorMap = {
    blue: { bg: 'bg-dark-900 border-white/5', text: 'text-blue-400' },
    emerald: { bg: 'bg-dark-900 border-white/5', text: 'text-emerald-400' },
    purple: { bg: 'bg-dark-900 border-white/5', text: 'text-purple-400' },
    gray: { bg: 'bg-dark-900 border-white/5', text: 'text-gray-400' }
  };

  const scheme = colorMap[color] || colorMap.blue;

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.99 }} 
      animate={{ opacity: 1, scale: 1 }} 
      className={`glass-card flex flex-col items-center text-center border-dashed border border-white/10
        ${compact ? 'p-6 gap-2.5' : 'p-10 gap-4'}
      `}
    >
      {Icon && (
        <div className={`rounded-lg flex items-center justify-center border bg-dark-900 border-white/5 ${compact ? 'w-10 h-10' : 'w-12 h-12'}`}>
          <Icon className={`${compact ? 'w-4 h-4' : 'w-5 h-5'} ${scheme.text}`} />
        </div>
      )}
      <div className="space-y-0.5">
        <h2 className={`${compact ? 'text-sm' : 'text-base'} font-semibold text-white`}>{title}</h2>
        {description && (
          <p className={`text-gray-400 max-w-sm mx-auto font-normal leading-relaxed ${compact ? 'text-[11px]' : 'text-xs'}`}>
            {description}
          </p>
        )}
      </div>
      {action && <div className="mt-1 shrink-0">{action}</div>}
    </motion.div>
  );
}
