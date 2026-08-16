import multer from 'multer';
import { Request } from 'express';
import { env } from '../config/env';
import { ApiError } from '../utils/ApiError';

const ALLOWED_MIME_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  'application/pdf',
  'text/plain',
  'text/csv',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/zip',
  'application/json',
]);

function fileFilter(_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback): void {
  if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
    cb(ApiError.validation(`File type not allowed: ${file.mimetype}`));
    return;
  }
  cb(null, true);
}

/** Buffers the file in memory so the storage abstraction (local disk or Cloudinary) can persist it. */
export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: env.maxUploadSizeMb * 1024 * 1024 },
  fileFilter,
});
