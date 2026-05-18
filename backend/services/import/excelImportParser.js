import xlsx from 'xlsx';
import { parseVietnameseAmount, safeLower } from '../ai/utils.js';

const COLUMN_ALIASES = {
  title: ['ten', 'khoan chi', 'noi dung', 'mo ta', 'ten khoan chi', 'title', 'giao dich'],
  amount: ['so tien', 'tong tien', 'amount', 'chi phi', 'tong chi'],
  payer: ['nguoi tra', 'nguoi thanh toan', 'paid by', 'payer', 'chi boi'],
  date: ['ngay', 'ngay chi', 'date'],
  category: ['danh muc', 'category'],
  participants: ['nguoi tham gia', 'participants', 'chia cho'],
};

const SUMMARY_TERMS = ['tong', 'cong', 'summary', 'tong cong', 'subtotal'];
const PAYER_MARKERS = ['chi', 'paid', 'payer', 'tra', 'thanh toan'];
const PARTICIPANT_MARKERS = ['no', 'share', 'tham gia'];
const SEPARATOR_RE = /^[-_=.\s]+$/;
const SYSTEM_HEADERS = new Set(Object.values(COLUMN_ALIASES).flat());

export function parseWorkbookBuffer(buffer, options = {}) {
  const workbook = xlsx.read(buffer, { type: 'buffer', cellDates: true });
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
  if (!firstSheet) return emptyAnalysis();

  const rows = sheetToRows(firstSheet);
  return analyzeWorksheetRows(rows, options);
}

export function parseWorksheetRows(rows, options = {}) {
  return analyzeWorksheetRows(rows, options).rows;
}

export function analyzeWorksheetRows(rows, { memberNames = [] } = {}) {
  const normalizedMemberNames = new Set(memberNames.map(normalizeHeader).filter(Boolean));
  const detectedHeaderRow = findHeaderRow(rows, normalizedMemberNames);
  if (detectedHeaderRow < 0) return emptyAnalysis();

  const headers = rows[detectedHeaderRow].map((value) => String(value || '').trim());
  const candidateSecondaryHeaders = rows[detectedHeaderRow + 1]?.map((value) => String(value || '').trim()) || [];
  const secondaryHeaders = isSecondaryHeaderCandidate(candidateSecondaryHeaders) ? candidateSecondaryHeaders : [];
  const normalizedHeaders = headers.map(normalizeHeader);
  const profiles = buildColumnProfiles(rows, detectedHeaderRow, headers.length);
  const detectedColumns = classifyColumns({
    headers,
    secondaryHeaders,
    normalizedHeaders,
    profiles,
    normalizedMemberNames,
  });
  const dataStartRow = findDataStartRow(rows, detectedHeaderRow, detectedColumns);

  const parsedRows = [];
  let skippedRowsCount = 0;

  rows.slice(dataStartRow).forEach((cells, offset) => {
    const rowIndex = dataStartRow + offset + 1;
    const parsed = parseDataRow({
      rowIndex,
      cells,
      headers,
      detectedColumns,
      normalizedMemberNames,
    });
    if (!parsed) return;
    if (parsed.status === 'skipped') skippedRowsCount += 1;
    parsedRows.push(parsed);
  });

  return {
    rows: parsedRows,
    diagnostics: {
      detectedHeaderRow: detectedHeaderRow + 1,
      detectedColumns: serializeDetectedColumns(detectedColumns, headers),
      skippedRowsCount,
    },
  };
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

  if (/^\d{1,3}(?:[.,]\d{3})+$/.test(cleaned)) return Number(cleaned.replace(/[.,]/g, ''));
  if (/^\d+(?:[.,]\d+)?$/.test(cleaned)) return Number(cleaned.replace(',', '.'));
  return parseVietnameseAmount(cleaned);
}

function sheetToRows(sheet) {
  const rows = xlsx.utils.sheet_to_json(sheet, { header: 1, raw: true, defval: '' });
  for (const merge of sheet['!merges'] || []) {
    const value = rows[merge.s.r]?.[merge.s.c];
    if (value === undefined || value === '') continue;
    for (let row = merge.s.r; row <= merge.e.r; row += 1) {
      rows[row] ||= [];
      for (let col = merge.s.c; col <= merge.e.c; col += 1) {
        if (rows[row][col] === undefined || rows[row][col] === '') rows[row][col] = value;
      }
    }
  }
  return rows;
}

