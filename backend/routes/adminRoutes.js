import express from 'express';
import {
  getAdminOverview,
  getAdminImports,
  getAdminAi,
  getAdminSecurity,
  getAdminRoom,
  getAdminUser,
  getAdminUsers,
  getAdminRooms,
  getAdminTrends,
  getAdminAuditLog,
  postSuspendUser,
  postReactivateUser,
  postAssignRole,
  postArchiveRoom,
  postReopenRoom,
  postRecomputeAiProfile,
} from '../controllers/adminController.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import { requireAdmin } from '../middleware/adminMiddleware.js';

const router = express.Router();

router.use(requireAuth);
router.use(requireAdmin);

// Read-only observability
router.get('/overview', getAdminOverview);
router.get('/imports', getAdminImports);
router.get('/ai', getAdminAi);
router.get('/security', getAdminSecurity);
router.get('/trends', getAdminTrends);
router.get('/audit', getAdminAuditLog);

// Listings with search/filter
router.get('/users', getAdminUsers);
router.get('/rooms', getAdminRooms);

// Inspectors
router.get('/rooms/:roomId', getAdminRoom);
router.get('/users/:userId', getAdminUser);

// Controlled mutations
router.post('/users/suspend', postSuspendUser);
router.post('/users/reactivate', postReactivateUser);
router.post('/users/assign-role', postAssignRole);
router.post('/rooms/archive', postArchiveRoom);
router.post('/rooms/reopen', postReopenRoom);
router.post('/ai/recompute-profile', postRecomputeAiProfile);

export default router;
