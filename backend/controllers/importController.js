import { createImportPreview } from '../services/import/importPreviewService.js';
import { commitImport } from '../services/import/importCommitService.js';
import { recordOperationalEvent } from '../services/operationalEventService.js';

export const previewImport = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Vui lòng tải lên file Excel.' });
    if (!req.file.originalname.toLowerCase().endsWith('.xlsx')) return res.status(400).json({ error: 'Hiện chỉ hỗ trợ file .xlsx.' });

    const preview = await createImportPreview({
      roomId: req.params.roomId,
      userId: req.user.userId,
      fileBuffer: req.file.buffer,
    });
    const stats = summarizeImportPreview(preview);

    recordOperationalEvent({
      type: 'import.preview',
      source: 'import',
      severity: stats.errorRows > 0 || stats.warningRows >= 3 ? 'warning' : 'info',
      userId: req.user.userId,
      roomId: req.params.roomId,
      metadata: stats,
    }).catch(() => {});

    res.json(preview);
  } catch (error) {
    recordImportFailure({ req, error, phase: 'preview' });
    res.status(error.status || 500).json({ error: error.message || 'Không thể đọc file Excel.' });
  }
};

export const commitImportedRows = async (req, res) => {
  try {
    const result = await commitImport({
      importId: req.body.importId,
      roomId: req.params.roomId,
      userId: req.user.userId,
      memberMappings: req.body.memberMappings,
      selectedRows: req.body.selectedRows,
    });

    recordOperationalEvent({
      type: 'import.commit',
      source: 'import',
      severity: result.skippedRows > 0 || result.errors?.length ? 'warning' : 'info',
      userId: req.user.userId,
      roomId: req.params.roomId,
      metadata: {
        createdExpenses: result.createdExpenses,
        createdGuests: result.createdGuests,
        skippedRows: result.skippedRows,
        totalAmount: result.totalAmount,
        errors: result.errors?.length || 0,
      },
    }).catch(() => {});

    res.json(result);
  } catch (error) {
    recordImportFailure({ req, error, phase: 'commit' });
    res.status(error.status || 500).json({ error: error.message || 'Không thể nhập dữ liệu.' });
  }
};

function recordImportFailure({ req, error, phase }) {
  const payload = {
    phase,
    status: error.status || 500,
  };

  recordOperationalEvent({
    type: 'security.suspicious_import_failure',
    source: 'security',
    severity: 'warning',
    userId: req.user?.userId,
    roomId: req.params.roomId,
    metadata: payload,
  }).catch(() => {});

  recordOperationalEvent({
    type: `import.${phase}_failed`,
    source: 'import',
    severity: 'error',
    userId: req.user?.userId,
    roomId: req.params.roomId,
    metadata: payload,
  }).catch(() => {});
}

function summarizeImportPreview(preview) {
  const rows = preview.rows || [];
  const members = preview.members || [];
  const confidenceValues = rows
    .map((row) => Number(row.confidence))
    .filter((value) => Number.isFinite(value));

  return {
    totalRows: rows.length,
    validRows: rows.filter((row) => row.status === 'valid').length,
    warningRows: rows.filter((row) => row.status === 'warning').length,
    errorRows: rows.filter((row) => row.status === 'error').length,
    skippedRows: rows.filter((row) => row.status === 'skipped').length,
    unresolvedMappings: members.filter((member) => !member.match || member.match.type === 'none').length,
    averageConfidence: confidenceValues.length
      ? Number((confidenceValues.reduce((sum, value) => sum + value, 0) / confidenceValues.length).toFixed(3))
      : null,
  };
}
