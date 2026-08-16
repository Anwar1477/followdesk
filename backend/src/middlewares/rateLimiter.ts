import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';
import { env } from '../config/env';

function jsonHandler(_req: Request, res: Response): void {
  res.status(429).json({ success: false, error: { code: 'RATE_LIMITED', message: 'Too many requests, please try again later.' } });
}

/** General API rate limiter applied to all routes. */
export const apiRateLimiter = rateLimit({
  windowMs: env.rateLimitWindowMs,
  max: env.rateLimitMax,
  standardHeaders: true,
  legacyHeaders: false,
  handler: jsonHandler,
  skip: () => env.isTest,
});

/** Stricter limiter for auth endpoints (login/register/password reset) to slow brute-force attempts. */
export const authRateLimiter = rateLimit({
  windowMs: env.authRateLimitWindowMs,
  max: env.authRateLimitMax,
  standardHeaders: true,
  legacyHeaders: false,
  handler: jsonHandler,
  skip: () => env.isTest,
});
