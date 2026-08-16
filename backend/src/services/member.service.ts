import { workspaceMemberRepository } from '../repositories/workspaceMember.repository';
import { userRepository } from '../repositories/user.repository';
import { workspaceRepository } from '../repositories/workspace.repository';
import { ApiError } from '../utils/ApiError';
import { WorkspaceRole, NotificationType } from '../constants/enums';
import { createNotification } from './notification.service';
import { recordActivity } from './activity.service';
import { ActivityType } from '../constants/enums';

/**
 * Adds an existing registered user to a workspace by email. FlowDesk does
 * not currently send outbound invitation emails (no email provider is
 * wired up - see docs/SETUP.md); the invited user must already have an
 * account. They are notified in-app and in real time.
 */
export async function inviteMember(
  workspaceId: string,
  invitedBy: string,
  data: { email: string; role?: WorkspaceRole }
) {
  const user = await userRepository.findByEmail(data.email);
  if (!user) {
    throw ApiError.notFound('No FlowDesk account exists for this email yet. Ask them to register first.');
  }

  const existingMembership = await workspaceMemberRepository.findMembership(workspaceId, user._id.toString());
  if (existingMembership) throw ApiError.conflict('This user is already a member of the workspace');

  const membership = await workspaceMemberRepository.create({
    workspaceId,
    userId: user._id,
    role: data.role ?? WorkspaceRole.MEMBER,
    invitedBy,
  });

  const workspace = await workspaceRepository.findById(workspaceId);

  await createNotification({
    workspaceId,
    userId: user._id.toString(),
    type: NotificationType.WORKSPACE_INVITE,
    title: 'Added to workspace',
    message: `You have been added to "${workspace?.name ?? 'a workspace'}" as ${membership.role}.`,
    entityType: 'Workspace',
    entityId: workspaceId,
  });

  await recordActivity({
    workspaceId,
    actorId: invitedBy,
    type: ActivityType.MEMBER_ADDED,
    entityType: 'WorkspaceMember',
    entityId: membership._id.toString(),
    metadata: { userId: user._id.toString(), role: membership.role },
  });

  return membership;
}

export async function listMembers(workspaceId: string) {
  return workspaceMemberRepository.listByWorkspace(workspaceId);
}

export async function updateMemberRole(
  workspaceId: string,
  memberUserId: string,
  role: WorkspaceRole,
  actorId: string
) {
  const membership = await workspaceMemberRepository.findMembership(workspaceId, memberUserId);
  if (!membership) throw ApiError.notFound('Member not found in this workspace');

  if (membership.role === WorkspaceRole.ADMIN && role !== WorkspaceRole.ADMIN) {
    const adminCount = await workspaceMemberRepository.countAdmins(workspaceId);
    if (adminCount <= 1) throw ApiError.conflict('A workspace must have at least one admin');
  }

  membership.role = role;
  await membership.save();

  await recordActivity({
    workspaceId,
    actorId,
    type: ActivityType.MEMBER_ROLE_UPDATED,
    entityType: 'WorkspaceMember',
    entityId: membership._id.toString(),
    metadata: { userId: memberUserId, role },
  });

  return membership;
}

export async function removeMember(workspaceId: string, memberUserId: string, actorId: string) {
  const membership = await workspaceMemberRepository.findMembership(workspaceId, memberUserId);
  if (!membership) throw ApiError.notFound('Member not found in this workspace');

  if (membership.role === WorkspaceRole.ADMIN) {
    const adminCount = await workspaceMemberRepository.countAdmins(workspaceId);
    if (adminCount <= 1) throw ApiError.conflict('A workspace must have at least one admin');
  }

  await workspaceMemberRepository.removeMembership(workspaceId, memberUserId);

  await recordActivity({
    workspaceId,
    actorId,
    type: ActivityType.MEMBER_REMOVED,
    entityType: 'WorkspaceMember',
    entityId: membership._id.toString(),
    metadata: { userId: memberUserId },
  });
}
