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
    blue: {
      bg: 'bg-blue-500/10',
      border: 'border-blue-500/20',
      shadow: 'shadow-[0_0_30px_rgba(59,130,246,0.2)]',
      text: 'text-blue-400'
    },
    emerald: {
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/20',
      shadow: 'shadow-[0_0_30px_rgba(16,185,129,0.2)]',
      text: 'text-emerald-400'
    },
    purple: {
      bg: 'bg-purple-500/10',
      border: 'border-purple-500/20',
      shadow: 'shadow-[0_0_30px_rgba(168,85,247,0.2)]',
      text: 'text-purple-400'
    },
    gray: {
      bg: 'bg-gray-500/10',
      border: 'border-gray-500/20',
      shadow: 'shadow-[0_0_30px_rgba(156,163,175,0.2)]',
      text: 'text-gray-400'
    }
  };

  const scheme = colorMap[color] || colorMap.blue;

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.98 }} 
      animate={{ opacity: 1, scale: 1 }} 
      className={`glass-card flex flex-col items-center text-center border-dashed border-2 border-white/5
        ${compact ? 'p-8 gap-3' : 'p-12 gap-5'}
      `}
    >
      {Icon && (
        <div className={`${compact ? 'w-12 h-12 mb-1' : 'w-16 h-16'} rounded-full flex items-center justify-center border ${scheme.bg} ${scheme.border} ${scheme.shadow}`}>
          <Icon className={`${compact ? 'w-5 h-5' : 'w-8 h-8'} ${scheme.text}`} />
        </div>
      )}
      <div>
        <h2 className={`${compact ? 'text-base' : 'text-lg'} font-bold text-white mb-1`}>{title}</h2>
        {description && (
          <p className={`text-gray-400 max-w-sm mx-auto ${compact ? 'text-xs' : 'text-sm'}`}>
            {description}
          </p>
        )}
      </div>
      {action && <div className={compact ? 'mt-2' : ''}>{action}</div>}
    </motion.div>
  );
}
