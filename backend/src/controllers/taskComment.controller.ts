import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess, sendList } from '../utils/ApiResponse';
import { roleHasPermission, Permission } from '../constants/permissions';
import * as commentService from '../services/taskComment.service';

export const createComment = asyncHandler(async (req: Request, res: Response) => {
  const comment = await commentService.createComment(req.params.taskId, req.workspaceMembership!.workspaceId, req.user!.id, req.body.content);
  sendSuccess(res, comment, 201);
});

export const listComments = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit } = req.query as Record<string, string>;
  const { items, pagination } = await commentService.listComments(req.params.taskId, req.workspaceMembership!.workspaceId, {
    page: page ? Number(page) : undefined,
    limit: limit ? Number(limit) : undefined,
  });
  sendList(res, items, pagination);
});

export const updateComment = asyncHandler(async (req: Request, res: Response) => {
  const comment = await commentService.updateComment(req.params.commentId, req.workspaceMembership!.workspaceId, req.user!.id, req.body.content);
  sendSuccess(res, comment);
});

export const deleteComment = asyncHandler(async (req: Request, res: Response) => {
  const isPrivileged = roleHasPermission(req.workspaceMembership!.role, Permission.TASK_MANAGE);
  await commentService.deleteComment(req.params.commentId, req.workspaceMembership!.workspaceId, req.user!.id, isPrivileged);
  sendSuccess(res, { message: 'Comment deleted successfully' });
});
