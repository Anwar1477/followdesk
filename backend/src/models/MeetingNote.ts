import { Schema, model, Document, Types } from 'mongoose';

export interface IActionItem {
  _id: Types.ObjectId;
  title: string;
  assigneeId?: Types.ObjectId;
  dueDate?: Date;
  completed: boolean;
  taskId?: Types.ObjectId;
}

export interface IMeetingNote extends Document {
  _id: Types.ObjectId;
  workspaceId: Types.ObjectId;
  meetingId: Types.ObjectId;
  authorId: Types.ObjectId;
  content: string;
  actionItems: IActionItem[];
  createdAt: Date;
  updatedAt: Date;
}

const actionItemSchema = new Schema<IActionItem>(
  {
    title: { type: String, required: true, trim: true, maxlength: 300 },
    assigneeId: { type: Schema.Types.ObjectId, ref: 'User' },
    dueDate: { type: Date },
    completed: { type: Boolean, default: false },
    taskId: { type: Schema.Types.ObjectId, ref: 'Task' },
  },
  { _id: true }
);

const meetingNoteSchema = new Schema<IMeetingNote>(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    meetingId: { type: Schema.Types.ObjectId, ref: 'Meeting', required: true, index: true },
    authorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    content: { type: String, default: '', maxlength: 20000 },
    actionItems: [actionItemSchema],
  },
  { timestamps: true }
);

export const MeetingNoteModel = model<IMeetingNote>('MeetingNote', meetingNoteSchema);
