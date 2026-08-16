import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/ApiError';
import { WorkspaceRole } from '../constants/enums';

/**
 * Gate a route by exact role membership (e.g. workspace deletion is
 * ADMIN-only). Requires requireWorkspaceMember to have run first.
 * For feature-level permission checks prefer `authorize()` instead, which
 * reads from the centralized permission matrix.
 */
export function requireRole(...roles: WorkspaceRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.workspaceMembership) throw ApiError.unauthorized();
    if (!roles.includes(req.workspaceMembership.role)) {
      throw ApiError.forbidden(`This action requires one of the following roles: ${roles.join(', ')}`);
    }
    next();
  };
}
