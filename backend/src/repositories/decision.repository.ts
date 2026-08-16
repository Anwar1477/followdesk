import { FilterQuery } from 'mongoose';
import { DecisionModel, IDecision } from '../models/Decision';
import { BaseRepository } from './base.repository';

export interface DecisionListFilter {
  workspaceId: string;
  projectId?: string;
  status?: string;
  tag?: string;
  search?: string;
}

class DecisionRepository extends BaseRepository<IDecision> {
  constructor() {
    super(DecisionModel);
  }

  buildFilter(filter: DecisionListFilter): FilterQuery<IDecision> {
    const query: FilterQuery<IDecision> = { workspaceId: filter.workspaceId };
    if (filter.projectId) query.projectId = filter.projectId;
    if (filter.status) query.status = filter.status;
    if (filter.tag) query.tags = filter.tag;
    if (filter.search) query.$text = { $search: filter.search };
    return query;
  }

  async list(filter: DecisionListFilter, skip: number, limit: number) {
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
}

export const decisionRepository = new DecisionRepository();
