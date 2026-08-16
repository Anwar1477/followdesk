import { Schema, model, Document, Types } from 'mongoose';
import { TaskStatus, Priority } from '../constants/enums';

export interface ITask extends Document {
  _id: Types.ObjectId;
  workspaceId: Types.ObjectId;
  projectId: Types.ObjectId;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: Priority;
  assigneeId?: Types.ObjectId;
  createdBy: Types.ObjectId;
  labels: string[];
  dueDate?: Date;
  dependsOn: Types.ObjectId[];
  attachments: Types.ObjectId[];
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const taskSchema = new Schema<ITask>(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
    projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, maxlength: 5000 },
    status: { type: String, enum: Object.values(TaskStatus), default: TaskStatus.TODO, index: true },
    priority: { type: String, enum: Object.values(Priority), default: Priority.MEDIUM, index: true },
    assigneeId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    labels: [{ type: String, trim: true, maxlength: 40 }],
    dueDate: { type: Date, index: true },
    dependsOn: [{ type: Schema.Types.ObjectId, ref: 'Task' }],
    attachments: [{ type: Schema.Types.ObjectId, ref: 'Attachment' }],
    completedAt: { type: Date },
  },
  { timestamps: true }
);

taskSchema.index({ workspaceId: 1, projectId: 1, status: 1 });
taskSchema.index({ workspaceId: 1, assigneeId: 1, status: 1 });
taskSchema.index({ title: 'text', description: 'text' });

export const TaskModel = model<ITask>('Task', taskSchema);
