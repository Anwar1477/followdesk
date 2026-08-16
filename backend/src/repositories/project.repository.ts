import { FilterQuery } from 'mongoose';
import { ProjectModel, IProject } from '../models/Project';
import { BaseRepository } from './base.repository';

export interface ProjectListFilter {
  workspaceId: string;
  status?: string;
  priority?: string;
  ownerId?: string;
  memberId?: string;
  search?: string;
}

class ProjectRepository extends BaseRepository<IProject> {
  constructor() {
    super(ProjectModel);
  }

  buildFilter(filter: ProjectListFilter): FilterQuery<IProject> {
    const query: FilterQuery<IProject> = { workspaceId: filter.workspaceId };
    if (filter.status) query.status = filter.status;
    if (filter.priority) query.priority = filter.priority;
    if (filter.ownerId) query.ownerId = filter.ownerId;
    if (filter.memberId) query.members = filter.memberId;
    if (filter.search) query.$text = { $search: filter.search };
    return query;
  }

  async list(filter: ProjectListFilter, skip: number, limit: number) {
    const query = this.buildFilter(filter);
    const [items, total] = await Promise.all([
      this.model.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
      this.model.countDocuments(query),
    ]);
    return { items, total };
  }

  async findByWorkspaceAndKey(workspaceId: string, key: string) {
    return this.model.findOne({ workspaceId, key });
  }

  async findByIdInWorkspace(id: string, workspaceId: string) {
    return this.model.findOne({ _id: id, workspaceId });
  }
}

export const projectRepository = new ProjectRepository();
