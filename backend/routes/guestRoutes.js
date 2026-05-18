import express from 'express';
import { getGuests, createGuest, updateGuest, deleteGuest } from '../controllers/guestController.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import { requireRoomMember, requireRoomOwner } from '../middleware/roomMiddleware.js';

const router = express.Router({ mergeParams: true });

router.use(requireAuth);
router.use(requireRoomMember);

router.get('/', getGuests);
router.post('/', requireRoomOwner, createGuest);
router.put('/:guestId', requireRoomOwner, updateGuest);
router.delete('/:guestId', requireRoomOwner, deleteGuest);

export default router;
