import { createImportPreview } from '../services/import/importPreviewService.js';
import { commitImport } from '../services/import/importCommitService.js';

export const previewImport = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Vui lòng tải lên file Excel.' });
    if (!req.file.originalname.toLowerCase().endsWith('.xlsx')) return res.status(400).json({ error: 'Hiện chỉ hỗ trợ file .xlsx.' });

    const preview = await createImportPreview({
      roomId: req.params.roomId,
      userId: req.user.userId,
      fileBuffer: req.file.buffer,
    });
    res.json(preview);
  } catch (error) {
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
    res.json(result);
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message || 'Không thể nhập dữ liệu.' });
  }
};
