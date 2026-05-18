import express from 'express';
import { getPersonalAnalytics } from '../controllers/analyticsController.js';
import { requireAuth } from '../middleware/authMiddleware.js';

const router = express.Router();
router.use(requireAuth);
router.get('/me/analytics', getPersonalAnalytics);

export default router;
