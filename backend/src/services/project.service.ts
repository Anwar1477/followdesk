import { projectRepository, ProjectListFilter } from '../repositories/project.repository';
import { taskRepository } from '../repositories/task.repository';
import { taskCommentRepository } from '../repositories/taskComment.repository';
import { attachmentRepository } from '../repositories/attachment.repository';
import { storageDriver } from './storage.service';
import { ApiError } from '../utils/ApiError';
import { ActivityType, AttachmentEntityType } from '../constants/enums';
import { recordActivity } from './activity.service';
import { normalizePagination, PaginationQuery } from '../utils/pagination';
import { buildPagination } from '../utils/ApiResponse';

export interface CreateProjectInput {
  name: string;
  key: string;
  description?: string;
  status?: string;
  priority?: string;
  startDate?: Date;
  dueDate?: Date;
  members?: string[];
}

export async function createProject(workspaceId: string, ownerId: string, data: CreateProjectInput) {
  const key = data.key.toUpperCase();
  const existing = await projectRepository.findByWorkspaceAndKey(workspaceId, key);
  if (existing) throw ApiError.conflict(`A project with key "${key}" already exists in this workspace`);

  const project = await projectRepository.create({
    workspaceId,
    name: data.name,
    key,
    description: data.description,
    status: data.status,
    priority: data.priority,
    ownerId,
    startDate: data.startDate,
    dueDate: data.dueDate,
    members: data.members ?? [],
  });

  await recordActivity({
    workspaceId,
    projectId: project._id.toString(),
    actorId: ownerId,
    type: ActivityType.PROJECT_CREATED,
    entityType: 'Project',
    entityId: project._id.toString(),
    metadata: { name: project.name, key: project.key },
  });

  return project;
}

export async function listProjects(filter: ProjectListFilter, query: PaginationQuery) {
  const { page, limit, skip } = normalizePagination(query);
  const { items, total } = await projectRepository.list(filter, skip, limit);
  return { items, pagination: buildPagination(page, limit, total) };
}

export async function getProject(projectId: string, workspaceId: string) {
  const project = await projectRepository.findByIdInWorkspace(projectId, workspaceId);
  if (!project) throw ApiError.notFound('Project not found');
  return project;
}

export interface UpdateProjectInput {
  name?: string;
  description?: string;
  status?: string;
  priority?: string;
  ownerId?: string;
  startDate?: Date;
  dueDate?: Date;
  members?: string[];
}

export async function updateProject(projectId: string, workspaceId: string, actorId: string, data: UpdateProjectInput) {
  const project = await getProject(projectId, workspaceId);
  Object.assign(project, data);
  await project.save();

  await recordActivity({
    workspaceId,
    projectId: project._id.toString(),
    actorId,
    type: ActivityType.PROJECT_UPDATED,
    entityType: 'Project',
    entityId: project._id.toString(),
    metadata: { changes: Object.keys(data) },
  });

  return project;
}

/** Deletes a project and cascades to its tasks, task comments, and their attachments. */
export async function deleteProject(projectId: string, workspaceId: string, actorId: string) {
  const project = await getProject(projectId, workspaceId);

  const tasks = await taskRepository.find({ projectId: project._id });
  const taskIds = tasks.map((t) => t._id.toString());

  if (taskIds.length > 0) {
    const attachments = await attachmentRepository.find({
      entityType: AttachmentEntityType.TASK,
      entityId: { $in: taskIds },
    });
    await Promise.all(attachments.map((a) => storageDriver.remove(a.storageKey)));
    await attachmentRepository.deleteMany({ entityType: AttachmentEntityType.TASK, entityId: { $in: taskIds } });
    await taskCommentRepository.deleteMany({ taskId: { $in: taskIds } });
    await taskRepository.deleteMany({ projectId: project._id });
  }

  await projectRepository.deleteById(project._id.toString());

  await recordActivity({
    workspaceId,
    actorId,
    type: ActivityType.PROJECT_DELETED,
    entityType: 'Project',
    entityId: project._id.toString(),
    metadata: { name: project.name, key: project.key },
  });
}
