export const WorkspaceRole = {
  ADMIN: 'ADMIN',
  MANAGER: 'MANAGER',
  MEMBER: 'MEMBER',
} as const;
export type WorkspaceRole = (typeof WorkspaceRole)[keyof typeof WorkspaceRole];

export const ProjectStatus = {
  PLANNING: 'PLANNING',
  ACTIVE: 'ACTIVE',
  ON_HOLD: 'ON_HOLD',
  COMPLETED: 'COMPLETED',
  ARCHIVED: 'ARCHIVED',
} as const;
export type ProjectStatus = (typeof ProjectStatus)[keyof typeof ProjectStatus];

export const Priority = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  URGENT: 'URGENT',
} as const;
export type Priority = (typeof Priority)[keyof typeof Priority];

export const TaskStatus = {
  TODO: 'TODO',
  IN_PROGRESS: 'IN_PROGRESS',
  IN_REVIEW: 'IN_REVIEW',
  BLOCKED: 'BLOCKED',
  DONE: 'DONE',
} as const;
export type TaskStatus = (typeof TaskStatus)[keyof typeof TaskStatus];

export const MeetingStatus = {
  SCHEDULED: 'SCHEDULED',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
} as const;
export type MeetingStatus = (typeof MeetingStatus)[keyof typeof MeetingStatus];

export const DecisionStatus = {
  ACTIVE: 'ACTIVE',
  REVIEWED: 'REVIEWED',
  SUPERSEDED: 'SUPERSEDED',
  ARCHIVED: 'ARCHIVED',
} as const;
export type DecisionStatus = (typeof DecisionStatus)[keyof typeof DecisionStatus];

export const DocumentVisibility = {
  WORKSPACE: 'WORKSPACE',
  PROJECT: 'PROJECT',
  PRIVATE: 'PRIVATE',
} as const;
export type DocumentVisibility = (typeof DocumentVisibility)[keyof typeof DocumentVisibility];

export const NotificationType = {
  TASK_ASSIGNED: 'TASK_ASSIGNED',
  TASK_STATUS_CHANGED: 'TASK_STATUS_CHANGED',
  TASK_DUE_SOON: 'TASK_DUE_SOON',
  MENTION: 'MENTION',
  COMMENT: 'COMMENT',
  MEETING_INVITE: 'MEETING_INVITE',
  WORKSPACE_INVITE: 'WORKSPACE_INVITE',
  DECISION_UPDATED: 'DECISION_UPDATED',
} as const;
export type NotificationType = (typeof NotificationType)[keyof typeof NotificationType];

export const ActivityType = {
  PROJECT_CREATED: 'PROJECT_CREATED',
  PROJECT_UPDATED: 'PROJECT_UPDATED',
  PROJECT_DELETED: 'PROJECT_DELETED',
  TASK_CREATED: 'TASK_CREATED',
  TASK_UPDATED: 'TASK_UPDATED',
  TASK_COMPLETED: 'TASK_COMPLETED',
  TASK_ASSIGNED: 'TASK_ASSIGNED',
  TASK_DELETED: 'TASK_DELETED',
  COMMENT_ADDED: 'COMMENT_ADDED',
  COMMENT_DELETED: 'COMMENT_DELETED',
  MEETING_CREATED: 'MEETING_CREATED',
  MEETING_UPDATED: 'MEETING_UPDATED',
  MEETING_CANCELLED: 'MEETING_CANCELLED',
  ACTION_ITEM_CONVERTED: 'ACTION_ITEM_CONVERTED',
  DECISION_CREATED: 'DECISION_CREATED',
  DECISION_UPDATED: 'DECISION_UPDATED',
  DECISION_SUPERSEDED: 'DECISION_SUPERSEDED',
  DOCUMENT_CREATED: 'DOCUMENT_CREATED',
  DOCUMENT_UPDATED: 'DOCUMENT_UPDATED',
  MEMBER_ADDED: 'MEMBER_ADDED',
  MEMBER_REMOVED: 'MEMBER_REMOVED',
  MEMBER_ROLE_UPDATED: 'MEMBER_ROLE_UPDATED',
} as const;
export type ActivityType = (typeof ActivityType)[keyof typeof ActivityType];

export const AttachmentEntityType = {
  TASK: 'TASK',
  MEETING: 'MEETING',
  DOCUMENT: 'DOCUMENT',
} as const;
export type AttachmentEntityType = (typeof AttachmentEntityType)[keyof typeof AttachmentEntityType];

export const ProjectHealth = {
  HEALTHY: 'HEALTHY',
  NEEDS_ATTENTION: 'NEEDS_ATTENTION',
  AT_RISK: 'AT_RISK',
} as const;
export type ProjectHealth = (typeof ProjectHealth)[keyof typeof ProjectHealth];

export const SearchEntityType = {
  PROJECT: 'PROJECT',
  TASK: 'TASK',
  MEETING: 'MEETING',
  DECISION: 'DECISION',
  DOCUMENT: 'DOCUMENT',
  MEMBER: 'MEMBER',
} as const;
export type SearchEntityType = (typeof SearchEntityType)[keyof typeof SearchEntityType];
