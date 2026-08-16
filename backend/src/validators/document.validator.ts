import { z } from 'zod';
import { DocumentVisibility } from '../constants/enums';
import { objectIdSchema, paginationQuerySchema } from './common.validator';

export const createDocumentSchema = z.object({
  projectId: objectIdSchema.optional(),
  folderId: objectIdSchema.optional(),
  title: z.string().trim().min(1).max(200),
  content: z.string().max(100000).default(''),
  visibility: z.nativeEnum(DocumentVisibility).optional(),
  tags: z.array(z.string().trim().max(40)).max(20).optional(),
});

export const updateDocumentSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  content: z.string().max(100000).optional(),
  folderId: objectIdSchema.nullable().optional(),
  visibility: z.nativeEnum(DocumentVisibility).optional(),
  tags: z.array(z.string().trim().max(40)).max(20).optional(),
});

export const listDocumentsQuerySchema = paginationQuerySchema.extend({
  projectId: objectIdSchema.optional(),
  folderId: objectIdSchema.optional(),
  visibility: z.nativeEnum(DocumentVisibility).optional(),
  tag: z.string().trim().max(40).optional(),
  search: z.string().trim().max(200).optional(),
});

export const createFolderSchema = z.object({
  name: z.string().trim().min(1).max(120),
  projectId: objectIdSchema.optional(),
  parentId: objectIdSchema.optional(),
});
