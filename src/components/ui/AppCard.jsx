import { forwardRef } from 'react';

const AppCard = forwardRef(({ className = '', variant = 'default', hover = false, children, ...props }, ref) => {
  const base = 'rounded-xl border border-white/5 overflow-hidden';
  const variants = {
    default: 'glass-card',
    elevated: 'bg-dark-800 shadow-xl',
    ghost: 'bg-white/5',
  };
  
  const hoverClass = hover ? 'glass-card-hover' : '';
  const variantClass = variants[variant] || variants.default;

  return (
    <div ref={ref} className={`${base} ${variantClass} ${hoverClass} ${className}`} {...props}>
      {children}
    </div>
  );
});

AppCard.displayName = 'AppCard';

export default AppCard;
