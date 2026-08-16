import { ApiError } from './ApiError';
import { workspaceMemberRepository } from '../repositories/workspaceMember.repository';
import { WorkspaceRole } from '../constants/enums';
import { Permission, roleHasPermission } from '../constants/permissions';

export interface Membership {
  workspaceId: string;
  role: WorkspaceRole;
  memberId: string;
}

/**
 * Resolves and verifies workspace membership for resources whose routes
 * are nested under something other than /workspaces/:workspaceId
 * (tasks, comments, meetings, decisions, documents, attachments, ...).
 * This is the defense-in-depth counterpart to the requireWorkspaceMember
 * middleware, which only covers directly-nested workspace routes.
 */
export async function assertWorkspaceMembership(workspaceId: string, userId: string): Promise<Membership> {
  const membership = await workspaceMemberRepository.findMembership(workspaceId, userId);
  if (!membership) {
    throw ApiError.forbidden('You are not a member of this workspace');
  }
  return { workspaceId, role: membership.role, memberId: membership._id.toString() };
}

export function assertPermission(role: WorkspaceRole, permission: Permission): void {
  if (!roleHasPermission(role, permission)) {
    throw ApiError.forbidden('You do not have permission to perform this action');
  }
}
