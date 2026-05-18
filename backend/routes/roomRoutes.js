import express from 'express';
import { createRoom, getRooms, getRoom, joinRoom, getMembers, approveMember, rejectMember, removeMember, getRoomGuestsByCode } from '../controllers/roomController.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import { requireRoomMember, requireRoomOwner } from '../middleware/roomMiddleware.js';

const router = express.Router();

router.use(requireAuth);

router.post('/', createRoom);
router.get('/', getRooms);
router.post('/join', joinRoom);
router.get('/code/:code/guests', getRoomGuestsByCode);

router.get('/:roomId', requireRoomMember, getRoom);
router.get('/:roomId/members', requireRoomMember, getMembers);

// Owner routes
router.post('/:roomId/approve', requireRoomOwner, approveMember);
router.post('/:roomId/reject', requireRoomOwner, rejectMember);
router.delete('/:roomId/members/:userId', requireRoomOwner, removeMember);

export default router;
