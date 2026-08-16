import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess, sendList } from '../utils/ApiResponse';
import * as taskService from '../services/task.service';

export const createTask = asyncHandler(async (req: Request, res: Response) => {
  const task = await taskService.createTask(req.params.workspaceId, req.user!.id, req.body);
  sendSuccess(res, task, 201);
});

export const listTasks = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, ...filters } = req.query as Record<string, string>;
  const { items, pagination } = await taskService.listTasks(
    { workspaceId: req.params.workspaceId, ...filters } as never,
    { page: page ? Number(page) : undefined, limit: limit ? Number(limit) : undefined }
  );
  sendList(res, items, pagination);
});

export const getTask = asyncHandler(async (req: Request, res: Response) => {
  const task = await taskService.getTask(req.params.taskId, req.workspaceMembership!.workspaceId);
  sendSuccess(res, task);
});

export const updateTask = asyncHandler(async (req: Request, res: Response) => {
  const task = await taskService.updateTask(req.params.taskId, req.workspaceMembership!.workspaceId, req.user!.id, req.body);
  sendSuccess(res, task);
});

export const deleteTask = asyncHandler(async (req: Request, res: Response) => {
  await taskService.deleteTask(req.params.taskId, req.workspaceMembership!.workspaceId, req.user!.id);
  sendSuccess(res, { message: 'Task deleted successfully' });
});

export const addDependency = asyncHandler(async (req: Request, res: Response) => {
  const task = await taskService.addDependency(req.params.taskId, req.workspaceMembership!.workspaceId, req.body.dependsOnTaskId);
  sendSuccess(res, task);
});

export const removeDependency = asyncHandler(async (req: Request, res: Response) => {
  const task = await taskService.removeDependency(req.params.taskId, req.workspaceMembership!.workspaceId, req.params.dependencyId);
  sendSuccess(res, task);
});
