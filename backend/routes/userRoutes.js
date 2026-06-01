import express from 'express';
import {
  getPersonalSummary,
  getPersonalInsights,
  getCopilotWorkspace,
  getDashboard,
  getForecasts,
  updateProfile,
  changeUserPassword,
} from '../controllers/userController.js';
import { blockSuspended, requireAuth } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(requireAuth);

// GET /api/users/me/dashboard  ← consolidated endpoint (summary + analytics + insights in one round-trip)
router.get('/me/dashboard', getDashboard);

// GET /api/users/me/forecasts
router.get('/me/forecasts', getForecasts);

// PATCH /api/users/me/profile
router.patch('/me/profile', blockSuspended, updateProfile);

// POST /api/users/me/change-password
router.post('/me/change-password', blockSuspended, changeUserPassword);

// GET /api/users/me/summary
router.get('/me/summary', getPersonalSummary);

// GET /api/users/me/insights
router.get('/me/insights', getPersonalInsights);
router.get('/me/copilot', getCopilotWorkspace);

export default router;
