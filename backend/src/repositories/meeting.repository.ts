import { FilterQuery } from 'mongoose';
import { MeetingModel, IMeeting } from '../models/Meeting';
import { BaseRepository } from './base.repository';

export interface MeetingListFilter {
  workspaceId: string;
  projectId?: string;
  status?: string;
  search?: string;
}

class MeetingRepository extends BaseRepository<IMeeting> {
  constructor() {
    super(MeetingModel);
  }

  buildFilter(filter: MeetingListFilter): FilterQuery<IMeeting> {
    const query: FilterQuery<IMeeting> = { workspaceId: filter.workspaceId };
    if (filter.projectId) query.projectId = filter.projectId;
    if (filter.status) query.status = filter.status;
    if (filter.search) query.$text = { $search: filter.search };
    return query;
  }

  async list(filter: MeetingListFilter, skip: number, limit: number) {
    const query = this.buildFilter(filter);
    const [items, total] = await Promise.all([
      this.model.find(query).sort({ scheduledAt: -1 }).skip(skip).limit(limit),
      this.model.countDocuments(query),
    ]);
    return { items, total };
  }

  async findByIdInWorkspace(id: string, workspaceId: string) {
    return this.model.findOne({ _id: id, workspaceId });
  }
}

export const meetingRepository = new MeetingRepository();
