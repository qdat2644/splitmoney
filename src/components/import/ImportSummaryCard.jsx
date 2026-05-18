import AppCard from '../ui/AppCard';
import { formatCurrency } from '../../utils/formatters';

export default function ImportSummaryCard({ summary, result = false }) {
  const importableRows = (summary.validRows || 0) + (summary.warningRows || 0);
  const blockingRows = summary.blockingRows ?? summary.errorRows ?? 0;
  const items = result
    ? [
      { label: 'Khoản chi đã tạo', value: summary.createdExpenses },
      { label: 'Khách mới', value: summary.createdGuests },
      { label: 'Dòng bỏ qua', value: summary.skippedRows },
      { label: 'Tổng đã nhập', value: formatCurrency(summary.totalAmount, true) },
    ]
    : [
      { label: 'Có thể nhập', value: importableRows },
      { label: 'Cần kiểm tra', value: summary.warningRows },
      { label: 'Lỗi chặn', value: blockingRows },
      { label: 'Đã bỏ qua', value: summary.skippedRows ?? 0 },
      { label: 'Tổng tiền', value: formatCurrency(summary.totalAmount, true) },
    ];

  return (
    <AppCard className="space-y-4 border border-white/5 bg-dark-800 p-4">
      {!result && (
        <div>
          <p className="text-sm font-medium text-white">
            {summary.warningRows > 0
              ? 'File đã đọc được. Một số dòng cần kiểm tra trước khi nhập.'
              : 'File đã đọc được.'}
          </p>
          <p className={`mt-1 text-xs ${blockingRows === 0 ? 'text-emerald-300' : 'text-red-300'}`}>
            {blockingRows === 0 ? 'Không có lỗi chặn.' : `Có ${blockingRows} dòng lỗi chặn cần xử lý.`}
          </p>
        </div>
      )}
      <div className={`grid gap-3 sm:grid-cols-2 ${result ? 'lg:grid-cols-4' : 'lg:grid-cols-5'}`}>
        {items.map((item) => (
          <div key={item.label}>
            <p className="text-[11px] font-medium text-gray-500">{item.label}</p>
            <p className="mt-1 text-sm font-semibold text-white">{item.value}</p>
          </div>
        ))}
      </div>
    </AppCard>
  );
}
