import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

export function notFoundHandler(req, res) {
  res.status(404).json({ error: true, message: 'Not found', code: 'NOT_FOUND' });
}

export function errorHandler(err, req, res, next) {
  logger.error('request_error', {
    method: req.method,
    path: req.originalUrl,
    message: err.message,
    code: err.code,
    stack: env.nodeEnv === 'development' ? err.stack : undefined,
  });

  const status = err.status || 500;
  const isServerError = status >= 500;
  res.status(status).json({
    error: true,
    message: env.nodeEnv === 'production' && isServerError ? 'Internal server error' : (err.message || 'Internal server error'),
    code: isServerError ? 'INTERNAL_SERVER_ERROR' : (err.code || 'REQUEST_ERROR'),
  });
}
