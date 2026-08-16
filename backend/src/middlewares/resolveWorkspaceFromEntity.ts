import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { ApiError } from '../utils/ApiError';
import { assertWorkspaceMembership } from '../utils/workspaceAccess';
import { asyncHandler } from '../utils/asyncHandler';

interface WorkspaceOwned {
  workspaceId: { toString(): string };
}

/**
 * For resources whose routes are NOT nested under /workspaces/:workspaceId
 * (tasks, comments, meetings, decisions, documents, attachments, ...):
 * loads the entity by its own id, reads its workspaceId directly off the
 * stored document (never off client input), and verifies the caller is a
 * member of that workspace before letting the request continue. Populates
 * req.workspaceMembership exactly like requireWorkspaceMember does.
 *
 * Wrapped in asyncHandler: Express 4 does not catch rejections thrown
 * from an async middleware after an `await` on its own, which would
 * otherwise leave the request hanging instead of reaching errorHandler.
 */
export function resolveWorkspaceFromParam<T extends WorkspaceOwned>(
  paramName: string,
  loader: (id: string) => Promise<T | null>,
  notFoundMessage = 'Resource not found'
) {
  return asyncHandler(async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    const id = req.params[paramName];
    if (!id || !mongoose.isValidObjectId(id)) throw ApiError.validation(`Invalid ${paramName}`);
    if (!req.user) throw ApiError.unauthorized();

    const entity = await loader(id);
    if (!entity) throw ApiError.notFound(notFoundMessage);

    req.workspaceMembership = await assertWorkspaceMembership(entity.workspaceId.toString(), req.user.id);
    req.resolvedEntity = entity;
    next();
  });
}
