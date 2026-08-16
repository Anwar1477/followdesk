import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { sendList } from '../utils/ApiResponse';
import { listWorkspaceActivities } from '../services/activity.service';

export const listActivities = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, projectId } = req.query as Record<string, string>;
  const { items, pagination } = await listWorkspaceActivities(
    req.params.workspaceId,
    { page: page ? Number(page) : undefined, limit: limit ? Number(limit) : undefined },
    projectId
  );
  sendList(res, items, pagination);
});
