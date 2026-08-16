import { Schema, model, Document, Types } from 'mongoose';

export interface ITaskComment extends Document {
  _id: Types.ObjectId;
  workspaceId: Types.ObjectId;
  taskId: Types.ObjectId;
  authorId: Types.ObjectId;
  content: string;
  mentions: Types.ObjectId[];
  editedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const taskCommentSchema = new Schema<ITaskComment>(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    taskId: { type: Schema.Types.ObjectId, ref: 'Task', required: true, index: true },
    authorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    content: { type: String, required: true, maxlength: 5000 },
    mentions: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    editedAt: { type: Date },
  },
  { timestamps: true }
);

taskCommentSchema.index({ taskId: 1, createdAt: 1 });

export const TaskCommentModel = model<ITaskComment>('TaskComment', taskCommentSchema);