function parseDataRow({ rowIndex, cells, headers, detectedColumns, normalizedMemberNames }) {
  const populatedCells = cells.filter((cell) => hasValue(cell));
  if (populatedCells.length === 0) return null;

  const rowText = cells.map((cell) => normalizeHeader(cell)).filter(Boolean);
  if (shouldSkipRow(cells, rowText, detectedColumns)) return skippedRow(rowIndex, cells, headers, 'metadata');

  const amount = parseAmountFromColumns(cells, detectedColumns);
  const title = inferTitle(cells, detectedColumns, normalizedMemberNames);
  const payerInfo = inferPayer(cells, detectedColumns);
  const participantInfo = inferParticipants(cells, detectedColumns, payerInfo);
  const rawCategory = getString(cells[detectedColumns.category]);
  const category = normalizeCategory(rawCategory);
  const date = parseDate(cells[detectedColumns.date]);
  const warnings = [];

  if (!date) warnings.push('Thiếu hoặc không đọc được ngày chi.');
  if (!rawCategory) warnings.push('Danh mục được gán mặc định.');
  if (rawCategory && category === 'other' && safeLower(rawCategory) !== 'other') {
    warnings.push('Danh mục không nhận diện được, đã gán mặc định.');
  }
  if (title.source !== 'explicit' && title.value) warnings.push('Đã suy luận tên khoản chi.');
  if (payerInfo.confidence < 0.8 && payerInfo.name) warnings.push('Người trả được suy luận, vui lòng kiểm tra lại.');
  if (participantInfo.inferred) warnings.push('Đã suy luận người tham gia từ các cột thành viên.');

  const meaningfulText = Boolean(title.value);
  if (!amount && !meaningfulText) return skippedRow(rowIndex, cells, headers, 'empty_financial_row');

  return {
    rowIndex,
    title: title.value,
    amount,
    paidBySourceName: payerInfo.name,
    payerConfidence: payerInfo.confidence,
    participantSourceNames: participantInfo.names,
    date,
    category,
    splitType: participantInfo.shares.length > 0 && participantInfo.shares.length === participantInfo.names.length ? 'exact' : 'equal',
    shares: participantInfo.shares,
    warnings,
    errors: [],
    raw: toRawObject(headers, cells),
  };
}

function findHeaderRow(rows, normalizedMemberNames) {
  let best = { index: -1, score: -1 };
  rows.slice(0, 20).forEach((row, index) => {
    const normalizedCells = row.map(normalizeHeader);
    const aliasHits = normalizedCells.filter((cell) => SYSTEM_HEADERS.has(cell)).length;
    const memberHits = normalizedCells.filter((cell) => normalizedMemberNames.has(cell)).length;
    const uniqueCells = new Set(normalizedCells.filter(Boolean)).size;
    const populated = normalizedCells.filter(Boolean).length;
    const numericCells = row.filter((cell) => parseImportAmount(cell) > 0).length;
    const score = aliasHits * 5 + memberHits * 3 + Math.min(uniqueCells, 6) - numericCells - (populated <= 1 ? 3 : 0);
    if (score > best.score) best = { index, score };
  });
  return best.score >= 3 ? best.index : -1;
}

