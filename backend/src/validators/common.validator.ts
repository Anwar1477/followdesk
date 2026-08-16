import { z } from 'zod';
import mongoose from 'mongoose';

export const objectIdSchema = z.string().refine((val) => mongoose.isValidObjectId(val), {
  message: 'Invalid id',
});

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

export const workspaceIdParamSchema = z.object({
  workspaceId: objectIdSchema,
});

export function idParamSchema(paramName: string) {
  return z.object({ [paramName]: objectIdSchema });
}
