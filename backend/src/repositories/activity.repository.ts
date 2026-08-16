import { ActivityModel, IActivity } from '../models/Activity';
import { BaseRepository } from './base.repository';

class ActivityRepository extends BaseRepository<IActivity> {
  constructor() {
    super(ActivityModel);
  }

  async listByWorkspace(workspaceId: string, skip: number, limit: number, projectId?: string) {
    const query: Record<string, unknown> = { workspaceId };
    if (projectId) query.projectId = projectId;
    const [items, total] = await Promise.all([
      this.model.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).populate('actorId', 'name email avatarUrl'),
      this.model.countDocuments(query),
    ]);
    return { items, total };
  }

  async recentByProject(projectId: string, since: Date) {
    return this.model.countDocuments({ projectId, createdAt: { $gte: since } });
  }
}

export const activityRepository = new ActivityRepository();
