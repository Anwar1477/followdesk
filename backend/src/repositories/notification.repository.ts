import { NotificationModel, INotification } from '../models/Notification';
import { BaseRepository } from './base.repository';

class NotificationRepository extends BaseRepository<INotification> {
  constructor() {
    super(NotificationModel);
  }

  async listByUser(userId: string, skip: number, limit: number, unreadOnly = false) {
    const query: Record<string, unknown> = { userId };
    if (unreadOnly) query.read = false;
    const [items, total] = await Promise.all([
      this.model.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
      this.model.countDocuments(query),
    ]);
    return { items, total };
  }

  async countUnread(userId: string) {
    return this.model.countDocuments({ userId, read: false });
  }

  async markRead(id: string, userId: string) {
    return this.model.findOneAndUpdate({ _id: id, userId }, { read: true, readAt: new Date() }, { new: true });
  }

  async markAllRead(userId: string) {
    return this.model.updateMany({ userId, read: false }, { read: true, readAt: new Date() });
  }
}

export const notificationRepository = new NotificationRepository();
