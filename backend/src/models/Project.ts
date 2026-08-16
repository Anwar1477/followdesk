import { Schema, model, Document, Types } from 'mongoose';
import { ProjectStatus, Priority } from '../constants/enums';

export interface IProject extends Document {
  _id: Types.ObjectId;
  workspaceId: Types.ObjectId;
  name: string;
  key: string;
  description?: string;
  status: ProjectStatus;
  priority: Priority;
  ownerId: Types.ObjectId;
  startDate?: Date;
  dueDate?: Date;
  members: Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const projectSchema = new Schema<IProject>(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 160 },
    key: { type: String, required: true, trim: true, uppercase: true, maxlength: 10 },
    description: { type: String, maxlength: 2000 },
    status: { type: String, enum: Object.values(ProjectStatus), default: ProjectStatus.PLANNING, index: true },
    priority: { type: String, enum: Object.values(Priority), default: Priority.MEDIUM },
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    startDate: { type: Date },
    dueDate: { type: Date },
    members: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  },
  { timestamps: true }
);

projectSchema.index({ workspaceId: 1, key: 1 }, { unique: true });
projectSchema.index({ workspaceId: 1, status: 1 });
projectSchema.index({ name: 'text', description: 'text' });

export const ProjectModel = model<IProject>('Project', projectSchema);
