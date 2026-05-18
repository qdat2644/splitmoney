import rateLimit from 'express-rate-limit';

const common = {
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: true, message: 'Bạn thao tác quá nhanh. Vui lòng thử lại sau.', code: 'RATE_LIMITED' },
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
