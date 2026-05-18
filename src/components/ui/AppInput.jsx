import { forwardRef } from 'react';

const AppInput = forwardRef(({ 
  label, 
  error, 
  helperText,
  required,
  icon: Icon, 
  action,
  className = '', 
  wrapperClassName = '',
  multiline = false,
  ...props 
}, ref) => {
  const InputComponent = multiline ? 'textarea' : 'input';
  
  return (
    <div className={`space-y-1.5 ${wrapperClassName}`}>
      {label && (
        <label className="block text-sm font-medium text-gray-300">
          {label} {required && <span className="text-red-400">*</span>}
        </label>
      )}
      <div className="relative">
        {Icon && (
          <div className="absolute top-3 left-3 flex items-center pointer-events-none">
            <Icon className="w-4 h-4 text-gray-500" />
          </div>
        )}
        <InputComponent
          ref={ref}
          className={`input-field w-full ${Icon ? 'pl-9' : ''} ${action ? 'pr-10' : ''} ${error ? 'border-red-500/50 focus:border-red-500 focus:shadow-[0_0_0_2px_rgba(239,68,68,0.2)]' : ''} ${className}`}
          {...props}
        />
        {action && (
          <div className="absolute top-1/2 -translate-y-1/2 right-3 flex items-center">
            {action}
          </div>
        )}
      </div>
      {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
      {helperText && !error && <p className="text-gray-500 text-xs mt-1">{helperText}</p>}
    </div>
  );
});

AppInput.displayName = 'AppInput';

export default AppInput;
