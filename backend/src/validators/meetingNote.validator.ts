import { z } from 'zod';
import { objectIdSchema } from './common.validator';

export const actionItemInputSchema = z.object({
  title: z.string().trim().min(1).max(300),
  assigneeId: objectIdSchema.optional(),
  dueDate: z.coerce.date().optional(),
});

export const createMeetingNoteSchema = z.object({
  content: z.string().trim().max(20000).default(''),
  actionItems: z.array(actionItemInputSchema).optional(),
});

export const updateMeetingNoteSchema = z.object({
  content: z.string().trim().max(20000).optional(),
});

export const addActionItemSchema = actionItemInputSchema;

export const updateActionItemSchema = z.object({
  title: z.string().trim().min(1).max(300).optional(),
  assigneeId: objectIdSchema.nullable().optional(),
  dueDate: z.coerce.date().nullable().optional(),
  completed: z.boolean().optional(),
});

export const convertActionItemSchema = z.object({
  projectId: objectIdSchema,
});
