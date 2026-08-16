import { decisionRepository, DecisionListFilter } from '../repositories/decision.repository';
import { ApiError } from '../utils/ApiError';
import { ActivityType, DecisionStatus } from '../constants/enums';
import { recordActivity } from './activity.service';
import { emitToWorkspace, SocketEvent } from '../sockets/emitter';
import { normalizePagination, PaginationQuery } from '../utils/pagination';
import { buildPagination } from '../utils/ApiResponse';

export interface CreateDecisionInput {
  projectId?: string;
  title: string;
  decision: string;
  reason?: string;
  alternatives?: string;
  impact?: string;
  meetingId?: string;
  relatedTaskIds?: string[];
  tags?: string[];
}

export async function createDecision(workspaceId: string, createdBy: string, data: CreateDecisionInput) {
  const decision = await decisionRepository.create({
    workspaceId,
    projectId: data.projectId,
    title: data.title,
    decision: data.decision,
    reason: data.reason,
    alternatives: data.alternatives,
    impact: data.impact,
    createdBy,
    meetingId: data.meetingId,
    relatedTaskIds: data.relatedTaskIds ?? [],
    tags: data.tags ?? [],
  });

  await recordActivity({
    workspaceId,
    projectId: data.projectId,
    actorId: createdBy,
    type: ActivityType.DECISION_CREATED,
    entityType: 'Decision',
    entityId: decision._id.toString(),
    metadata: { title: decision.title },
  });

  return decision;
}

export async function listDecisions(filter: DecisionListFilter, query: PaginationQuery) {
  const { page, limit, skip } = normalizePagination(query);
  const { items, total } = await decisionRepository.list(filter, skip, limit);
  return { items, pagination: buildPagination(page, limit, total) };
}

export async function getDecision(decisionId: string, workspaceId: string) {
  const decision = await decisionRepository.findByIdInWorkspace(decisionId, workspaceId);
  if (!decision) throw ApiError.notFound('Decision not found');
  return decision;
}

export interface UpdateDecisionInput {
  title?: string;
  decision?: string;
  reason?: string;
  alternatives?: string;
  impact?: string;
  status?: DecisionStatus;
  relatedTaskIds?: string[];
  tags?: string[];
}

export async function updateDecision(decisionId: string, workspaceId: string, actorId: string, data: UpdateDecisionInput) {
  const decision = await getDecision(decisionId, workspaceId);
  Object.assign(decision, data);
  await decision.save();

  await recordActivity({
    workspaceId,
    projectId: decision.projectId?.toString(),
    actorId,
    type: ActivityType.DECISION_UPDATED,
    entityType: 'Decision',
    entityId: decision._id.toString(),
    metadata: { changes: Object.keys(data) },
  });

  emitToWorkspace(workspaceId, SocketEvent.DECISION_UPDATED, decision);
  return decision;
}

export async function archiveDecision(decisionId: string, workspaceId: string, actorId: string) {
  return updateDecision(decisionId, workspaceId, actorId, { status: DecisionStatus.ARCHIVED });
}

export interface SupersedeDecisionInput {
  title: string;
  decision: string;
  reason?: string;
  alternatives?: string;
  impact?: string;
  tags?: string[];
}

/**
 * Creates a new decision that supersedes an existing one, preserving
 * history: the old decision is marked SUPERSEDED and linked forward
 * (supersededBy), the new one links backward (supersedes).
 */
export async function supersedeDecision(
  decisionId: string,
  workspaceId: string,
  createdBy: string,
  data: SupersedeDecisionInput
) {
  const previous = await getDecision(decisionId, workspaceId);
  if (previous.status === DecisionStatus.SUPERSEDED) {
    throw ApiError.conflict('This decision has already been superseded');
  }

  const next = await decisionRepository.create({
    workspaceId,
    projectId: previous.projectId,
    title: data.title,
    decision: data.decision,
    reason: data.reason,
    alternatives: data.alternatives,
    impact: data.impact,
    createdBy,
    meetingId: previous.meetingId,
    relatedTaskIds: previous.relatedTaskIds,
    tags: data.tags ?? previous.tags,
    supersedes: previous._id,
  });

  previous.status = DecisionStatus.SUPERSEDED;
  previous.supersededBy = next._id;
  await previous.save();

  await recordActivity({
    workspaceId,
    projectId: previous.projectId?.toString(),
    actorId: createdBy,
    type: ActivityType.DECISION_SUPERSEDED,
    entityType: 'Decision',
    entityId: next._id.toString(),
    metadata: { supersedes: previous._id.toString() },
  });

  emitToWorkspace(workspaceId, SocketEvent.DECISION_UPDATED, next);
  return { previous, next };
}
