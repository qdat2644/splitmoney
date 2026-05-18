import express from 'express';
import { exportRoom, exportMe } from '../controllers/exportController.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import { requireRoomMember } from '../middleware/roomMiddleware.js';

const router = express.Router();
router.use(requireAuth);

// GET /api/export/me?format=csv|json
router.get('/me', exportMe);

// GET /api/export/rooms/:roomId?format=csv|json
router.get('/rooms/:roomId', requireRoomMember, exportRoom);

export default router;
