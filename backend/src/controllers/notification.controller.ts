import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { sendList, sendSuccess } from '../utils/ApiResponse';
import * as notificationService from '../services/notification.service';

export const listNotifications = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, unreadOnly } = req.query as Record<string, string>;
  const { items, pagination } = await notificationService.listNotifications(req.user!.id, {
    page: page ? Number(page) : undefined,
    limit: limit ? Number(limit) : undefined,
    unreadOnly: unreadOnly === 'true',
  });
  sendList(res, items, pagination);
});

export const markRead = asyncHandler(async (req: Request, res: Response) => {
  const notification = await notificationService.markNotificationRead(req.params.id, req.user!.id);
  sendSuccess(res, notification);
});

export const markAllRead = asyncHandler(async (req: Request, res: Response) => {
  await notificationService.markAllNotificationsRead(req.user!.id);
  sendSuccess(res, { message: 'All notifications marked as read' });
});
