import { Schema, model, Document, Types } from 'mongoose';
import { MeetingStatus } from '../constants/enums';

export interface IMeeting extends Document {
  _id: Types.ObjectId;
  workspaceId: Types.ObjectId;
  projectId?: Types.ObjectId;
  title: string;
  description?: string;
  status: MeetingStatus;
  scheduledAt: Date;
  durationMinutes?: number;
  organizerId: Types.ObjectId;
  participants: Types.ObjectId[];
  attachments: Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const meetingSchema = new Schema<IMeeting>(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    projectId: { type: Schema.Types.ObjectId, ref: 'Project', index: true },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, maxlength: 3000 },
    status: { type: String, enum: Object.values(MeetingStatus), default: MeetingStatus.SCHEDULED, index: true },
    scheduledAt: { type: Date, required: true, index: true },
    durationMinutes: { type: Number, min: 0 },
    organizerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    participants: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    attachments: [{ type: Schema.Types.ObjectId, ref: 'Attachment' }],
  },
  { timestamps: true }
);

meetingSchema.index({ title: 'text', description: 'text' });

export const MeetingModel = model<IMeeting>('Meeting', meetingSchema);
