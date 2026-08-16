import { notificationRepository } from '../repositories/notification.repository';
import { NotificationType } from '../constants/enums';
import { emitToUserRoom, SocketEvent } from '../sockets/emitter';
import { normalizePagination, PaginationQuery } from '../utils/pagination';
import { buildPagination } from '../utils/ApiResponse';
import { ApiError } from '../utils/ApiError';

export interface CreateNotificationInput {
  workspaceId: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  entityType?: string;
  entityId?: string;
}

/** Creates a notification for a single user and pushes it to them in real time. */
export async function createNotification(input: CreateNotificationInput) {
  const notification = await notificationRepository.create({
    workspaceId: input.workspaceId,
    userId: input.userId,
    type: input.type,
    title: input.title,
    message: input.message,
    entityType: input.entityType,
    entityId: input.entityId,
  });
  emitToUserRoom(input.userId, SocketEvent.NOTIFICATION_CREATED, notification);
  return notification;
}

/** Fan-out helper for notifying several users about the same event (e.g. meeting participants). */
export async function notifyUsers(userIds: string[], input: Omit<CreateNotificationInput, 'userId'>) {
  const uniqueIds = Array.from(new Set(userIds));
  await Promise.all(uniqueIds.map((userId) => createNotification({ ...input, userId })));
}

export async function listNotifications(userId: string, query: PaginationQuery & { unreadOnly?: boolean }) {
  const { page, limit, skip } = normalizePagination(query);
  const { items, total } = await notificationRepository.listByUser(userId, skip, limit, query.unreadOnly);
  return { items, pagination: buildPagination(page, limit, total) };
}

export async function countUnreadNotifications(userId: string) {
  return notificationRepository.countUnread(userId);
}

export async function markNotificationRead(notificationId: string, userId: string) {
  const notification = await notificationRepository.markRead(notificationId, userId);
  if (!notification) throw ApiError.notFound('Notification not found');
  return notification;
}

export async function markAllNotificationsRead(userId: string) {
  await notificationRepository.markAllRead(userId);
}