function classifyColumns({ headers, secondaryHeaders, normalizedHeaders, profiles, normalizedMemberNames }) {
  const directIndex = (field) => normalizedHeaders.findIndex((header) => COLUMN_ALIASES[field].includes(header));
  const groupedMemberHeaders = expandGroupedHeaders(headers);
  const memberColumns = headers
    .map((header, index) => ({
      header,
      groupHeader: groupedMemberHeaders[index],
      subHeader: secondaryHeaders[index],
      normalized: normalizedHeaders[index],
      normalizedGroupHeader: normalizeHeader(groupedMemberHeaders[index]),
      normalizedSubHeader: normalizeHeader(secondaryHeaders[index]),
      index,
      profile: profiles[index],
    }))
    .filter(({ normalized, normalizedGroupHeader, normalizedSubHeader, profile }) => {
      if (SYSTEM_HEADERS.has(normalized)) return false;
      const groupMatchesMember = normalizedMemberNames.has(normalizedGroupHeader);
      const headerMatchesMember = normalizedMemberNames.has(normalized);
      const numericHeavy = profile.numericCount >= Math.max(2, profile.textCount);
      const markerHeavy = profile.markerCount >= 1 && profile.markerCount >= profile.textCount;
      const hasMemberSubHeader = PAYER_MARKERS.includes(normalizedSubHeader) || PARTICIPANT_MARKERS.includes(normalizedSubHeader);
      return headerMatchesMember || groupMatchesMember || (hasMemberSubHeader && Boolean(normalizedGroupHeader)) || numericHeavy || markerHeavy;
    });

  const excluded = new Set([
    directIndex('amount'),
    directIndex('payer'),
    directIndex('date'),
    directIndex('category'),
    directIndex('participants'),
    ...memberColumns.map((column) => column.index),
  ].filter((index) => index >= 0));

  const title = directIndex('title');
  const inferredTitle = title >= 0
    ? title
    : profiles
      .map((profile, index) => ({ index, score: titleColumnScore(profile, normalizedHeaders[index], excluded.has(index)) }))
      .sort((left, right) => right.score - left.score)[0]?.index ?? -1;

  return {
    title: inferredTitle,
    amount: directIndex('amount'),
    payer: directIndex('payer'),
    date: directIndex('date'),
    category: directIndex('category'),
    participants: directIndex('participants'),
    memberColumns,
  };
}

function buildColumnProfiles(rows, headerRowIndex, columnCount) {
  return Array.from({ length: columnCount }, (_, index) => {
    const sample = rows.slice(headerRowIndex + 1, Math.min(rows.length, headerRowIndex + 21)).map((row) => row[index]);
    return sample.reduce((profile, cell) => {
      const normalized = normalizeHeader(cell);
      if (!normalized) return profile;
      profile.populatedCount += 1;
      if (parseImportAmount(cell) > 0) profile.numericCount += 1;
      else if (PAYER_MARKERS.includes(normalized) || PARTICIPANT_MARKERS.includes(normalized)) profile.markerCount += 1;
      else profile.textCount += 1;
      if (isMeaningfulText(cell)) profile.meaningfulTextCount += 1;
      return profile;
    }, {
      populatedCount: 0,
      numericCount: 0,
      markerCount: 0,
      textCount: 0,
      meaningfulTextCount: 0,
    });
  });
}

function titleColumnScore(profile, normalizedHeader, excluded) {
  if (excluded || !profile) return -1;
  if (SYSTEM_HEADERS.has(normalizedHeader)) return -1;
  return profile.meaningfulTextCount * 3 + profile.textCount - profile.numericCount * 2 - profile.markerCount * 2;
}

function findDataStartRow(rows, headerRowIndex, detectedColumns) {
  for (let index = headerRowIndex + 1; index < rows.length; index += 1) {
    const row = rows[index];
    if (isLikelySecondaryHeaderRow(row, detectedColumns)) continue;
    const amount = parseAmountFromColumns(row, detectedColumns);
    const hasMeaningfulText = row.some((cell, cellIndex) => cellIndex !== detectedColumns.amount && isMeaningfulText(cell));
    if (amount > 0 || hasMeaningfulText) return index;
  }
  return headerRowIndex + 1;
}

function parseAmountFromColumns(cells, detectedColumns) {
  if (detectedColumns.amount >= 0) return parseImportAmount(cells[detectedColumns.amount]);
  const numericCandidates = cells
    .map((cell, index) => ({ index, value: parseImportAmount(cell) }))
    .filter(({ index, value }) => value > 0 && !detectedColumns.memberColumns.some((column) => column.index === index));
  return numericCandidates.sort((left, right) => right.value - left.value)[0]?.value || 0;
}

function inferTitle(cells, detectedColumns, normalizedMemberNames) {
  const explicit = getString(cells[detectedColumns.title]);
  if (isExplicitTitle(explicit)) return { value: explicit, source: 'explicit' };

  const candidateIndexes = cells
    .map((cell, index) => ({ cell, index }))
    .filter(({ index }) => !detectedColumns.memberColumns.some((column) => column.index === index))
    .filter(({ index }) => ![
      detectedColumns.amount,
      detectedColumns.payer,
      detectedColumns.date,
      detectedColumns.participants,
    ].includes(index));

  const candidate = candidateIndexes.find(({ cell }) => isUsableTitle(cell, normalizedMemberNames));
  if (candidate) return { value: getString(candidate.cell), source: 'inferred_text' };

  const categoryLike = getString(cells[detectedColumns.category]);
  if (isUsableTitle(categoryLike, normalizedMemberNames)) return { value: categoryLike, source: 'category' };

  return { value: '', source: 'none' };
}

