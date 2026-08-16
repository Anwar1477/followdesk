import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/ApiError';
import { Permission, roleHasPermission } from '../constants/permissions';

/**
 * Gate a route by the centralized permission matrix (constants/permissions.ts).
 * Requires requireWorkspaceMember to have run first so req.workspaceMembership
 * is populated. Prefer this over requireRole for feature-level checks so the
 * permission matrix stays the single source of truth.
 */
export function authorize(permission: Permission) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.workspaceMembership) throw ApiError.unauthorized();
    if (!roleHasPermission(req.workspaceMembership.role, permission)) {
      throw ApiError.forbidden('You do not have permission to perform this action');
    }
    next();
  };
}
