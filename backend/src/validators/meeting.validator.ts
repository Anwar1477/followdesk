import { z } from 'zod';
import { MeetingStatus } from '../constants/enums';
import { objectIdSchema, paginationQuerySchema } from './common.validator';

export const createMeetingSchema = z.object({
  projectId: objectIdSchema.optional(),
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(3000).optional(),
  scheduledAt: z.coerce.date(),
  durationMinutes: z.coerce.number().int().min(0).max(1440).optional(),
  participants: z.array(objectIdSchema).optional(),
});

export const updateMeetingSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  description: z.string().trim().max(3000).optional(),
  status: z.nativeEnum(MeetingStatus).optional(),
  scheduledAt: z.coerce.date().optional(),
  durationMinutes: z.coerce.number().int().min(0).max(1440).optional(),
});

export const addParticipantsSchema = z.object({
  participantIds: z.array(objectIdSchema).min(1),
});

export const listMeetingsQuerySchema = paginationQuerySchema.extend({
  projectId: objectIdSchema.optional(),
  status: z.nativeEnum(MeetingStatus).optional(),
  search: z.string().trim().max(200).optional(),
});
