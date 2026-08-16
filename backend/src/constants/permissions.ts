import { WorkspaceRole } from './enums';

/**
 * Centralized permission matrix. Every authorization check in the codebase
 * goes through `can()` below rather than comparing roles ad-hoc, so the
 * matrix here is the single source of truth (see docs/AUTHENTICATION.md
 * and docs/API.md for the human-readable table).
 */
export const Permission = {
  WORKSPACE_MANAGE_SETTINGS: 'WORKSPACE_MANAGE_SETTINGS',
  WORKSPACE_DELETE: 'WORKSPACE_DELETE',
  MEMBER_MANAGE: 'MEMBER_MANAGE',
  PROJECT_CREATE: 'PROJECT_CREATE',
  PROJECT_MANAGE: 'PROJECT_MANAGE',
  PROJECT_DELETE: 'PROJECT_DELETE',
  TASK_MANAGE: 'TASK_MANAGE',
  DECISION_CREATE: 'DECISION_CREATE',
  DECISION_MANAGE: 'DECISION_MANAGE',
  ANALYTICS_VIEW_FULL: 'ANALYTICS_VIEW_FULL',
  DOCUMENT_MANAGE: 'DOCUMENT_MANAGE',
  MEETING_MANAGE: 'MEETING_MANAGE',
} as const;
export type Permission = (typeof Permission)[keyof typeof Permission];

const ADMIN_ONLY = new Set<Permission>([
  Permission.WORKSPACE_MANAGE_SETTINGS,
  Permission.WORKSPACE_DELETE,
  Permission.MEMBER_MANAGE,
]);

const ADMIN_AND_MANAGER = new Set<Permission>([
  Permission.PROJECT_CREATE,
  Permission.PROJECT_MANAGE,
  Permission.PROJECT_DELETE,
  Permission.TASK_MANAGE,
  Permission.DECISION_CREATE,
  Permission.DECISION_MANAGE,
  Permission.ANALYTICS_VIEW_FULL,
  Permission.DOCUMENT_MANAGE,
  Permission.MEETING_MANAGE,
]);

/**
 * Returns true when `role` has blanket access to `permission`.
 * MEMBER role never appears here - member access is always resource-scoped
 * (e.g. "assigned to them", "author of it") and is checked separately by
 * the service layer (see task.service.ts / decision.service.ts).
 */
export function roleHasPermission(role: WorkspaceRole, permission: Permission): boolean {
  if (role === WorkspaceRole.ADMIN) {
    return ADMIN_ONLY.has(permission) || ADMIN_AND_MANAGER.has(permission);
  }
  if (role === WorkspaceRole.MANAGER) {
    return ADMIN_AND_MANAGER.has(permission);
  }
  return false;
}
