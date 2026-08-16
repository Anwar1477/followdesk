import { z } from 'zod';
import { AttachmentEntityType } from '../constants/enums';
import { objectIdSchema } from './common.validator';

export const uploadAttachmentParamsSchema = z.object({
  entityType: z.nativeEnum(AttachmentEntityType),
  entityId: objectIdSchema,
});
