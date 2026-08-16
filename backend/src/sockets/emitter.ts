import { getIO, workspaceRoom } from './index';

export const SocketEvent = {
  TASK_CREATED: 'task.created',
  TASK_UPDATED: 'task.updated',
  TASK_MOVED: 'task.moved',
  TASK_COMPLETED: 'task.completed',
  COMMENT_CREATED: 'comment.created',
  NOTIFICATION_CREATED: 'notification.created',
  ACTIVITY_CREATED: 'activity.created',
  MEETING_UPDATED: 'meeting.updated',
  DECISION_UPDATED: 'decision.updated',
} as const;
export type SocketEvent = (typeof SocketEvent)[keyof typeof SocketEvent];

/**
 * Emits an event to every socket that has joined the given workspace's
 * room. No-ops safely if Socket.IO hasn't been initialized yet (e.g. in
 * unit tests that exercise services without booting the HTTP/socket
 * server).
 */
export function emitToWorkspace(workspaceId: string, event: SocketEvent, payload: unknown): void {
  const io = getIO();
  if (!io) return;
  io.to(workspaceRoom(workspaceId)).emit(event, payload);
}

/** Emits directly to a single user's personal room (joined implicitly is not supported; used via user-targeted broadcast through workspace room + client-side filter, or a dedicated user room if the client opts in). */
export function emitToUserRoom(userId: string, event: SocketEvent, payload: unknown): void {
  const io = getIO();
  if (!io) return;
  io.to(`user:${userId}`).emit(event, payload);
}
