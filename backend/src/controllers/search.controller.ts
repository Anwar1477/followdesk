import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { sendList } from '../utils/ApiResponse';
import { assertWorkspaceMembership } from '../utils/workspaceAccess';
import * as searchService from '../services/search.service';

export const search = asyncHandler(async (req: Request, res: Response) => {
  const { q, workspaceId, type, projectId, page, limit } = req.query as Record<string, string>;

  // workspaceId arrives via query string here (not a route param), so we
  // independently verify membership rather than trusting it - same rule
  // enforced by requireWorkspaceMember on directly-nested workspace routes.
  await assertWorkspaceMembership(workspaceId, req.user!.id);

  const { items, pagination } = await searchService.globalSearch({
    q,
    workspaceId,
    type: type as never,
    projectId,
    page: page ? Number(page) : undefined,
    limit: limit ? Number(limit) : undefined,
  });

  sendList(res, items, pagination);
});
