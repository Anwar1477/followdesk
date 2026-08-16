import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/ApiResponse';
import * as workspaceService from '../services/workspace.service';

export const createWorkspace = asyncHandler(async (req: Request, res: Response) => {
  const workspace = await workspaceService.createWorkspace(req.user!.id, req.body);
  sendSuccess(res, workspace, 201);
});

export const listMyWorkspaces = asyncHandler(async (req: Request, res: Response) => {
  const workspaces = await workspaceService.listMyWorkspaces(req.user!.id);
  sendSuccess(res, workspaces);
});

export const getWorkspace = asyncHandler(async (req: Request, res: Response) => {
  const workspace = await workspaceService.getWorkspace(req.params.workspaceId);
  sendSuccess(res, workspace);
});

export const updateWorkspace = asyncHandler(async (req: Request, res: Response) => {
  const workspace = await workspaceService.updateWorkspace(req.params.workspaceId, req.body);
  sendSuccess(res, workspace);
});

export const deleteWorkspace = asyncHandler(async (req: Request, res: Response) => {
  await workspaceService.deleteWorkspace(req.params.workspaceId);
  sendSuccess(res, { message: 'Workspace deleted successfully' });
});
