import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess, sendList } from '../utils/ApiResponse';
import * as projectService from '../services/project.service';

export const createProject = asyncHandler(async (req: Request, res: Response) => {
  const project = await projectService.createProject(req.params.workspaceId, req.user!.id, req.body);
  sendSuccess(res, project, 201);
});

export const listProjects = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, ...filters } = req.query as Record<string, string>;
  const { items, pagination } = await projectService.listProjects(
    { workspaceId: req.params.workspaceId, ...filters },
    { page: page ? Number(page) : undefined, limit: limit ? Number(limit) : undefined }
  );
  sendList(res, items, pagination);
});

export const getProject = asyncHandler(async (req: Request, res: Response) => {
  const project = await projectService.getProject(req.params.projectId, req.workspaceMembership!.workspaceId);
  sendSuccess(res, project);
});

export const updateProject = asyncHandler(async (req: Request, res: Response) => {
  const project = await projectService.updateProject(req.params.projectId, req.workspaceMembership!.workspaceId, req.user!.id, req.body);
  sendSuccess(res, project);
});

export const deleteProject = asyncHandler(async (req: Request, res: Response) => {
  await projectService.deleteProject(req.params.projectId, req.workspaceMembership!.workspaceId, req.user!.id);
  sendSuccess(res, { message: 'Project deleted successfully' });
});
