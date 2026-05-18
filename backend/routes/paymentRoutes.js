// paymentRoutes.js
import express from 'express';
import { getPayments, addPayment, removePayment } from '../controllers/paymentController.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import { requireRoomMember } from '../middleware/roomMiddleware.js';

const router = express.Router({ mergeParams: true }); // inherit :roomId

router.use(requireAuth);
router.use(requireRoomMember); // enforces approved membership + room isolation

// GET  /api/rooms/:roomId/payments
router.get('/',             getPayments);
// POST /api/rooms/:roomId/payments
router.post('/',            addPayment);
// DELETE /api/rooms/:roomId/payments/:paymentId
router.delete('/:paymentId', removePayment);

export default router;
