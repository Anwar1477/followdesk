import { z } from 'zod';
import { DecisionStatus } from '../constants/enums';
import { objectIdSchema, paginationQuerySchema } from './common.validator';

export const createDecisionSchema = z.object({
  projectId: objectIdSchema.optional(),
  title: z.string().trim().min(1).max(200),
  decision: z.string().trim().min(1).max(5000),
  reason: z.string().trim().max(5000).optional(),
  alternatives: z.string().trim().max(5000).optional(),
  impact: z.string().trim().max(3000).optional(),
  meetingId: objectIdSchema.optional(),
  relatedTaskIds: z.array(objectIdSchema).optional(),
  tags: z.array(z.string().trim().max(40)).max(20).optional(),
});

export const updateDecisionSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  decision: z.string().trim().min(1).max(5000).optional(),
  reason: z.string().trim().max(5000).optional(),
  alternatives: z.string().trim().max(5000).optional(),
  impact: z.string().trim().max(3000).optional(),
  status: z.nativeEnum(DecisionStatus).optional(),
  relatedTaskIds: z.array(objectIdSchema).optional(),
  tags: z.array(z.string().trim().max(40)).max(20).optional(),
});

export const supersedeDecisionSchema = z.object({
  title: z.string().trim().min(1).max(200),
  decision: z.string().trim().min(1).max(5000),
  reason: z.string().trim().max(5000).optional(),
  alternatives: z.string().trim().max(5000).optional(),
  impact: z.string().trim().max(3000).optional(),
  tags: z.array(z.string().trim().max(40)).max(20).optional(),
});

export const listDecisionsQuerySchema = paginationQuerySchema.extend({
  projectId: objectIdSchema.optional(),
  status: z.nativeEnum(DecisionStatus).optional(),
  tag: z.string().trim().max(40).optional(),
  search: z.string().trim().max(200).optional(),
});
