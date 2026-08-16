import { Schema, model, Document, Types } from 'mongoose';
import { AttachmentEntityType } from '../constants/enums';

export interface IAttachment extends Document {
  _id: Types.ObjectId;
  workspaceId: Types.ObjectId;
  entityType: AttachmentEntityType;
  entityId: Types.ObjectId;
  uploadedBy: Types.ObjectId;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  storageDriver: 'local' | 'cloudinary';
  url: string;
  storageKey: string;
  createdAt: Date;
  updatedAt: Date;
}

const attachmentSchema = new Schema<IAttachment>(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    entityType: { type: String, enum: Object.values(AttachmentEntityType), required: true },
    entityId: { type: Schema.Types.ObjectId, required: true, index: true },
    uploadedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    fileName: { type: String, required: true },
    mimeType: { type: String, required: true },
    sizeBytes: { type: Number, required: true },
    storageDriver: { type: String, enum: ['local', 'cloudinary'], required: true },
    url: { type: String, required: true },
    storageKey: { type: String, required: true },
  },
  { timestamps: true }
);

attachmentSchema.index({ entityType: 1, entityId: 1 });

export const AttachmentModel = model<IAttachment>('Attachment', attachmentSchema);
