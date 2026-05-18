import xlsx from 'xlsx';
import { parseVietnameseAmount, safeLower } from '../ai/utils.js';

const COLUMN_ALIASES = {
  title: ['ten', 'khoan chi', 'noi dung', 'mo ta', 'ten khoan chi', 'title'],
  amount: ['so tien', 'tong tien', 'amount', 'chi phi'],
  payer: ['nguoi tra', 'nguoi thanh toan', 'paid by', 'payer'],
  date: ['ngay', 'ngay chi', 'date'],
  category: ['danh muc', 'category'],
  participants: ['nguoi tham gia', 'participants', 'chia cho'],
};

const SYSTEM_COLUMNS = new Set(Object.values(COLUMN_ALIASES).flat());

export function parseWorkbookBuffer(buffer) {
  const workbook = xlsx.read(buffer, { type: 'buffer', cellDates: true });
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
  if (!firstSheet) return [];
  const rows = xlsx.utils.sheet_to_json(firstSheet, { header: 1, raw: true, defval: '' });
  return parseWorksheetRows(rows);
}

export function parseWorksheetRows(rows) {
  const headerRowIndex = findHeaderRow(rows);
  if (headerRowIndex < 0) return [];

  const headers = rows[headerRowIndex].map((value) => String(value || '').trim());
  const normalizedHeaders = headers.map(normalizeHeader);
  const indexByField = Object.fromEntries(
    Object.entries(COLUMN_ALIASES).map(([field, aliases]) => [
      field,
      normalizedHeaders.findIndex((header) => aliases.includes(header)),
    ]),
  );
  const memberColumns = headers
    .map((header, index) => ({ header, normalized: normalizedHeaders[index], index }))
    .filter(({ header, normalized }) => header && !SYSTEM_COLUMNS.has(normalized));

  return rows.slice(headerRowIndex + 1)
    .map((cells, offset) => parseDataRow({
      rowIndex: headerRowIndex + offset + 2,
      cells,
      headers,
      indexByField,
      memberColumns,
    }))
    .filter(Boolean);
}

export function parseImportAmount(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const raw = String(value ?? '').trim();
  if (!raw) return 0;

  const cleaned = raw
    .replace(/\s+/g, ' ')
    .replace(/[₫đ]/gi, '')
    .replace(/\bvnd\b/gi, '')
    .trim();

  if (/^\d{1,3}(?:[.,]\d{3})+$/.test(cleaned)) {
    return Number(cleaned.replace(/[.,]/g, ''));
  }

  if (/^\d+(?:[.,]\d+)?$/.test(cleaned)) {
    return Number(cleaned.replace(',', '.'));
  }

  return parseVietnameseAmount(cleaned);
}

function parseDataRow({ rowIndex, cells, headers, indexByField, memberColumns }) {
  if (!cells || cells.every((cell) => String(cell ?? '').trim() === '')) return null;

  const raw = Object.fromEntries(headers.map((header, index) => [header || `Cột ${index + 1}`, cells[index] ?? '']));
  const title = getString(cells[indexByField.title]);
  const amount = parseImportAmount(cells[indexByField.amount]);
  let payer = getString(cells[indexByField.payer]);
  const explicitParticipants = splitNames(getString(cells[indexByField.participants]));
  const shares = [];
  const inferredParticipants = [];

  for (const column of memberColumns) {
    const cell = cells[column.index];
    const text = safeLower(cell);
    const amountValue = parseImportAmount(cell);

    if (!payer && ['chi', 'paid', 'payer'].includes(text)) payer = column.header;
    if (!payer && amount > 0 && amountValue === amount) payer = column.header;
    if (amountValue > 0 || ['no', 'nợ', 'share', 'tham gia'].includes(text)) {
      inferredParticipants.push(column.header);
      if (amountValue > 0) shares.push({ sourceName: column.header, shareAmount: amountValue });
    }
  }

  const participantSourceNames = uniqueNames(
    explicitParticipants.length > 0
      ? explicitParticipants
      : inferredParticipants.length > 0
        ? inferredParticipants
        : memberColumns.length > 0 && amount > 0
          ? memberColumns.map((column) => column.header)
          : [],
  );

  const warnings = [];
  if (explicitParticipants.length === 0 && inferredParticipants.length > 0) warnings.push('Đã suy luận người tham gia từ các cột thành viên.');
  if (explicitParticipants.length === 0 && inferredParticipants.length === 0 && participantSourceNames.length > 0) {
    warnings.push('Đã suy luận người tham gia từ toàn bộ cột thành viên.');
  }

  const date = parseDate(cells[indexByField.date]);
  const rawCategory = getString(cells[indexByField.category]);
  const category = normalizeCategory(rawCategory);
  if (!date) warnings.push('Thiếu hoặc không đọc được ngày chi.');
  if (!rawCategory) warnings.push('Danh mục được gán mặc định.');
  if (rawCategory && category === 'other' && safeLower(rawCategory) !== 'other') {
    warnings.push('Danh mục không nhận diện được, đã gán mặc định.');
  }

  return {
    rowIndex,
    title,
    amount,
    paidBySourceName: payer,
    participantSourceNames,
    date,
    category,
    splitType: shares.length > 0 && shares.length === participantSourceNames.length ? 'exact' : 'equal',
    shares,
    warnings,
    errors: [],
    raw,
  };
}

function findHeaderRow(rows) {
  let best = { index: -1, score: 0 };
  rows.slice(0, 10).forEach((row, index) => {
    const score = row.map(normalizeHeader).filter((header) => SYSTEM_COLUMNS.has(header)).length;
    if (score > best.score) best = { index, score };
  });
  return best.score >= 2 ? best.index : -1;
}

function parseDate(value) {
  if (!value) return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString().slice(0, 10);
  if (typeof value === 'number') {
    const parsed = xlsx.SSF.parse_date_code(value);
    if (parsed) return new Date(Date.UTC(parsed.y, parsed.m - 1, parsed.d)).toISOString().slice(0, 10);
  }
  const parsed = new Date(String(value).trim());
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString().slice(0, 10);
}

function normalizeCategory(value) {
  const normalized = safeLower(value);
  if (!normalized) return 'other';
  if (['food', 'an uong'].includes(normalized)) return 'food';
  if (['drink', 'drinks', 'do uong'].includes(normalized)) return 'drinks';
  if (['transport', 'di chuyen'].includes(normalized)) return 'transport';
  if (['housing', 'accommodation', 'cho o'].includes(normalized)) return 'accommodation';
  if (['grocery', 'sieu thi'].includes(normalized)) return 'grocery';
  if (['entertainment', 'giai tri'].includes(normalized)) return 'entertainment';
  return 'other';
}

function normalizeHeader(value) {
  return safeLower(value).replace(/\s+/g, ' ');
}

function splitNames(value) {
  if (!value) return [];
  return String(value)
    .split(/[,;|/]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function uniqueNames(values) {
  const seen = new Set();
  return values.filter((value) => {
    const key = safeLower(value);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function getString(value) {
  return String(value ?? '').trim();
}
