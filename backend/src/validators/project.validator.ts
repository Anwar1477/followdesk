import { z } from 'zod';
import { ProjectStatus, Priority } from '../constants/enums';
import { objectIdSchema, paginationQuerySchema } from './common.validator';

export const createProjectSchema = z.object({
  name: z.string().trim().min(1).max(160),
  key: z
    .string()
    .trim()
    .min(2)
    .max(10)
    .regex(/^[A-Za-z0-9]+$/, 'Key must be alphanumeric'),
  description: z.string().trim().max(2000).optional(),
  status: z.nativeEnum(ProjectStatus).optional(),
  priority: z.nativeEnum(Priority).optional(),
  startDate: z.coerce.date().optional(),
  dueDate: z.coerce.date().optional(),
  members: z.array(objectIdSchema).optional(),
});

export const updateProjectSchema = z.object({
  name: z.string().trim().min(1).max(160).optional(),
  description: z.string().trim().max(2000).optional(),
  status: z.nativeEnum(ProjectStatus).optional(),
  priority: z.nativeEnum(Priority).optional(),
  ownerId: objectIdSchema.optional(),
  startDate: z.coerce.date().optional(),
  dueDate: z.coerce.date().optional(),
  members: z.array(objectIdSchema).optional(),
});

export const listProjectsQuerySchema = paginationQuerySchema.extend({
  status: z.nativeEnum(ProjectStatus).optional(),
  priority: z.nativeEnum(Priority).optional(),
  ownerId: objectIdSchema.optional(),
  memberId: objectIdSchema.optional(),
  search: z.string().trim().max(200).optional(),
});
