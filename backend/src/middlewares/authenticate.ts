import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/ApiError';
import { verifyAccessToken } from '../utils/jwt';

/**
 * Verifies the JWT access token from the Authorization header and attaches
 * `req.user`. This is the only source of identity for the rest of the
 * pipeline - controllers/services must never read userId from the body,
 * params, or query string.
 */
export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    throw ApiError.unauthorized('Missing or invalid Authorization header');
  }

  const token = header.slice('Bearer '.length).trim();
  try {
    const payload = verifyAccessToken(token);
    if (payload.tokenType !== 'access') {
      throw ApiError.unauthorized('Invalid token type');
    }
    req.user = { id: payload.sub, email: payload.email };
    next();
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw ApiError.unauthorized('Invalid or expired access token');
  }
}
