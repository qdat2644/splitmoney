// exportCsv.js — CSV export utility

import { formatCurrency, formatDate } from './formatters';

/**
 * Convert expenses to CSV and trigger browser download
 */
export function exportExpensesToCsv(expenses, members) {
  const memberMap = {};
  members.forEach((m) => (memberMap[m.id] = m.name));

  const headers = ['Tên khoản chi', 'Số tiền', 'Người trả', 'Ngày', 'Người tham gia', 'Ghi chú', 'Danh mục'];

  const rows = expenses.map((e) => [
    e.title,
    e.amount,
    memberMap[e.paidBy] || e.paidBy,
    e.date,
    (e.participants || []).map((pid) => memberMap[pid] || pid).join(', '),
    e.note || '',
    e.category || 'other',
  ]);

  const csv = [headers, ...rows]
    .map((row) =>
      row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')
    )
    .join('\n');

  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `spliteasy_${new Date().toISOString().split('T')[0]}.csv`);
  link.click();
  URL.revokeObjectURL(url);
}

/**
 * Export settlements to CSV
 */
export function exportSettlementsToCsv(settlements, members) {
  const memberMap = {};
  members.forEach((m) => (memberMap[m.id] = m.name));

  const headers = ['Người trả', 'Người nhận', 'Số tiền'];
  const rows = settlements.map((s) => [
    memberMap[s.from] || s.from,
    memberMap[s.to] || s.to,
    s.amount,
  ]);

  const csv = [headers, ...rows]
    .map((row) => row.map((cell) => `"${cell}"`).join(','))
    .join('\n');

  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `settlements_${new Date().toISOString().split('T')[0]}.csv`);
  link.click();
  URL.revokeObjectURL(url);
}
