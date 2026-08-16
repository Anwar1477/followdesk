import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { ApiError } from '../utils/ApiError';
import { env } from '../config/env';
import { logger } from '../config/logger';

/**
 * Centralized error handler. Converts any thrown error into the standard
 * { success:false, error:{code,message} } shape and never leaks stack
 * traces, secrets, or raw driver errors to the client in production.
 */
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void {
  let apiError: ApiError;

  if (err instanceof ApiError) {
    apiError = err;
  } else if (err instanceof mongoose.Error.ValidationError) {
    apiError = ApiError.validation('Invalid data', Object.keys(err.errors));
  } else if (err instanceof mongoose.Error.CastError) {
    apiError = ApiError.validation(`Invalid value for field "${err.path}"`);
  } else if (isMongoDuplicateKeyError(err)) {
    apiError = ApiError.conflict('A resource with this value already exists');
  } else if (isJwtError(err)) {
    apiError = ApiError.unauthorized('Invalid or expired token');
  } else {
    apiError = ApiError.internal();
  }

  const isServerError = apiError.statusCode >= 500;
  logger[isServerError ? 'error' : 'warn'](
    {
      err: isServerError ? err : undefined,
      code: apiError.code,
      statusCode: apiError.statusCode,
      path: req.originalUrl,
      method: req.method,
      userId: req.user?.id,
    },
    apiError.message
  );

  res.status(apiError.statusCode).json({
    success: false,
    error: {
      code: apiError.code,
      message: isServerError && env.isProduction ? 'Something went wrong. Please try again later.' : apiError.message,
      ...(apiError.details && !env.isProduction ? { details: apiError.details } : {}),
    },
  });
}

function isMongoDuplicateKeyError(err: unknown): boolean {
  return typeof err === 'object' && err !== null && (err as { code?: number }).code === 11000;
}

function isJwtError(err: unknown): boolean {
  if (typeof err !== 'object' || err === null) return false;
  const name = (err as { name?: string }).name;
  return name === 'JsonWebTokenError' || name === 'TokenExpiredError' || name === 'NotBeforeError';
}
