import { forwardRef } from 'react';

const AppSelect = forwardRef(({ 
  label, 
  error, 
  helperText,
  required,
  icon: Icon, 
  className = '', 
  wrapperClassName = '',
  children,
  ...props 
}, ref) => {
  return (
    <div className={`space-y-1.5 ${wrapperClassName}`}>
      {label && (
        <label className="block text-sm font-medium text-gray-300">
          {label} {required && <span className="text-red-400">*</span>}
        </label>
      )}
      <div className="relative">
        {Icon && (
          <div className="absolute top-3 left-3 flex items-center pointer-events-none z-10">
            <Icon className="w-4 h-4 text-gray-500" />
          </div>
        )}
        <select
          ref={ref}
          className={`input-field w-full appearance-none ${Icon ? 'pl-9' : ''} pr-10 ${error ? 'border-red-500/50 focus:border-red-500 focus:shadow-[0_0_0_2px_rgba(239,68,68,0.2)]' : ''} ${className}`}
          {...props}
        >
          {children}
        </select>
        <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none z-10">
          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
        </div>
      </div>
      {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
      {helperText && !error && <p className="text-gray-500 text-xs mt-1">{helperText}</p>}
    </div>
  );
});

AppSelect.displayName = 'AppSelect';

export default AppSelect;
