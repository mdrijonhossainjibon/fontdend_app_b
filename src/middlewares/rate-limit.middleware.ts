import rateLimit, { Options } from 'express-rate-limit';

export const createRateLimiter = (options: Partial<Options> = {}) =>
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, error: 'Too many requests, please try again later' },
    skip: (req) => {
      if (req.path.startsWith('/health')) return true;
      return false;
    },
    ...options,
  });

export const authRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { success: false, error: 'Too many authentication attempts, please try again after 15 minutes' },
});

export const apiRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: { success: false, error: 'Too many API requests, please try again after 15 minutes' },
});
