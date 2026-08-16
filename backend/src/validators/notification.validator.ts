import { z } from 'zod';
import { paginationQuerySchema } from './common.validator';

export const listNotificationsQuerySchema = paginationQuerySchema.extend({
  unreadOnly: z.coerce.boolean().optional(),
});
