import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/ApiResponse';
import { ApiError } from '../utils/ApiError';
import { AttachmentEntityType } from '../constants/enums';
import { roleHasPermission, Permission } from '../constants/permissions';
import * as attachmentService from '../services/attachment.service';

function makeUploadHandler(entityType: AttachmentEntityType, paramName: string) {
  return asyncHandler(async (req: Request, res: Response) => {
    if (!req.file) throw ApiError.validation('No file uploaded');
    const attachment = await attachmentService.uploadAttachment(
      req.workspaceMembership!.workspaceId,
      req.user!.id,
      entityType,
      req.params[paramName],
      { buffer: req.file.buffer, originalName: req.file.originalname, mimeType: req.file.mimetype }
    );
    sendSuccess(res, attachment, 201);
  });
}

function makeListHandler(entityType: AttachmentEntityType, paramName: string) {
  return asyncHandler(async (req: Request, res: Response) => {
    const attachments = await attachmentService.listAttachments(entityType, req.params[paramName], req.workspaceMembership!.workspaceId);
    sendSuccess(res, attachments);
  });
}

export const uploadTaskAttachment = makeUploadHandler(AttachmentEntityType.TASK, 'taskId');
export const listTaskAttachments = makeListHandler(AttachmentEntityType.TASK, 'taskId');

export const uploadMeetingAttachment = makeUploadHandler(AttachmentEntityType.MEETING, 'meetingId');
export const listMeetingAttachments = makeListHandler(AttachmentEntityType.MEETING, 'meetingId');

export const uploadDocumentAttachment = makeUploadHandler(AttachmentEntityType.DOCUMENT, 'documentId');
export const listDocumentAttachments = makeListHandler(AttachmentEntityType.DOCUMENT, 'documentId');

export const deleteAttachment = asyncHandler(async (req: Request, res: Response) => {
  const isPrivileged = roleHasPermission(req.workspaceMembership!.role, Permission.TASK_MANAGE);
  await attachmentService.deleteAttachment(req.params.attachmentId, req.workspaceMembership!.workspaceId, req.user!.id, isPrivileged);
  sendSuccess(res, { message: 'Attachment deleted successfully' });
});
