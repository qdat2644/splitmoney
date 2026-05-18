import express from 'express';
import {
  getPlans, postPlan, patchPlan, removePlan,
  postPlanExpense, patchPlanExpense, removePlanExpense, convertPlanExpense, patchPlanParticipants,
} from '../controllers/planController.js';
import { requireAuth } from '../middleware/authMiddleware.js';

const router = express.Router();
router.use(requireAuth);

// Plans
router.get('/',                                  getPlans);      // GET  /api/plans
router.post('/',                                 postPlan);      // POST /api/plans
router.patch('/:planId',                         patchPlan);     // PATCH /api/plans/:planId
router.patch('/:planId/participants',            patchPlanParticipants);
router.delete('/:planId',                        removePlan);    // DELETE /api/plans/:planId

// Plan expenses
router.post('/:planId/expenses',                 postPlanExpense);    // POST /api/plans/:planId/expenses
router.patch('/expenses/:planExpenseId',         patchPlanExpense);   // PATCH /api/plans/expenses/:id
router.delete('/expenses/:planExpenseId',         removePlanExpense);  // DELETE /api/plans/expenses/:id
router.post('/expenses/:planExpenseId/convert',  convertPlanExpense); // POST /api/plans/expenses/:id/convert

// AI Planning
import { generateAIPlan } from '../controllers/planController.js';
router.post('/ai/generate', generateAIPlan);

export default router;
