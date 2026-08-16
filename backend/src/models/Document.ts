import { Schema, model, Document as MongooseDocument, Types } from 'mongoose';
import { DocumentVisibility } from '../constants/enums';

export interface IDocument extends MongooseDocument {
  _id: Types.ObjectId;
  workspaceId: Types.ObjectId;
  projectId?: Types.ObjectId;
  folderId?: Types.ObjectId;
  title: string;
  slug: string;
  content: string;
  authorId: Types.ObjectId;
  visibility: DocumentVisibility;
  tags: string[];
  attachments: Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const documentSchema = new Schema<IDocument>(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    projectId: { type: Schema.Types.ObjectId, ref: 'Project', index: true },
    folderId: { type: Schema.Types.ObjectId, ref: 'DocumentFolder', index: true },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    slug: { type: String, required: true, trim: true, lowercase: true },
    content: { type: String, default: '', maxlength: 100000 },
    authorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    visibility: { type: String, enum: Object.values(DocumentVisibility), default: DocumentVisibility.WORKSPACE },
    tags: [{ type: String, trim: true, lowercase: true, maxlength: 40 }],
    attachments: [{ type: Schema.Types.ObjectId, ref: 'Attachment' }],
  },
  { timestamps: true }
);

documentSchema.index({ workspaceId: 1, slug: 1 }, { unique: true });
documentSchema.index({ title: 'text', content: 'text' });

export const DocumentModel = model<IDocument>('Document', documentSchema);

export interface IDocumentFolder extends MongooseDocument {
  _id: Types.ObjectId;
  workspaceId: Types.ObjectId;
  projectId?: Types.ObjectId;
  name: string;
  parentId?: Types.ObjectId;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const documentFolderSchema = new Schema<IDocumentFolder>(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    projectId: { type: Schema.Types.ObjectId, ref: 'Project', index: true },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    parentId: { type: Schema.Types.ObjectId, ref: 'DocumentFolder' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

export const DocumentFolderModel = model<IDocumentFolder>('DocumentFolder', documentFolderSchema);