function inferPayer(cells, detectedColumns) {
  const explicit = getString(cells[detectedColumns.payer]);
  if (explicit) return { name: explicit, confidence: 1 };

  const marked = detectedColumns.memberColumns.find((column) => PAYER_MARKERS.includes(normalizeHeader(cells[column.index])));
  if (marked) return { name: memberColumnName(marked), confidence: 0.95 };

  const numericContributors = detectedColumns.memberColumns
    .filter((column) => PAYER_MARKERS.includes(column.normalizedSubHeader) || !column.normalizedSubHeader)
    .map((column) => ({ column, amount: parseMemberAmount(cells[column.index]) }))
    .filter(({ amount }) => amount > 0)
    .sort((left, right) => right.amount - left.amount);
  if (numericContributors.length > 0 && numericContributors[0].amount > (numericContributors[1]?.amount || 0)) {
    return { name: memberColumnName(numericContributors[0].column), confidence: 0.65 };
  }

  return { name: '', confidence: 0 };
}

function inferParticipants(cells, detectedColumns, payerInfo) {
  const explicitParticipants = splitNames(getString(cells[detectedColumns.participants]));
  if (explicitParticipants.length > 0) return { names: uniqueNames(explicitParticipants), shares: [], inferred: false };

  const shares = detectedColumns.memberColumns
    .filter((column) => PARTICIPANT_MARKERS.includes(column.normalizedSubHeader) || !column.normalizedSubHeader)
    .map((column) => ({ sourceName: memberColumnName(column), shareAmount: parseMemberAmount(cells[column.index]) }))
    .filter(({ shareAmount }) => shareAmount > 0);
  if (shares.length > 0) {
    return {
      names: uniqueNames(shares.map((share) => share.sourceName)),
      shares,
      inferred: true,
    };
  }

  const debtMarkers = detectedColumns.memberColumns
    .filter((column) => PARTICIPANT_MARKERS.includes(normalizeHeader(cells[column.index])))
    .map((column) => memberColumnName(column));
  if (debtMarkers.length > 0) return { names: uniqueNames(debtMarkers), shares: [], inferred: true };

  const allMembers = detectedColumns.memberColumns.map((column) => memberColumnName(column));
  const canFallbackToAll = allMembers.length >= 2 && payerInfo.confidence >= 0.8;
  return {
    names: canFallbackToAll ? uniqueNames(allMembers) : [],
    shares: [],
    inferred: canFallbackToAll,
  };
}

function shouldSkipRow(cells, rowText, detectedColumns) {
  const populated = cells.filter((cell) => hasValue(cell));
  if (populated.length === 0) return true;
  if (populated.length === 1 && isMeaningfulText(populated[0])) return true;
  if (rowText.some((text) => SUMMARY_TERMS.includes(text))) return true;
  if (populated.every((cell) => SEPARATOR_RE.test(String(cell).trim()))) return true;
  if (isLegacyFooterRow(cells, detectedColumns)) return true;
  return false;
}

function skippedRow(rowIndex, cells, headers, skipReason) {
  return {
    rowIndex,
    title: '',
    amount: 0,
    paidBySourceName: '',
    payerConfidence: 0,
    participantSourceNames: [],
    date: null,
    category: 'other',
    splitType: 'equal',
    shares: [],
    status: 'skipped',
    skipReason,
    warnings: [],
    errors: [],
    raw: toRawObject(headers, cells),
  };
}

function serializeDetectedColumns(columns, headers) {
  return {
    title: headerInfo(columns.title, headers),
    amount: headerInfo(columns.amount, headers),
    payer: headerInfo(columns.payer, headers),
    date: headerInfo(columns.date, headers),
    category: headerInfo(columns.category, headers),
    participants: headerInfo(columns.participants, headers),
    memberColumns: columns.memberColumns.map((column) => ({
      index: column.index,
      header: memberColumnName(column),
      ...(column.subHeader ? { subHeader: column.subHeader } : {}),
    })),
  };
}

