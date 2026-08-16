import { Schema, model, Document, Types } from 'mongoose';
import { DecisionStatus } from '../constants/enums';

export interface IDecision extends Document {
  _id: Types.ObjectId;
  workspaceId: Types.ObjectId;
  projectId?: Types.ObjectId;
  title: string;
  decision: string;
  reason?: string;
  alternatives?: string;
  impact?: string;
  status: DecisionStatus;
  createdBy: Types.ObjectId;
  meetingId?: Types.ObjectId;
  relatedTaskIds: Types.ObjectId[];
  tags: string[];
  supersedes?: Types.ObjectId;
  supersededBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const decisionSchema = new Schema<IDecision>(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    projectId: { type: Schema.Types.ObjectId, ref: 'Project', index: true },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    decision: { type: String, required: true, maxlength: 5000 },
    reason: { type: String, maxlength: 5000 },
    alternatives: { type: String, maxlength: 5000 },
    impact: { type: String, maxlength: 3000 },
    status: { type: String, enum: Object.values(DecisionStatus), default: DecisionStatus.ACTIVE, index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    meetingId: { type: Schema.Types.ObjectId, ref: 'Meeting' },
    relatedTaskIds: [{ type: Schema.Types.ObjectId, ref: 'Task' }],
    tags: [{ type: String, trim: true, lowercase: true, maxlength: 40 }],
    supersedes: { type: Schema.Types.ObjectId, ref: 'Decision' },
    supersededBy: { type: Schema.Types.ObjectId, ref: 'Decision' },
  },
  { timestamps: true }
);

decisionSchema.index({ workspaceId: 1, status: 1 });
decisionSchema.index({ workspaceId: 1, tags: 1 });
decisionSchema.index({ title: 'text', decision: 'text', reason: 'text', alternatives: 'text', impact: 'text' });

export const DecisionModel = model<IDecision>('Decision', decisionSchema);
