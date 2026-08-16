import { z } from 'zod';
import { SearchEntityType } from '../constants/enums';
import { objectIdSchema, paginationQuerySchema } from './common.validator';

export const searchQuerySchema = paginationQuerySchema.extend({
  q: z.string().trim().min(1).max(200),
  workspaceId: objectIdSchema,
  type: z.nativeEnum(SearchEntityType).optional(),
  projectId: objectIdSchema.optional(),
});
