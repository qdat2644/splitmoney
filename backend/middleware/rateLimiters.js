import rateLimit from 'express-rate-limit';
import { recordOperationalEvent } from '../services/operationalEventService.js';

const common = {
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: true, message: 'Bạn thao tác quá nhanh. Vui lòng thử lại sau.', code: 'RATE_LIMITED' },
  handler: (req, res, next, options) => {
    recordOperationalEvent({
      type: 'security.rate_limit_hit',
      source: 'security',
      severity: 'warning',
      userId: req.user?.userId,
      metadata: { method: req.method, path: req.originalUrl },
    }).catch(() => {});
    res.status(options.statusCode).json(options.message);
  },
};

export const generalLimiter = rateLimit({
  ...common,
  windowMs: 15 * 60 * 1000,
  limit: 300,
});

export const authLimiter = rateLimit({
  ...common,
  windowMs: 15 * 60 * 1000,
  limit: 20,
});

export const aiLimiter = rateLimit({
  ...common,
  windowMs: 60 * 1000,
  limit: 20,
});
