import { forwardRef } from 'react';
import { Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

const AppButton = forwardRef(({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  icon: Icon, 
  loading = false, 
  fullWidth = false, 
  className = '', 
  disabled,
  ...props 
}, ref) => {
  const base = 'inline-flex items-center justify-center font-medium transition-all duration-200 outline-none focus:ring-2 focus:ring-blue-500/50';
  
  const sizes = {
    xs: 'h-8 px-3 text-xs rounded-lg gap-1.5',
    sm: 'h-9 px-3.5 text-sm rounded-lg gap-1.5',
    md: 'h-10 px-4 text-sm rounded-xl gap-2',
    lg: 'h-12 px-5 text-base rounded-xl gap-2',
    icon: 'w-10 h-10 rounded-xl',
  };

  const variants = {
    primary: 'btn-primary',
    secondary: 'btn-secondary',
    danger: 'bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 active:scale-97',
    success: 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20 active:scale-97',
    ghost: 'text-gray-400 hover:text-white hover:bg-white/5 active:scale-97',
  };

  const sizeClass = sizes[size] || sizes.md;
  const variantClass = variants[variant] || variants.primary;
  const widthClass = fullWidth ? 'w-full' : '';
  const stateClass = (disabled || loading) ? 'opacity-50 pointer-events-none' : '';

  return (
    <button 
      ref={ref}
      disabled={disabled || loading}
      className={`${base} ${sizeClass} ${variantClass} ${widthClass} ${stateClass} ${className}`}
      {...props}
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin shrink-0" />
      ) : Icon ? (
        <Icon className={`${size === 'xs' || size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4'} shrink-0`} />
      ) : null}
      {children}
    </button>
  );
});

AppButton.displayName = 'AppButton';

export default AppButton;
