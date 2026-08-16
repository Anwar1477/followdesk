import { activityRepository } from '../repositories/activity.repository';
import { ActivityType } from '../constants/enums';
import { emitToWorkspace, SocketEvent } from '../sockets/emitter';
import { normalizePagination, PaginationQuery } from '../utils/pagination';
import { buildPagination } from '../utils/ApiResponse';

export interface RecordActivityInput {
  workspaceId: string;
  projectId?: string;
  actorId: string;
  type: ActivityType;
  entityType: string;
  entityId: string;
  metadata?: Record<string, unknown>;
}

/** Records an Activity feed entry and broadcasts it to the workspace room in real time. */
export async function recordActivity(input: RecordActivityInput) {
  const activity = await activityRepository.create({
    workspaceId: input.workspaceId,
    projectId: input.projectId,
    actorId: input.actorId,
    type: input.type,
    entityType: input.entityType,
    entityId: input.entityId,
    metadata: input.metadata,
  });
  emitToWorkspace(input.workspaceId, SocketEvent.ACTIVITY_CREATED, activity);
  return activity;
}

export async function listWorkspaceActivities(workspaceId: string, query: PaginationQuery, projectId?: string) {
  const { page, limit, skip } = normalizePagination(query);
  const { items, total } = await activityRepository.listByWorkspace(workspaceId, skip, limit, projectId);
  return { items, pagination: buildPagination(page, limit, total) };
}
