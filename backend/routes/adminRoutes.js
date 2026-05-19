import express from 'express';
import {
  getAdminAi,
  getAdminImports,
  getAdminOverview,
  getAdminRoom,
  getAdminSecurity,
  getAdminUser,
} from '../controllers/adminController.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import { requireAdmin } from '../middleware/adminMiddleware.js';

const router = express.Router();

router.use(requireAuth);
router.use(requireAdmin);

router.get('/overview', getAdminOverview);
router.get('/imports', getAdminImports);
router.get('/ai', getAdminAi);
router.get('/security', getAdminSecurity);
router.get('/rooms/:roomId', getAdminRoom);
router.get('/users/:userId', getAdminUser);

export default router;
