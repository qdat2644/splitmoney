import express from 'express';
import multer from 'multer';
import { previewImport, commitImportedRows } from '../controllers/importController.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import { requireRoomMember } from '../middleware/roomMiddleware.js';

const router = express.Router({ mergeParams: true });
const MAX_IMPORT_FILE_SIZE_BYTES = 5 * 1024 * 1024;
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_IMPORT_FILE_SIZE_BYTES },
});

router.use(requireAuth);
router.use(requireRoomMember);

router.post('/preview', handleImportUpload, previewImport);
router.post('/commit', commitImportedRows);

export default router;

function handleImportUpload(req, res, next) {
  upload.single('file')(req, res, (error) => {
    if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ error: 'File Excel không được vượt quá 5MB.' });
    }
    if (error) return next(error);
    return next();
  });
}
