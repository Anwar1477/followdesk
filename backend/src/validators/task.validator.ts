import { z } from 'zod';
import { TaskStatus, Priority } from '../constants/enums';
import { objectIdSchema, paginationQuerySchema } from './common.validator';

export const createTaskSchema = z.object({
  projectId: objectIdSchema,
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(5000).optional(),
  status: z.nativeEnum(TaskStatus).optional(),
  priority: z.nativeEnum(Priority).optional(),
  assigneeId: objectIdSchema.optional(),
  labels: z.array(z.string().trim().max(40)).max(20).optional(),
  dueDate: z.coerce.date().optional(),
  dependsOn: z.array(objectIdSchema).optional(),
});

export const updateTaskSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  description: z.string().trim().max(5000).optional(),
  status: z.nativeEnum(TaskStatus).optional(),
  priority: z.nativeEnum(Priority).optional(),
  assigneeId: objectIdSchema.nullable().optional(),
  labels: z.array(z.string().trim().max(40)).max(20).optional(),
  dueDate: z.coerce.date().nullable().optional(),
});

export const addDependencySchema = z.object({
  dependsOnTaskId: objectIdSchema,
});

export const listTasksQuerySchema = paginationQuerySchema.extend({
  projectId: objectIdSchema.optional(),
  status: z.nativeEnum(TaskStatus).optional(),
  priority: z.nativeEnum(Priority).optional(),
  assigneeId: objectIdSchema.optional(),
  label: z.string().trim().max(40).optional(),
  search: z.string().trim().max(200).optional(),
  dueBefore: z.coerce.date().optional(),
  dueAfter: z.coerce.date().optional(),
});
