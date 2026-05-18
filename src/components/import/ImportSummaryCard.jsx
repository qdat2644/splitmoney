import AppCard from '../ui/AppCard';
import { formatCurrency } from '../../utils/formatters';

export default function ImportSummaryCard({ summary, result = false }) {
  const items = result
    ? [
      { label: 'Khoản chi đã tạo', value: summary.createdExpenses },
      { label: 'Khách mới', value: summary.createdGuests },
      { label: 'Dòng bỏ qua', value: summary.skippedRows },
      { label: 'Tổng đã nhập', value: formatCurrency(summary.totalAmount, true) },
    ]
    : [
      { label: 'Ứng viên nhập', value: summary.candidateRows ?? summary.totalRows },
      { label: 'Đã bỏ qua', value: summary.skippedRows ?? 0 },
      { label: 'Cần kiểm tra', value: summary.warningRows },
      { label: 'Lỗi chặn', value: summary.blockingRows ?? summary.errorRows },
      { label: 'Tổng tiền', value: formatCurrency(summary.totalAmount, true) },
    ];

  return (
    <AppCard className="grid gap-3 border border-white/5 bg-dark-800 p-4 sm:grid-cols-2 lg:grid-cols-5">
      {items.map((item) => (
        <div key={item.label}>
          <p className="text-[11px] font-medium text-gray-500">{item.label}</p>
          <p className="mt-1 text-sm font-semibold text-white">{item.value}</p>
        </div>
      ))}
    </AppCard>
  );
}
