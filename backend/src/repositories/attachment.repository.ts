import { AttachmentModel, IAttachment } from '../models/Attachment';
import { BaseRepository } from './base.repository';
import { AttachmentEntityType } from '../constants/enums';

class AttachmentRepository extends BaseRepository<IAttachment> {
  constructor() {
    super(AttachmentModel);
  }

  async listByEntity(entityType: AttachmentEntityType, entityId: string) {
    return this.model.find({ entityType, entityId }).sort({ createdAt: -1 });
  }

  async findByIdInWorkspace(id: string, workspaceId: string) {
    return this.model.findOne({ _id: id, workspaceId });
  }
}

export const attachmentRepository = new AttachmentRepository();
