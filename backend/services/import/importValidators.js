import { normalizeSourceName } from './memberResolver.js';

const LARGE_AMOUNT_THRESHOLD = 100_000_000;

export function validatePreviewRows(rows, existingExpenses = []) {
  return rows.map((row) => {
    if (row.status === 'skipped') return row;

    const warnings = [...(row.warnings || [])];
    const errors = [...(row.errors || [])];

    if (!row.title?.trim()) warnings.push('Chưa xác định chắc tên khoản chi.');
    if (typeof row.amount !== 'number' || Number.isNaN(row.amount) || row.amount <= 0) errors.push('Số tiền không hợp lệ.');
    if (!row.paidBySourceName?.trim()) warnings.push('Chưa xác định chắc người trả.');
    if (!Array.isArray(row.participantSourceNames) || row.participantSourceNames.length === 0) warnings.push('Chưa xác định chắc người tham gia.');
    if (row.amount > LARGE_AMOUNT_THRESHOLD) warnings.push('Số tiền lớn bất thường, vui lòng kiểm tra lại.');
    if (looksLikeDuplicate(row, existingExpenses)) warnings.push('Có thể đã tồn tại khoản chi tương tự.');
    if (row.amount <= 0 && !row.title?.trim() && !row.paidBySourceName?.trim() && row.participantSourceNames.length === 0) {
      errors.push('Không có dữ liệu tài chính đủ để nhập.');
    }

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
    if (row.status === 'skipped') return;
    if (row.paidBySourceName) detectedMembers.add(row.paidBySourceName);
    row.participantSourceNames.forEach((name) => detectedMembers.add(name));
  });

  return {
    totalRows: rows.length,
    candidateRows: rows.filter((row) => row.status !== 'skipped').length,
    skippedRows: rows.filter((row) => row.status === 'skipped').length,
    validRows: rows.filter((row) => row.status === 'valid').length,
    warningRows: rows.filter((row) => row.status === 'warning').length,
    errorRows: rows.filter((row) => row.status === 'error').length,
    blockingRows: rows.filter((row) => row.status === 'error').length,
    detectedMembers: [...detectedMembers],
    totalAmount: rows.filter((row) => row.status !== 'error' && row.status !== 'skipped').reduce((sum, row) => sum + row.amount, 0),
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
