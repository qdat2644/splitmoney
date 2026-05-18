import { motion } from 'framer-motion';

export default function PageHeader({ 
  title, 
  subtitle, 
  eyebrow, 
  actions 
}) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: -10 }} 
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
    >
      <div>
        {eyebrow && <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-1">{eyebrow}</p>}
        <h1 className="text-2xl font-bold text-white">{title}</h1>
        {subtitle && <p className="text-gray-400 mt-1">{subtitle}</p>}
      </div>
      {actions && (
        <div className="flex items-center gap-2">
          {actions}
        </div>
      )}
    </motion.div>
  );
}
