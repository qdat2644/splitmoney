import express from 'express';
import { getExpenses, addExpense, updateExpense, deleteExpense } from '../controllers/expenseController.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import { requireRoomMember } from '../middleware/roomMiddleware.js';

const router = express.Router({ mergeParams: true });

router.use(requireAuth);
router.use(requireRoomMember);

router.get('/', getExpenses);
router.post('/', addExpense);
router.put('/:expenseId', updateExpense);
router.delete('/:expenseId', deleteExpense);

export default router;
