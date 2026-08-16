import { Schema, model, Document, Types } from 'mongoose';
import { ActivityType } from '../constants/enums';

export interface IActivity extends Document {
  _id: Types.ObjectId;
  workspaceId: Types.ObjectId;
  projectId?: Types.ObjectId;
  actorId: Types.ObjectId;
  type: ActivityType;
  entityType: string;
  entityId: Types.ObjectId;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const activitySchema = new Schema<IActivity>(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    projectId: { type: Schema.Types.ObjectId, ref: 'Project', index: true },
    actorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: Object.values(ActivityType), required: true },
    entityType: { type: String, required: true },
    entityId: { type: Schema.Types.ObjectId, required: true },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

activitySchema.index({ workspaceId: 1, createdAt: -1 });
activitySchema.index({ projectId: 1, createdAt: -1 });

export const ActivityModel = model<IActivity>('Activity', activitySchema);
