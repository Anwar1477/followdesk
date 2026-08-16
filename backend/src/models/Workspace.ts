import { Schema, model, Document, Types } from 'mongoose';

export interface IWorkspace extends Document {
  _id: Types.ObjectId;
  name: string;
  slug: string;
  description?: string;
  ownerId: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const workspaceSchema = new Schema<IWorkspace>(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    description: { type: String, maxlength: 500 },
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  },
  { timestamps: true }
);

export const WorkspaceModel = model<IWorkspace>('Workspace', workspaceSchema);
