import { taskRepository } from '../repositories/task.repository';
import { activityRepository } from '../repositories/activity.repository';
import { projectRepository } from '../repositories/project.repository';
import { ApiError } from '../utils/ApiError';
import { ProjectHealth, TaskStatus } from '../constants/enums';

export interface ProjectHealthResult {
  health: ProjectHealth;
  score: number;
  reasons: string[];
  metrics: {
    totalTasks: number;
    completedTasks: number;
    completionRate: number;
    overdueTasks: number;
    blockedTasks: number;
    daysUntilDue: number | null;
    recentActivityCount: number;
  };
}

const RECENT_ACTIVITY_WINDOW_DAYS = 7;

/**
 * Deterministic, rule-based project health score (0-100, no AI/ML). Starts
 * at 100 and subtracts fixed penalties for each risk signal, then buckets
 * the result into HEALTHY / NEEDS_ATTENTION / AT_RISK. Every deduction is
 * recorded in `reasons` so callers can explain the score to a user.
 */
export async function calculateProjectHealth(projectId: string, workspaceId: string): Promise<ProjectHealthResult> {
  const project = await projectRepository.findByIdInWorkspace(projectId, workspaceId);
  if (!project) throw ApiError.notFound('Project not found');

  const tasks = await taskRepository.find({ projectId });
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.status === TaskStatus.DONE).length;
  const blockedTasks = tasks.filter((t) => t.status === TaskStatus.BLOCKED).length;
  const now = new Date();
  const overdueTasks = tasks.filter((t) => t.dueDate && t.dueDate < now && t.status !== TaskStatus.DONE).length;
  const completionRate = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);

  const since = new Date(now.getTime() - RECENT_ACTIVITY_WINDOW_DAYS * 24 * 60 * 60 * 1000);
  const recentActivityCount = await activityRepository.recentByProject(projectId, since);

  const daysUntilDue = project.dueDate
    ? Math.ceil((project.dueDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000))
    : null;

  let score = 100;
  const reasons: string[] = [];

  const overdueRatio = totalTasks === 0 ? 0 : overdueTasks / totalTasks;
  if (overdueRatio > 0) {
    const penalty = Math.min(40, Math.round(overdueRatio * 60));
    score -= penalty;
    reasons.push(`${overdueTasks} overdue task(s) (${Math.round(overdueRatio * 100)}% of tasks)`);
  }

  const blockedRatio = totalTasks === 0 ? 0 : blockedTasks / totalTasks;
  if (blockedRatio > 0) {
    const penalty = Math.min(25, Math.round(blockedRatio * 50));
    score -= penalty;
    reasons.push(`${blockedTasks} blocked task(s) (${Math.round(blockedRatio * 100)}% of tasks)`);
  }

  if (totalTasks > 0 && completionRate < 30) {
    score -= 10;
    reasons.push(`Low completion rate (${completionRate}%)`);
  }

  if (daysUntilDue !== null && daysUntilDue < 0 && project.status !== 'COMPLETED') {
    score -= 20;
    reasons.push(`Project is ${Math.abs(daysUntilDue)} day(s) past its due date`);
  } else if (daysUntilDue !== null && daysUntilDue <= 3 && daysUntilDue >= 0 && completionRate < 80) {
    score -= 10;
    reasons.push(`Due date is in ${daysUntilDue} day(s) with only ${completionRate}% complete`);
  }

  if (totalTasks > 0 && recentActivityCount === 0) {
    score -= 15;
    reasons.push(`No activity in the last ${RECENT_ACTIVITY_WINDOW_DAYS} days`);
  }

  score = Math.max(0, Math.min(100, score));

  let health: ProjectHealth;
  if (score >= 75) health = ProjectHealth.HEALTHY;
  else if (score >= 50) health = ProjectHealth.NEEDS_ATTENTION;
  else health = ProjectHealth.AT_RISK;

  if (reasons.length === 0) reasons.push('No risk signals detected');

  return {
    health,
    score,
    reasons,
    metrics: { totalTasks, completedTasks, completionRate, overdueTasks, blockedTasks, daysUntilDue, recentActivityCount },
  };
}
