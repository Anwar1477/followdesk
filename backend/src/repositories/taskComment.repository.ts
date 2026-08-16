import { TaskCommentModel, ITaskComment } from '../models/TaskComment';
import { BaseRepository } from './base.repository';

class TaskCommentRepository extends BaseRepository<ITaskComment> {
  constructor() {
    super(TaskCommentModel);
  }

  async listByTask(taskId: string, skip: number, limit: number) {
    const query = { taskId };
    const [items, total] = await Promise.all([
      this.model.find(query).sort({ createdAt: 1 }).skip(skip).limit(limit).populate('authorId', 'name email avatarUrl'),
      this.model.countDocuments(query),
    ]);
    return { items, total };
  }
}

export const taskCommentRepository = new TaskCommentRepository();
