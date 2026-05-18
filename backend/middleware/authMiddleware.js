import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

export const requireAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    logger.warn('auth_failed', { reason: 'missing_token' });
    return res.status(401).json({ error: 'Bạn cần đăng nhập để tiếp tục.' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, env.jwtSecret);
    req.user = decoded; // { userId: string }
    next();
  } catch (err) {
    logger.warn('auth_failed', { reason: 'invalid_token' });
    return res.status(401).json({ error: 'Phiên đăng nhập không hợp lệ.' });
  }
};
