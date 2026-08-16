import { taskRepository, TaskListFilter } from '../repositories/task.repository';
import { projectRepository } from '../repositories/project.repository';
import { ApiError } from '../utils/ApiError';
import { ActivityType, NotificationType, TaskStatus } from '../constants/enums';
import { recordActivity } from './activity.service';
import { createNotification } from './notification.service';
import { emitToWorkspace, SocketEvent } from '../sockets/emitter';
import { normalizePagination, PaginationQuery } from '../utils/pagination';
import { buildPagination } from '../utils/ApiResponse';
import { ITask } from '../models/Task';

export interface CreateTaskInput {
  projectId: string;
  title: string;
  description?: string;
  status?: string;
  priority?: string;
  assigneeId?: string;
  labels?: string[];
  dueDate?: Date;
  dependsOn?: string[];
}

async function assertProjectInWorkspace(projectId: string, workspaceId: string) {
  const project = await projectRepository.findByIdInWorkspace(projectId, workspaceId);
  if (!project) throw ApiError.validation('Project does not belong to this workspace');
  return project;
}

/** Validates a proposed dependency edge and rejects self/invalid/cross-workspace/cross-project links and cycles. */
async function assertValidDependency(task: ITask, dependsOnTaskId: string) {
  if (dependsOnTaskId === task._id.toString()) {
    throw ApiError.validation('A task cannot depend on itself');
  }

  const dependency = await taskRepository.findById(dependsOnTaskId);
  if (!dependency) throw ApiError.validation('Dependency task does not exist');

  if (dependency.workspaceId.toString() !== task.workspaceId.toString()) {
    throw ApiError.validation('Cannot depend on a task from a different workspace');
  }
  if (dependency.projectId.toString() !== task.projectId.toString()) {
    throw ApiError.validation('Cannot depend on a task from a different project');
  }

  // Cycle check: walk the dependency graph from `dependency` and ensure we never reach `task`.
  const visited = new Set<string>();
  const queue = [dependency._id.toString()];
  while (queue.length > 0) {
    const currentId = queue.shift() as string;
    if (currentId === task._id.toString()) {
      throw ApiError.validation('This dependency would create a circular reference');
    }
    if (visited.has(currentId)) continue;
    visited.add(currentId);
    const current = await taskRepository.findById(currentId);
    if (current) queue.push(...current.dependsOn.map((id) => id.toString()));
  }

  return dependency;
}

export async function createTask(workspaceId: string, actorId: string, data: CreateTaskInput) {
  await assertProjectInWorkspace(data.projectId, workspaceId);

  const task = await taskRepository.create({
    workspaceId,
    projectId: data.projectId,
    title: data.title,
    description: data.description,
    status: data.status,
    priority: data.priority,
    assigneeId: data.assigneeId,
    createdBy: actorId,
    labels: data.labels ?? [],
    dueDate: data.dueDate,
  });

  if (data.dependsOn && data.dependsOn.length > 0) {
    for (const depId of data.dependsOn) {
      await assertValidDependency(task, depId);
      task.dependsOn.push(depId as unknown as ITask['_id']);
    }
    await task.save();
  }

  await recordActivity({
    workspaceId,
    projectId: data.projectId,
    actorId,
    type: ActivityType.TASK_CREATED,
    entityType: 'Task',
    entityId: task._id.toString(),
    metadata: { title: task.title },
  });

  emitToWorkspace(workspaceId, SocketEvent.TASK_CREATED, task);

  if (task.assigneeId && task.assigneeId.toString() !== actorId) {
    await notifyAssignment(task, workspaceId);
  }

  return task;
}

async function notifyAssignment(task: ITask, workspaceId: string) {
  if (!task.assigneeId) return;
  await createNotification({
    workspaceId,
    userId: task.assigneeId.toString(),
    type: NotificationType.TASK_ASSIGNED,
    title: 'New task assigned',
    message: `You were assigned to "${task.title}"`,
    entityType: 'Task',
    entityId: task._id.toString(),
  });
}

