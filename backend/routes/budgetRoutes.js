import express from 'express';
import { getBudgets, setBudget, removeBudget, getBudgetStatus } from '../controllers/budgetController.js';
import { requireAuth } from '../middleware/authMiddleware.js';

const router = express.Router();
router.use(requireAuth);

router.get('/',              getBudgets);      // GET  /api/budgets
router.post('/',             setBudget);       // POST /api/budgets (upsert)
router.get('/status',        getBudgetStatus); // GET  /api/budgets/status?month=5&year=2026
router.delete('/:budgetId',  removeBudget);   // DELETE /api/budgets/:id

export default router;
