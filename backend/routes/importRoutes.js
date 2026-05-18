import express from 'express';
import multer from 'multer';
import { previewImport, commitImportedRows } from '../controllers/importController.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import { requireRoomMember } from '../middleware/roomMiddleware.js';

const router = express.Router({ mergeParams: true });
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

router.use(requireAuth);
router.use(requireRoomMember);

router.post('/preview', upload.single('file'), previewImport);
router.post('/commit', commitImportedRows);

export default router;
