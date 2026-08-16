import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { ApiError } from '../utils/ApiError';
import { workspaceMemberRepository } from '../repositories/workspaceMember.repository';

/**
 * Verifies the authenticated user belongs to req.params.workspaceId and
 * attaches req.workspaceMembership. Use on any route mounted directly
 * under /workspaces/:workspaceId/*.
 *
 * Nested resources (tasks, comments, attachments, ...) resolve their own
 * workspace membership inside the service layer via
 * `assertWorkspaceMembership` since their routes don't carry a
 * :workspaceId param - see services/*.service.ts.
 */
export async function requireWorkspaceMember(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const workspaceId = req.params.workspaceId;
  if (!workspaceId || !mongoose.isValidObjectId(workspaceId)) {
    throw ApiError.validation('Invalid workspace id');
  }
  if (!req.user) throw ApiError.unauthorized();

  const membership = await workspaceMemberRepository.findMembership(workspaceId, req.user.id);
  if (!membership) {
    throw ApiError.forbidden('You are not a member of this workspace');
  }

  req.workspaceMembership = {
    workspaceId,
    role: membership.role,
    memberId: membership._id.toString(),
  };
  next();
}
