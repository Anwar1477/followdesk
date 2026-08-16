import { Types } from 'mongoose';
import { ProjectModel } from '../models/Project';
import { TaskModel } from '../models/Task';
import { ActivityModel } from '../models/Activity';
import { ApiError } from '../utils/ApiError';
import { projectRepository } from '../repositories/project.repository';
import { ProjectStatus, TaskStatus } from '../constants/enums';
import { calculateProjectHealth } from './projectHealth.service';

export async function getWorkspaceAnalytics(workspaceId: string) {
  const wsId = new Types.ObjectId(workspaceId);

  const [projectStats, taskStats, overdueTasks, blockedTasks] = await Promise.all([
    ProjectModel.aggregate([
      { $match: { workspaceId: wsId } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    TaskModel.aggregate([
      { $match: { workspaceId: wsId } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    TaskModel.countDocuments({ workspaceId, dueDate: { $lt: new Date() }, status: { $ne: TaskStatus.DONE } }),
    TaskModel.countDocuments({ workspaceId, status: TaskStatus.BLOCKED }),
  ]);

  const projectsByStatus = Object.fromEntries(projectStats.map((s) => [s._id, s.count]));
  const tasksByStatus = Object.fromEntries(taskStats.map((s) => [s._id, s.count]));

  const totalProjects = projectStats.reduce((sum, s) => sum + s.count, 0);
  const totalTasks = taskStats.reduce((sum, s) => sum + s.count, 0);

  return {
    totalProjects,
    activeProjects: projectsByStatus[ProjectStatus.ACTIVE] ?? 0,
    completedProjects: projectsByStatus[ProjectStatus.COMPLETED] ?? 0,
    projectsByStatus,
    totalTasks,
    completedTasks: tasksByStatus[TaskStatus.DONE] ?? 0,
    overdueTasks,
    blockedTasks,
    tasksByStatus,
  };
}

export async function getProjectAnalytics(projectId: string, workspaceId: string) {
  const project = await projectRepository.findByIdInWorkspace(projectId, workspaceId);
  if (!project) throw ApiError.notFound('Project not found');

  const pId = new Types.ObjectId(projectId);
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [byStatus, byPriority, byMember, overdueCount, activityTrend, health] = await Promise.all([
    TaskModel.aggregate([{ $match: { projectId: pId } }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
    TaskModel.aggregate([{ $match: { projectId: pId } }, { $group: { _id: '$priority', count: { $sum: 1 } } }]),
    TaskModel.aggregate([
      { $match: { projectId: pId, assigneeId: { $ne: null } } },
      { $group: { _id: '$assigneeId', count: { $sum: 1 } } },
    ]),
    TaskModel.countDocuments({ projectId, dueDate: { $lt: now }, status: { $ne: TaskStatus.DONE } }),
    ActivityModel.aggregate([
      { $match: { projectId: pId, createdAt: { $gte: thirtyDaysAgo } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]),
    calculateProjectHealth(projectId, workspaceId),
  ]);

  const tasksByStatus = Object.fromEntries(byStatus.map((s) => [s._id, s.count]));
  const totalTasks = byStatus.reduce((sum, s) => sum + s.count, 0);
  const completedTasks = tasksByStatus[TaskStatus.DONE] ?? 0;
  const completionRate = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);

  return {
    completionRate,
    tasksByStatus,
    tasksByPriority: Object.fromEntries(byPriority.map((s) => [s._id, s.count])),
    tasksByMember: byMember.map((m) => ({ assigneeId: m._id?.toString(), count: m.count })),
    overdueTasks: overdueCount,
    activityTrend: activityTrend.map((a) => ({ date: a._id, count: a.count })),
    health: { status: health.health, score: health.score, reasons: health.reasons },
  };
}
