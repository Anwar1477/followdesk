import { ErrorCode, ErrorCodeStatusMap } from '../constants/errorCodes';

/**
 * Thrown from anywhere in the request pipeline (validators, controllers,
 * services, repositories). Caught centrally by middlewares/errorHandler.ts
 * and translated into the standard { success:false, error:{code,message} }
 * response shape.
 */
export class ApiError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: unknown;

  constructor(code: ErrorCode, message: string, details?: unknown, statusCode?: number) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.statusCode = statusCode ?? ErrorCodeStatusMap[code];
    this.details = details;
    Error.captureStackTrace?.(this, this.constructor);
  }

  static unauthorized(message = 'Authentication required', details?: unknown) {
    return new ApiError(ErrorCode.UNAUTHORIZED, message, details);
  }
  static forbidden(message = 'You do not have permission to perform this action', details?: unknown) {
    return new ApiError(ErrorCode.FORBIDDEN, message, details);
  }
  static validation(message = 'Invalid request', details?: unknown) {
    return new ApiError(ErrorCode.VALIDATION_ERROR, message, details);
  }
  static notFound(message = 'Resource not found', details?: unknown) {
    return new ApiError(ErrorCode.NOT_FOUND, message, details);
  }
  static conflict(message = 'Resource conflict', details?: unknown) {
    return new ApiError(ErrorCode.CONFLICT, message, details);
  }
  static rateLimited(message = 'Too many requests') {
    return new ApiError(ErrorCode.RATE_LIMITED, message);
  }
  static internal(message = 'Internal server error', details?: unknown) {
    return new ApiError(ErrorCode.INTERNAL_ERROR, message, details);
  }

  /** Custom application-specific error code with a chosen HTTP status. */
  static custom(code: string, message: string, statusCode: number, details?: unknown) {
    const err = new ApiError(ErrorCode.VALIDATION_ERROR, message, details, statusCode);
    (err as { code: string }).code = code;
    return err;
  }
}
