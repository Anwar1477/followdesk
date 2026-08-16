import { Schema, model, Document, Types } from 'mongoose';
import { WorkspaceRole } from '../constants/enums';

export interface IWorkspaceMember extends Document {
  _id: Types.ObjectId;
  workspaceId: Types.ObjectId;
  userId: Types.ObjectId;
  role: WorkspaceRole;
  invitedBy?: Types.ObjectId;
  joinedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const workspaceMemberSchema = new Schema<IWorkspaceMember>(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    role: { type: String, enum: Object.values(WorkspaceRole), required: true, default: WorkspaceRole.MEMBER },
    invitedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    joinedAt: { type: Date, default: () => new Date() },
  },
  { timestamps: true }
);

workspaceMemberSchema.index({ workspaceId: 1, userId: 1 }, { unique: true });

export const WorkspaceMemberModel = model<IWorkspaceMember>('WorkspaceMember', workspaceMemberSchema);
