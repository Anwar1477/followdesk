import { workspaceRepository } from '../repositories/workspace.repository';
import { workspaceMemberRepository } from '../repositories/workspaceMember.repository';
import { projectRepository } from '../repositories/project.repository';
import { taskRepository } from '../repositories/task.repository';
import { taskCommentRepository } from '../repositories/taskComment.repository';
import { meetingRepository } from '../repositories/meeting.repository';
import { meetingNoteRepository } from '../repositories/meetingNote.repository';
import { decisionRepository } from '../repositories/decision.repository';
import { documentRepository, documentFolderRepository } from '../repositories/document.repository';
import { notificationRepository } from '../repositories/notification.repository';
import { activityRepository } from '../repositories/activity.repository';
import { attachmentRepository } from '../repositories/attachment.repository';
import { storageDriver } from './storage.service';
import { ApiError } from '../utils/ApiError';
import { WorkspaceRole } from '../constants/enums';
import { slugWithSuffix } from '../utils/slug';

export async function createWorkspace(ownerId: string, data: { name: string; description?: string }) {
  let slug = slugWithSuffix(data.name);
  // Extremely unlikely collision loop guard.
  while (await workspaceRepository.slugExists(slug)) {
    slug = slugWithSuffix(data.name);
  }

  const workspace = await workspaceRepository.create({ name: data.name, description: data.description, ownerId, slug });
  await workspaceMemberRepository.create({ workspaceId: workspace._id, userId: ownerId, role: WorkspaceRole.ADMIN });
  return workspace;
}

export async function listMyWorkspaces(userId: string) {
  const memberships = await workspaceMemberRepository.listByUser(userId);
  return memberships.map((m) => ({ workspace: m.workspaceId, role: m.role, joinedAt: m.joinedAt }));
}

export async function getWorkspace(workspaceId: string) {
  const workspace = await workspaceRepository.findById(workspaceId);
  if (!workspace) throw ApiError.notFound('Workspace not found');
  return workspace;
}

export async function updateWorkspace(workspaceId: string, data: { name?: string; description?: string }) {
  const workspace = await workspaceRepository.updateById(workspaceId, data);
  if (!workspace) throw ApiError.notFound('Workspace not found');
  return workspace;
}

/**
 * Deletes a workspace and cascades deletion across every workspace-owned
 * collection so no orphaned, cross-tenant-leaking documents remain -
 * strict workspace isolation applies to teardown as much as reads/writes.
 */
export async function deleteWorkspace(workspaceId: string) {
  const workspace = await workspaceRepository.findById(workspaceId);
  if (!workspace) throw ApiError.notFound('Workspace not found');

  const attachments = await attachmentRepository.find({ workspaceId });
  await Promise.all(attachments.map((a) => storageDriver.remove(a.storageKey)));

  await Promise.all([
    workspaceMemberRepository.deleteMany({ workspaceId }),
    projectRepository.deleteMany({ workspaceId }),
    taskRepository.deleteMany({ workspaceId }),
    taskCommentRepository.deleteMany({ workspaceId }),
    meetingRepository.deleteMany({ workspaceId }),
    meetingNoteRepository.deleteMany({ workspaceId }),
    decisionRepository.deleteMany({ workspaceId }),
    documentRepository.deleteMany({ workspaceId }),
    documentFolderRepository.deleteMany({ workspaceId }),
    notificationRepository.deleteMany({ workspaceId }),
    activityRepository.deleteMany({ workspaceId }),
    attachmentRepository.deleteMany({ workspaceId }),
  ]);

  await workspaceRepository.deleteById(workspaceId);
  return workspace;
}
