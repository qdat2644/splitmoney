import { motion } from 'framer-motion';

export default function PageHeader({ 
  title, 
  subtitle, 
  eyebrow, 
  actions 
}) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: -4 }} 
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b border-white/5"
    >
      <div className="min-w-0 space-y-0.5">
        {eyebrow && (
          <p className="text-[11px] font-medium text-gray-500/85">
            {eyebrow}
          </p>
        )}
        <h1 className="break-words text-lg font-semibold tracking-tight text-white">{title}</h1>
        {subtitle && (
          <p className="text-xs text-gray-400 font-normal leading-relaxed">
            {subtitle}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end sm:pt-1">
          {actions}
        </div>
      )}
    </motion.div>
  );
}
