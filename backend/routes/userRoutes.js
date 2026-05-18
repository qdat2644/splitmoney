import express from 'express';
import { getPersonalSummary, getPersonalInsights, getCopilotWorkspace } from '../controllers/userController.js';
import { requireAuth } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(requireAuth);

// GET /api/users/me/summary
router.get('/me/summary', getPersonalSummary);

// GET /api/users/me/insights
router.get('/me/insights', getPersonalInsights);
router.get('/me/copilot', getCopilotWorkspace);

export default router;
