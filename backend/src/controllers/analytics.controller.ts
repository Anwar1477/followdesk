import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/ApiResponse';
import * as analyticsService from '../services/analytics.service';
import { calculateProjectHealth } from '../services/projectHealth.service';
import { WorkspaceRole } from '../constants/enums';

export const getWorkspaceAnalytics = asyncHandler(async (req: Request, res: Response) => {
  const analytics = await analyticsService.getWorkspaceAnalytics(req.params.workspaceId);

  // Permission matrix: MEMBER gets a limited view (totals only, no
  // per-status breakdown) while ADMIN/MANAGER see the full payload.
  if (req.workspaceMembership!.role === WorkspaceRole.MEMBER) {
    sendSuccess(res, {
      totalProjects: analytics.totalProjects,
      activeProjects: analytics.activeProjects,
      completedProjects: analytics.completedProjects,
      totalTasks: analytics.totalTasks,
      completedTasks: analytics.completedTasks,
      overdueTasks: analytics.overdueTasks,
    });
    return;
  }

  sendSuccess(res, analytics);
});

export const getProjectAnalytics = asyncHandler(async (req: Request, res: Response) => {
  const analytics = await analyticsService.getProjectAnalytics(req.params.projectId, req.workspaceMembership!.workspaceId);

  if (req.workspaceMembership!.role === WorkspaceRole.MEMBER) {
    sendSuccess(res, {
      completionRate: analytics.completionRate,
      tasksByStatus: analytics.tasksByStatus,
      overdueTasks: analytics.overdueTasks,
      health: analytics.health,
    });
    return;
  }

  sendSuccess(res, analytics);
});

export const getProjectHealth = asyncHandler(async (req: Request, res: Response) => {
  const health = await calculateProjectHealth(req.params.projectId, req.workspaceMembership!.workspaceId);
  sendSuccess(res, health);
});
