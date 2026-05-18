import express from 'express';
import { getPersonalSummary, getPersonalInsights } from '../controllers/userController.js';
import { requireAuth } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(requireAuth);

// GET /api/users/me/summary
router.get('/me/summary', getPersonalSummary);

// GET /api/users/me/insights
router.get('/me/insights', getPersonalInsights);

export default router;
