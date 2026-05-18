import { AlertTriangle, CheckCircle2, CircleSlash, XCircle } from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';

export default function ImportPreviewTable({ rows, selectedRows, onToggle }) {
  return (
    <>
      <div className="hidden overflow-hidden rounded-xl border border-white/5 md:block">
        <table className="w-full text-left text-sm">
          <thead className="bg-white/[0.03] text-xs text-gray-400">
            <tr>
              <th className="px-3 py-2">Chọn</th>
              <th className="px-3 py-2">Khoản chi</th>
              <th className="px-3 py-2">Số tiền</th>
              <th className="px-3 py-2">Người trả</th>
              <th className="px-3 py-2">Người tham gia</th>
              <th className="px-3 py-2">Ngày</th>
              <th className="px-3 py-2">Trạng thái</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {rows.map((row) => (
              <tr key={row.rowIndex} className={`align-top ${row.status === 'skipped' ? 'bg-white/[0.015]' : ''}`}>
                <td className="px-3 py-3">
                  <input
                    type="checkbox"
                    checked={selectedRows.includes(row.rowIndex)}
                    disabled={row.status === 'error' || row.status === 'skipped'}
                    onChange={() => onToggle(row.rowIndex)}
                    className="h-4 w-4"
                  />
                </td>
                <td className="px-3 py-3 text-white">{row.title || (row.status === 'skipped' ? '-' : 'Chưa có tên')}</td>
                <td className="px-3 py-3 text-gray-200">{row.amount ? formatCurrency(row.amount, true) : '-'}</td>
                <td className="px-3 py-3 text-gray-300">{row.paidBySourceName || '-'}</td>
                <td className="px-3 py-3 text-gray-300">{row.participantSourceNames.join(', ') || '-'}</td>
                <td className="px-3 py-3 text-gray-400">{row.date || '-'}</td>
                <td className="px-3 py-3">
                  <StatusBadge row={row} />
                  <RowNotes row={row} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="space-y-3 md:hidden">
        {rows.map((row) => (
          <div key={row.rowIndex} className={`rounded-xl border border-white/5 p-4 ${row.status === 'skipped' ? 'bg-white/[0.02]' : 'bg-dark-800'}`}>
            <div className="flex items-start justify-between gap-3">
              <label className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={selectedRows.includes(row.rowIndex)}
                  disabled={row.status === 'error' || row.status === 'skipped'}
                  onChange={() => onToggle(row.rowIndex)}
                  className="mt-1 h-4 w-4"
                />
                <div>
                  <p className="font-medium text-white">{row.title || (row.status === 'skipped' ? 'Dòng siêu dữ liệu' : 'Chưa có tên')}</p>
                  <p className="mt-1 text-sm text-gray-300">{row.amount ? formatCurrency(row.amount, true) : '-'}</p>
                </div>
              </label>
              <StatusBadge row={row} />
            </div>
            <div className="mt-3 space-y-1 text-sm text-gray-400">
              <p>Người trả: {row.paidBySourceName || '-'}</p>
              <p>Người tham gia: {row.participantSourceNames.join(', ') || '-'}</p>
              <p>Ngày: {row.date || '-'}</p>
            </div>
            <RowNotes row={row} />
          </div>
        ))}
      </div>
    </>
  );
}

function StatusBadge({ row }) {
  const config = {
    valid: { label: 'Hợp lệ', className: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20', icon: CheckCircle2 },
    warning: { label: 'Cần kiểm tra', className: 'text-amber-400 bg-amber-500/10 border-amber-500/20', icon: AlertTriangle },
    error: { label: 'Lỗi chặn', className: 'text-red-400 bg-red-500/10 border-red-500/20', icon: XCircle },
    skipped: { label: 'Đã bỏ qua', className: 'text-gray-400 bg-white/5 border-white/10', icon: CircleSlash },
  }[row.status];
  const Icon = config.icon;
  return (
    <span className={`inline-flex items-center gap-1 rounded border px-2 py-1 text-xs ${config.className}`}>
      <Icon className="h-3 w-3" />
      {config.label}
    </span>
  );
}

function RowNotes({ row }) {
  const notes = row.status === 'skipped'
    ? [skipReasonLabel(row.skipReason)]
    : [...row.warnings, ...row.errors];
  if (notes.length === 0) return null;
  return (
    <div className="mt-2 space-y-1 text-xs text-gray-400">
      {notes.map((note) => <p key={note}>{note}</p>)}
    </div>
  );
}

function skipReasonLabel(reason) {
  if (reason === 'empty_financial_row') return 'Không có dữ liệu tài chính đủ rõ để nhập.';
  return 'Đã tự động bỏ qua dòng tiêu đề, tổng hợp hoặc siêu dữ liệu.';
}
