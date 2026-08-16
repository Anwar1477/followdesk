import { FilterQuery, Types } from 'mongoose';
import { TaskModel, ITask } from '../models/Task';
import { BaseRepository } from './base.repository';

export interface TaskListFilter {
  workspaceId: string;
  projectId?: string;
  status?: string;
  priority?: string;
  assigneeId?: string;
  label?: string;
  search?: string;
  dueBefore?: Date;
  dueAfter?: Date;
}

class TaskRepository extends BaseRepository<ITask> {
  constructor() {
    super(TaskModel);
  }

  buildFilter(filter: TaskListFilter): FilterQuery<ITask> {
    const query: FilterQuery<ITask> = { workspaceId: filter.workspaceId };
    if (filter.projectId) query.projectId = filter.projectId;
    if (filter.status) query.status = filter.status;
    if (filter.priority) query.priority = filter.priority;
    if (filter.assigneeId) query.assigneeId = filter.assigneeId;
    if (filter.label) query.labels = filter.label;
    if (filter.search) query.$text = { $search: filter.search };
    if (filter.dueBefore || filter.dueAfter) {
      query.dueDate = {};
      if (filter.dueBefore) query.dueDate.$lte = filter.dueBefore;
      if (filter.dueAfter) query.dueDate.$gte = filter.dueAfter;
    }
    return query;
  }

  async list(filter: TaskListFilter, skip: number, limit: number) {
    const query = this.buildFilter(filter);
    const [items, total] = await Promise.all([
      this.model.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
      this.model.countDocuments(query),
    ]);
    return { items, total };
  }

  async findByIdInWorkspace(id: string, workspaceId: string) {
    return this.model.findOne({ _id: id, workspaceId });
  }

  async findDependents(taskId: string) {
    return this.model.find({ dependsOn: taskId });
  }

  async countByProjectAndStatus(projectId: string) {
    return this.model.aggregate([
      { $match: { projectId: new Types.ObjectId(projectId) } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);
  }
}

export const taskRepository = new TaskRepository();
