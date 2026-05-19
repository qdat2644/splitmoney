import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';
import { recordOperationalEvent } from '../services/operationalEventService.js';
import prisma from '../utils/db.js';

export const requireAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    logger.warn('auth_failed', { reason: 'missing_token' });
    recordOperationalEvent({
      type: 'security.auth_failed',
      source: 'auth',
      severity: 'warning',
      metadata: { reason: 'missing_token', path: req.originalUrl },
    }).catch(() => {});
    return res.status(401).json({ error: 'Bạn cần đăng nhập để tiếp tục.' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, env.jwtSecret);
    req.user = decoded; // { userId: string }
    next();
  } catch (err) {
    logger.warn('auth_failed', { reason: 'invalid_token' });
    recordOperationalEvent({
      type: 'security.auth_failed',
      source: 'auth',
      severity: 'warning',
      metadata: { reason: 'invalid_token', path: req.originalUrl },
    }).catch(() => {});
    return res.status(401).json({ error: 'Phiên đăng nhập không hợp lệ.' });
  }
};

/**
 * Middleware to block suspended users from performing mutations.
 * Apply on sensitive write routes if needed.
 */
export const blockSuspended = async (req, res, next) => {
  if (!req.user?.userId) return next();

  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: { status: true },
    });

    if (user?.status === 'suspended') {
      return res.status(403).json({ error: 'Tài khoản đã bị tạm ngưng. Vui lòng liên hệ quản trị viên.' });
    }
  } catch {
    // If check fails, allow through — fail open for reads
  }

  next();
};