function headerInfo(index, headers) {
  return index >= 0 ? { index, header: headers[index] } : null;
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

function parseDate(value) {
  if (!value) return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString().slice(0, 10);
  if (typeof value === 'number') {
    const parsed = xlsx.SSF.parse_date_code(value);
    if (parsed) return new Date(Date.UTC(parsed.y, parsed.m - 1, parsed.d)).toISOString().slice(0, 10);
  }
  const text = String(value).trim();
  const dayMonthYear = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (dayMonthYear) {
    const [, day, month, year] = dayMonthYear;
    return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day))).toISOString().slice(0, 10);
  }
  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString().slice(0, 10);
}

function isUsableTitle(value, normalizedMemberNames) {
  const normalized = normalizeHeader(value);
  return isMeaningfulText(value)
    && !normalizedMemberNames.has(normalized)
    && !PAYER_MARKERS.includes(normalized)
    && !PARTICIPANT_MARKERS.includes(normalized)
    && !SUMMARY_TERMS.includes(normalized);
}

function isMeaningfulText(value) {
  const text = getString(value);
  const normalized = normalizeHeader(text);
  return Boolean(text)
    && !looksLikeStandaloneAmount(text)
    && !SEPARATOR_RE.test(text)
    && !SUMMARY_TERMS.includes(normalized)
    && normalized.length >= 2;
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

function toRawObject(headers, cells) {
  return Object.fromEntries(headers.map((header, index) => [header || `Cột ${index + 1}`, cells[index] ?? '']));
}

function getString(value) {
  return String(value ?? '').trim();
}

function hasValue(value) {
  return value !== null && value !== undefined && String(value).trim() !== '';
}

function emptyAnalysis() {
  return {
    rows: [],
    diagnostics: {
      detectedHeaderRow: null,
      detectedColumns: {},
      skippedRowsCount: 0,
    },
  };
}

function isExplicitTitle(value) {
  const normalized = normalizeHeader(value);
  return Boolean(getString(value))
    && !looksLikeStandaloneAmount(value)
    && !SUMMARY_TERMS.includes(normalized);
}

function looksLikeStandaloneAmount(value) {
  const normalized = safeLower(value).replace(/\s+/g, ' ').trim();
  return /^-?\d[\d.,]*(?:\s*(k|tr|trieu|m|cu|nghin|vnd|d))?$/.test(normalized);
}

function isLegacyFooterRow(cells, detectedColumns) {
  const title = normalizeHeader(cells[detectedColumns.title]);
  const amountText = normalizeHeader(cells[detectedColumns.amount]);
  const payer = normalizeHeader(cells[detectedColumns.payer]);
  const dateText = normalizeHeader(cells[detectedColumns.date]);
  const memberNames = new Set(detectedColumns.memberColumns.map((column) => normalizeHeader(memberColumnName(column))));
  const hasMemberValues = detectedColumns.memberColumns.some((column) => hasValue(cells[column.index]));

  if (title.includes('tong chi cua cac thanh vien')) return true;
  if (title.includes('goi y chia tien')) return true;
  if (title.startsWith('(dua vao cac khoan chi')) return true;
  if (amountText === 'dang no') return true;
  if (memberNames.has(title) && parseImportAmount(cells[detectedColumns.amount]) > 0 && !payer && !dateText && !hasMemberValues) return true;
  return false;
}

function expandGroupedHeaders(headers) {
  let current = '';
  return headers.map((header) => {
    const normalized = getString(header);
    if (normalized) current = normalized;
    return current;
  });
}

function isLikelySecondaryHeaderRow(row, detectedColumns) {
  const memberCells = detectedColumns.memberColumns.map((column) => normalizeHeader(row[column.index])).filter(Boolean);
  if (memberCells.length === 0) return false;
  return memberCells.every((cell) => PAYER_MARKERS.includes(cell) || PARTICIPANT_MARKERS.includes(cell));
}

function isSecondaryHeaderCandidate(row) {
  const populated = row.map(normalizeHeader).filter(Boolean);
  const markerCount = populated.filter((cell) => PAYER_MARKERS.includes(cell) || PARTICIPANT_MARKERS.includes(cell)).length;
  return markerCount >= 2 && markerCount >= Math.ceil(populated.length / 2);
}

function memberColumnName(column) {
  return column.groupHeader || column.header;
}

function parseMemberAmount(value) {
  const raw = String(value ?? '').trim();
  if (!raw || raw === '-') return 0;
  return parseImportAmount(raw.replace(/^-/, ''));
}
