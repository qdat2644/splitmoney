import { AlertCircle, RefreshCw } from 'lucide-react';
import AppButton from './AppButton';
import AppCard from './AppCard';

export default function ErrorState({
  title = 'Không thể tải dữ liệu',
  description = 'Đã có lỗi xảy ra. Vui lòng thử lại sau ít phút.',
  onRetry,
  retryLabel = 'Thử lại',
}) {
  return (
    <AppCard className="flex flex-col items-center gap-3 border border-red-500/15 bg-red-500/5 p-6 text-center">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-red-500/15 bg-red-500/10">
        <AlertCircle className="h-5 w-5 text-red-300" />
      </div>
      <div className="space-y-1">
        <h2 className="text-sm font-semibold text-white">{title}</h2>
        {description && <p className="max-w-md text-xs leading-relaxed text-gray-400">{description}</p>}
      </div>
      {onRetry && (
        <AppButton variant="secondary" size="sm" icon={RefreshCw} onClick={onRetry}>
          {retryLabel}
        </AppButton>
      )}
    </AppCard>
  );
}
