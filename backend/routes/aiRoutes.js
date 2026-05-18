import express from 'express';
import { parseExpense } from '../controllers/aiController.js';

import { requireAuth } from '../middleware/authMiddleware.js';
import { requireRoomMember } from '../middleware/roomMiddleware.js';

const router = express.Router({ mergeParams: true });

router.use(requireAuth);
router.use(requireRoomMember);

router.post('/parse-expense', parseExpense);

export default router;
