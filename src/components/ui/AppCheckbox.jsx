import { forwardRef } from 'react';
import { Check } from 'lucide-react';

export const AppCheckbox = forwardRef(({ 
  label, 
  description,
  error, 
  className = '', 
  wrapperClassName = '',
  checked,
  onChange,
  ...props 
}, ref) => {
  return (
    <div className={wrapperClassName}>
      <label className={`flex items-start gap-3 cursor-pointer group ${className}`}>
        <div className="relative flex items-center justify-center shrink-0 mt-0.5">
          <input
            type="checkbox"
            ref={ref}
            checked={checked}
            onChange={onChange}
            className="peer sr-only"
            {...props}
          />
          <div className={`w-5 h-5 rounded border transition-all duration-200
            ${checked 
              ? 'bg-blue-500 border-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.3)]' 
              : 'border-white/20 bg-dark-800 group-hover:border-white/40'
            }
            ${error ? 'border-red-500' : ''}
          `}>
            {checked && <Check className="w-3.5 h-3.5 text-white absolute inset-0 m-auto" strokeWidth={3} />}
          </div>
        </div>
        <div className="flex-1">
          {label && <span className={`text-sm font-medium ${checked ? 'text-white' : 'text-gray-300'}`}>{label}</span>}
          {description && <p className="text-xs text-gray-500 mt-0.5">{description}</p>}
          {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
        </div>
      </label>
    </div>
  );
});

AppCheckbox.displayName = 'AppCheckbox';

export default AppCheckbox;
