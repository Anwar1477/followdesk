import { z } from 'zod';
import { paginationQuerySchema } from './common.validator';

export const createCommentSchema = z.object({
  content: z.string().trim().min(1).max(5000),
});

export const updateCommentSchema = z.object({
  content: z.string().trim().min(1).max(5000),
});

export const listCommentsQuerySchema = paginationQuerySchema;
