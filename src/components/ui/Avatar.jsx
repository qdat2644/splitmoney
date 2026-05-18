// Avatar.jsx
import { MEMBER_COLORS } from '../../data/mockData';
import { getInitials } from '../../utils/formatters';

export default function Avatar({ member, size = 'md', className = '' }) {
  const color = MEMBER_COLORS[member?.colorIndex ?? 0];
  const initials = getInitials(member?.name || '?');

  const sizeClasses = {
    xs: 'w-6 h-6 text-[10px]',
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
    xl: 'w-16 h-16 text-xl',
  };

  return (
    <div
      className={`
        inline-flex items-center justify-center rounded-full font-bold shrink-0
        bg-gradient-to-br ${color?.bg ?? 'from-blue-500 to-cyan-500'}
        ${color?.text ?? 'text-white'}
        ring-2 ${color?.ring ?? 'ring-blue-500/30'}
        ${sizeClasses[size] ?? sizeClasses.md}
        ${className}
      `}
      title={member?.name}
    >
      {initials}
    </div>
  );
}

// AvatarGroup — show multiple avatars stacked
export function AvatarGroup({ members, max = 4, size = 'sm' }) {
  const shown = members.slice(0, max);
  const remaining = members.length - max;

  return (
    <div className="flex -space-x-2">
      {shown.map((m) => (
        <Avatar key={m.id} member={m} size={size} />
      ))}
      {remaining > 0 && (
        <div
          className={`
            inline-flex items-center justify-center rounded-full text-xs font-semibold
            bg-dark-600 text-gray-400 border-2 border-dark-800
            ${size === 'sm' ? 'w-8 h-8' : 'w-10 h-10'}
          `}
        >
          +{remaining}
        </div>
      )}
    </div>
  );
}