export async function listTasks(filter: TaskListFilter, query: PaginationQuery) {
  const { page, limit, skip } = normalizePagination(query);
  const { items, total } = await taskRepository.list(filter, skip, limit);
  return { items, pagination: buildPagination(page, limit, total) };
}

export async function getTask(taskId: string, workspaceId: string) {
  const task = await taskRepository.findByIdInWorkspace(taskId, workspaceId);
  if (!task) throw ApiError.notFound('Task not found');
  return task;
}

export interface UpdateTaskInput {
  title?: string;
  description?: string;
  status?: TaskStatus;
  priority?: string;
  assigneeId?: string | null;
  labels?: string[];
  dueDate?: Date | null;
}

export async function updateTask(taskId: string, workspaceId: string, actorId: string, data: UpdateTaskInput) {
  const task = await getTask(taskId, workspaceId);
  const previousStatus = task.status;
  const previousAssignee = task.assigneeId?.toString();

  Object.assign(task, data);
  if (data.status === TaskStatus.DONE && previousStatus !== TaskStatus.DONE) {
    task.completedAt = new Date();
  } else if (data.status && data.status !== TaskStatus.DONE) {
    task.completedAt = undefined;
  }
  await task.save();

  await recordActivity({
    workspaceId,
    projectId: task.projectId.toString(),
    actorId,
    type: data.status === TaskStatus.DONE && previousStatus !== TaskStatus.DONE ? ActivityType.TASK_COMPLETED : ActivityType.TASK_UPDATED,
    entityType: 'Task',
    entityId: task._id.toString(),
    metadata: { changes: Object.keys(data) },
  });

  emitToWorkspace(workspaceId, SocketEvent.TASK_UPDATED, task);
  if (data.status && data.status !== previousStatus) {
    emitToWorkspace(workspaceId, SocketEvent.TASK_MOVED, { taskId: task._id, from: previousStatus, to: data.status });
    if (data.status === TaskStatus.DONE) {
      emitToWorkspace(workspaceId, SocketEvent.TASK_COMPLETED, task);
    }
    if (task.assigneeId) {
      await createNotification({
        workspaceId,
        userId: task.assigneeId.toString(),
        type: NotificationType.TASK_STATUS_CHANGED,
        title: 'Task status changed',
        message: `"${task.title}" moved to ${data.status}`,
        entityType: 'Task',
        entityId: task._id.toString(),
      });
    }
  }

  if (data.assigneeId && data.assigneeId !== previousAssignee) {
    await notifyAssignment(task, workspaceId);
    await recordActivity({
      workspaceId,
      projectId: task.projectId.toString(),
      actorId,
      type: ActivityType.TASK_ASSIGNED,
      entityType: 'Task',
      entityId: task._id.toString(),
      metadata: { assigneeId: data.assigneeId },
    });
  }

  return task;
}

export async function deleteTask(taskId: string, workspaceId: string, actorId: string) {
  const task = await getTask(taskId, workspaceId);

  const dependents = await taskRepository.findDependents(taskId);
  if (dependents.length > 0) {
    throw ApiError.conflict('Cannot delete a task that other tasks depend on. Remove the dependency first.');
  }

  await taskRepository.deleteById(task._id.toString());

  await recordActivity({
    workspaceId,
    projectId: task.projectId.toString(),
    actorId,
    type: ActivityType.TASK_DELETED,
    entityType: 'Task',
    entityId: task._id.toString(),
    metadata: { title: task.title },
  });
}

export async function addDependency(taskId: string, workspaceId: string, dependsOnTaskId: string) {
  const task = await getTask(taskId, workspaceId);
  if (task.dependsOn.some((id) => id.toString() === dependsOnTaskId)) {
    throw ApiError.conflict('This dependency already exists');
  }
  await assertValidDependency(task, dependsOnTaskId);
  task.dependsOn.push(dependsOnTaskId as unknown as ITask['_id']);
  await task.save();
  return task;
}

export async function removeDependency(taskId: string, workspaceId: string, dependsOnTaskId: string) {
  const task = await getTask(taskId, workspaceId);
  task.dependsOn = task.dependsOn.filter((id) => id.toString() !== dependsOnTaskId);
  await task.save();
  return task;
}
