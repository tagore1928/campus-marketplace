import rateLimit from 'express-rate-limit';

// Rate limiter enforcing max 5 login/registration attempts per 10 minutes per IP
export const authRateLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 5,
  message: {
    error: 'Too many attempts',
    message: 'Too many authentication attempts from this IP. Please try again after 10 minutes.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});
