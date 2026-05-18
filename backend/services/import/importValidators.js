import { normalizeSourceName } from './memberResolver.js';

const LARGE_AMOUNT_THRESHOLD = 100_000_000;

export function validatePreviewRows(rows, existingExpenses = []) {
  return rows.map((row) => {
    const warnings = [...(row.warnings || [])];
    const errors = [...(row.errors || [])];

    if (!row.title?.trim()) errors.push('Thiếu tên khoản chi.');
    if (typeof row.amount !== 'number' || Number.isNaN(row.amount) || row.amount <= 0) errors.push('Số tiền không hợp lệ.');
    if (!row.paidBySourceName?.trim()) errors.push('Thiếu người trả.');
    if (!Array.isArray(row.participantSourceNames) || row.participantSourceNames.length === 0) errors.push('Không xác định được người tham gia.');
    if (row.amount > LARGE_AMOUNT_THRESHOLD) warnings.push('Số tiền lớn bất thường, vui lòng kiểm tra lại.');
    if (looksLikeDuplicate(row, existingExpenses)) warnings.push('Có thể đã tồn tại khoản chi tương tự.');

    return {
      ...row,
      warnings,
      errors,
      status: errors.length > 0 ? 'error' : warnings.length > 0 ? 'warning' : 'valid',
    };
  });
}

export function buildPreviewSummary(rows) {
  const detectedMembers = new Set();
  rows.forEach((row) => {
    if (row.paidBySourceName) detectedMembers.add(row.paidBySourceName);
    row.participantSourceNames.forEach((name) => detectedMembers.add(name));
  });

  return {
    totalRows: rows.length,
    validRows: rows.filter((row) => row.status === 'valid').length,
    warningRows: rows.filter((row) => row.status === 'warning').length,
    errorRows: rows.filter((row) => row.status === 'error').length,
    detectedMembers: [...detectedMembers],
    totalAmount: rows.filter((row) => row.status !== 'error').reduce((sum, row) => sum + row.amount, 0),
  };
}

function looksLikeDuplicate(row, existingExpenses) {
  const rowTitle = normalizeSourceName(row.title);
  const rowPayer = normalizeSourceName(row.paidBySourceName);
  return existingExpenses.some((expense) => {
    const existingTitle = normalizeSourceName(expense.title);
    const existingPayer = normalizeSourceName(expense.paidByUser?.name || expense.paidByGuest?.displayName || '');
    const existingDate = expense.date instanceof Date ? expense.date.toISOString().slice(0, 10) : String(expense.date || '').slice(0, 10);
    return rowTitle
      && rowTitle === existingTitle
      && Number(expense.amount) === Number(row.amount)
      && row.date
      && row.date === existingDate
      && rowPayer
      && rowPayer === existingPayer;
  });
}
