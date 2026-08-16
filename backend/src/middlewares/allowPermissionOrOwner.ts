import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/ApiError';
import { Permission, roleHasPermission } from '../constants/permissions';

/**
 * Allows the request through if the caller's role has `permission`
 * (e.g. ADMIN/MANAGER via TASK_MANAGE), OR if `isOwner` returns true for
 * the already-resolved entity (req.resolvedEntity) - e.g. a MEMBER acting
 * on a task they're assigned to. Mirrors the permission matrix row
 * "Manage Tasks: Admin Yes, Manager Yes, Member Assigned".
 */
export function allowPermissionOrOwner<T>(permission: Permission, isOwner: (entity: T, userId: string) => boolean) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.workspaceMembership || !req.user) throw ApiError.unauthorized();

    if (roleHasPermission(req.workspaceMembership.role, permission)) {
      next();
      return;
    }
    if (isOwner(req.resolvedEntity as T, req.user.id)) {
      next();
      return;
    }
    throw ApiError.forbidden('You do not have permission to perform this action');
  };
}
