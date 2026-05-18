import { beforeEach, describe, expect, it, vi } from 'vitest';
import xlsx from 'xlsx';

const prisma = {
  roomMember: { findMany: vi.fn() },
  guestMember: { findMany: vi.fn(), create: vi.fn() },
  expense: { findMany: vi.fn(), create: vi.fn() },
};

vi.mock('../utils/db.js', () => ({ default: prisma }));
vi.mock('../services/intelligence/personalFinanceProfileService.js', () => ({
  invalidateProfileCache: vi.fn(() => Promise.resolve()),
}));

const {
  parseWorkbookBuffer,
  parseImportAmount,
  analyzeWorksheetRows,
} = await import('../services/import/excelImportParser.js');
const {
  suggestMemberMatch,
} = await import('../services/import/memberResolver.js');
const {
  validatePreviewRows,
} = await import('../services/import/importValidators.js');
const {
  clearImportSessions,
  createImportSession,
} = await import('../services/import/importPreviewService.js');
const {
  commitImport,
} = await import('../services/import/importCommitService.js');

describe('room-scoped excel import services', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearImportSessions();
    prisma.roomMember.findMany.mockResolvedValue([{ userId: 'u-dat' }, { userId: 'u-tea' }]);
    prisma.guestMember.findMany.mockResolvedValue([{ id: 'g-tuan' }]);
    prisma.guestMember.create.mockResolvedValue({ id: 'g-lan' });
    prisma.expense.create.mockResolvedValue({
      id: 'e-1',
      participants: [
        { userId: 'u-dat', guestMemberId: null, shareAmount: 50000 },
        { userId: 'u-tea', guestMemberId: null, shareAmount: 50000 },
      ],
    });
  });

  it('parses a simple Excel workbook', () => {
    const workbook = xlsx.utils.book_new();
    const sheet = xlsx.utils.aoa_to_sheet([
      ['Tên khoản chi', 'Số tiền', 'Người trả', 'Người tham gia', 'Ngày', 'Danh mục'],
      ['Cafe', '100k', 'Đạt', 'Đạt, Trà', '2026-05-18', 'Đồ uống'],
    ]);
    xlsx.utils.book_append_sheet(workbook, sheet, 'Sheet1');
    const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    const { rows, diagnostics } = parseWorkbookBuffer(buffer, { memberNames: ['Đạt', 'Trà'] });
    const [row] = rows;
    expect(row.title).toBe('Cafe');
    expect(row.amount).toBe(100000);
    expect(row.paidBySourceName).toBe('Đạt');
    expect(row.participantSourceNames).toEqual(['Đạt', 'Trà']);
    expect(row.category).toBe('drinks');
    expect(diagnostics.detectedHeaderRow).toBe(1);
  });

  it('parses Vietnamese legacy amount formats', () => {
    expect(parseImportAmount('1,000,000')).toBe(1000000);
    expect(parseImportAmount('1.000.000')).toBe(1000000);
    expect(parseImportAmount('100k')).toBe(100000);
    expect(parseImportAmount('1tr')).toBe(1000000);
    expect(parseImportAmount('1tr2')).toBe(1200000);
    expect(parseImportAmount('1 triệu')).toBe(1000000);
  });

  it('matches names with and without accents', () => {
    const roomDirectory = [
      { type: 'user', id: 'u-dat', displayName: 'Đạt' },
      { type: 'guest', id: 'g-tuan', displayName: 'Tuấn' },
    ];
    expect(suggestMemberMatch('dat', roomDirectory)).toMatchObject({ type: 'user', id: 'u-dat', confidence: 1 });
    expect(suggestMemberMatch('Tuan', roomDirectory)).toMatchObject({ type: 'guest', id: 'g-tuan', confidence: 1 });
  });

  it('keeps unresolved members unmatched', () => {
    const roomDirectory = [
      { type: 'user', id: 'u-dat', displayName: 'Đạt' },
      { type: 'guest', id: 'g-tuan', displayName: 'Tuấn' },
    ];
    expect(suggestMemberMatch('Lan', roomDirectory)).toMatchObject({ type: 'none', id: null, confidence: 0 });
  });

  it('adds a duplicate-looking warning without blocking the row', () => {
    const [row] = validatePreviewRows([baseRow()], [{
      title: 'Cafe',
      amount: 100000,
      date: new Date('2026-05-18T00:00:00.000Z'),
      paidByUser: { name: 'Đạt' },
      paidByGuest: null,
    }]);
    expect(row.status).toBe('warning');
    expect(row.warnings).toContain('Có thể đã tồn tại khoản chi tương tự.');
  });

  it('skips metadata and summary rows around a merged-style legacy header', () => {
    const analysis = analyzeWorksheetRows([
      ['CHI TIÊU THÁNG 5', '', '', '', ''],
      ['', '', '', '', ''],
      ['Ngày', 'Số tiền', 'Trà', 'Đạt', 'Ghi chú'],
      ['2026-05-18', '250k', 'chi', '125000', 'ăn tối'],
      ['', '', '', '', ''],
      ['Tổng cộng', '250k', '', '', ''],
    ], { memberNames: ['Trà', 'Đạt'] });

    expect(analysis.diagnostics.detectedHeaderRow).toBe(3);
    expect(analysis.rows.filter((row) => row.status !== 'skipped')).toHaveLength(1);
    expect(analysis.diagnostics.skippedRowsCount).toBeGreaterThanOrEqual(1);
  });

  it('classifies room-member columns separately from descriptive columns', () => {
    const analysis = analyzeWorksheetRows([
      ['Ngày', 'Số tiền', 'Trà', 'Đạt', 'Ghi chú'],
      ['2026-05-18', '250k', 'chi', '125000', 'ăn tối'],
    ], { memberNames: ['Trà', 'Đạt'] });

    expect(analysis.diagnostics.detectedColumns.memberColumns).toEqual([
      { index: 2, header: 'Trà' },
      { index: 3, header: 'Đạt' },
    ]);
    expect(analysis.diagnostics.detectedColumns.title).toEqual({ index: 4, header: 'Ghi chú' });
  });

  it('infers a title from nearby descriptive text instead of member columns', () => {
    const analysis = analyzeWorksheetRows([
      ['Ngày', 'Số tiền', 'Trà', 'Đạt', 'Ghi chú'],
      ['2026-05-18', '250k', 'chi', '125000', 'tiền cọc phòng'],
    ], { memberNames: ['Trà', 'Đạt'] });
    const row = analysis.rows.find((item) => item.status !== 'skipped');

    expect(row.title).toBe('tiền cọc phòng');
    expect(row.paidBySourceName).toBe('Trà');
    expect(row.participantSourceNames).toEqual(['Đạt']);
  });

  it('downgrades recoverable missing title and participant issues to warnings', () => {
    const [row] = validatePreviewRows([{
      ...baseRow(),
      title: '',
      participantSourceNames: [],
      warnings: [],
      errors: [],
    }]);

    expect(row.status).toBe('warning');
    expect(row.errors).toEqual([]);
    expect(row.warnings).toContain('Chưa xác định chắc tên khoản chi.');
    expect(row.warnings).toContain('Chưa xác định chắc người tham gia.');
  });

  it('rejects mappings to members from another room', async () => {
    const session = createImportSession({
      roomId: 'room-a',
      userId: 'u-dat',
      rows: [baseRow()],
      summary: {},
    });
    const importId = session.importId;

    await expect(commitImport({
      importId,
      roomId: 'room-a',
      userId: 'u-dat',
      memberMappings: {
        Đạt: { type: 'user', id: 'u-foreign', displayName: 'Đạt' },
        Trà: { type: 'user', id: 'u-tea', displayName: 'Trà' },
      },
      selectedRows: [2],
    })).rejects.toMatchObject({ status: 400 });
  });

  it('creates guests when requested', async () => {
    prisma.guestMember.findMany
      .mockResolvedValueOnce([{ id: 'g-tuan' }])
      .mockResolvedValueOnce([{ id: 'g-tuan' }, { id: 'g-lan' }]);
    const session = createImportSession({
      roomId: 'room-a',
      userId: 'u-dat',
      rows: [{
        ...baseRow(),
        participantSourceNames: ['Đạt', 'Lan'],
      }],
      summary: {},
    });
    const importId = session.importId;

    const result = await commitImport({
      importId,
      roomId: 'room-a',
      userId: 'u-dat',
      memberMappings: {
        Đạt: { type: 'user', id: 'u-dat', displayName: 'Đạt' },
        Lan: { type: 'create_guest', id: null, displayName: 'Lan' },
      },
      selectedRows: [2],
    });

    expect(result.createdGuests).toBe(1);
    expect(prisma.guestMember.create).toHaveBeenCalledWith({
      data: { roomId: 'room-a', displayName: 'Lan', createdByUserId: 'u-dat' },
    });
  });

  it('preserves roomId on imported expenses', async () => {
    const session = createImportSession({
      roomId: 'room-a',
      userId: 'u-dat',
      rows: [baseRow()],
      summary: {},
    });
    const importId = session.importId;

    await commitImport({
      importId,
      roomId: 'room-a',
      userId: 'u-dat',
      memberMappings: {
        Đạt: { type: 'user', id: 'u-dat', displayName: 'Đạt' },
        Trà: { type: 'user', id: 'u-tea', displayName: 'Trà' },
      },
      selectedRows: [2],
    });

    expect(prisma.expense.create.mock.calls[0][0].data.roomId).toBe('room-a');
  });

  it('does not commit the same import session twice', async () => {
    const session = createImportSession({
      roomId: 'room-a',
      userId: 'u-dat',
      rows: [baseRow()],
      summary: {},
    });
    const importId = session.importId;
    const payload = {
      importId,
      roomId: 'room-a',
      userId: 'u-dat',
      memberMappings: {
        Đạt: { type: 'user', id: 'u-dat', displayName: 'Đạt' },
        Trà: { type: 'user', id: 'u-tea', displayName: 'Trà' },
      },
      selectedRows: [2],
    };

    await commitImport(payload);
    await expect(commitImport(payload)).rejects.toMatchObject({ status: 409 });
  });

  it('skips invalid rows safely', async () => {
    const session = createImportSession({
      roomId: 'room-a',
      userId: 'u-dat',
      rows: [{ ...baseRow(), status: 'error' }],
      summary: {},
    });
    const importId = session.importId;

    const result = await commitImport({
      importId,
      roomId: 'room-a',
      userId: 'u-dat',
      memberMappings: {
        Đạt: { type: 'user', id: 'u-dat', displayName: 'Đạt' },
        Trà: { type: 'user', id: 'u-tea', displayName: 'Trà' },
      },
      selectedRows: [2],
    });

    expect(result.createdExpenses).toBe(0);
    expect(result.skippedRows).toBe(1);
    expect(prisma.expense.create).not.toHaveBeenCalled();
  });
});

function baseRow() {
  return {
    rowIndex: 2,
    title: 'Cafe',
    amount: 100000,
    paidBySourceName: 'Đạt',
    participantSourceNames: ['Đạt', 'Trà'],
    date: '2026-05-18',
    category: 'drinks',
    splitType: 'equal',
    shares: [],
    status: 'valid',
    warnings: [],
    errors: [],
    raw: {},
  };
}
