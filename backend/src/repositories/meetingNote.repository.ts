import { MeetingNoteModel, IMeetingNote } from '../models/MeetingNote';
import { BaseRepository } from './base.repository';

class MeetingNoteRepository extends BaseRepository<IMeetingNote> {
  constructor() {
    super(MeetingNoteModel);
  }

  async listByMeeting(meetingId: string) {
    return this.model.find({ meetingId }).sort({ createdAt: 1 });
  }

  async findByIdInWorkspace(id: string, workspaceId: string) {
    return this.model.findOne({ _id: id, workspaceId });
  }
}

export const meetingNoteRepository = new MeetingNoteRepository();
