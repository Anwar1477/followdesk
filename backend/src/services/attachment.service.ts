import { attachmentRepository } from '../repositories/attachment.repository';
import { taskRepository } from '../repositories/task.repository';
import { meetingRepository } from '../repositories/meeting.repository';
import { documentRepository } from '../repositories/document.repository';
import { storageDriver, FileToStore } from './storage.service';
import { ApiError } from '../utils/ApiError';
import { AttachmentEntityType } from '../constants/enums';

/**
 * Verifies the target entity (Task/Meeting/Document) exists within the
 * caller's workspace before allowing an attachment to be uploaded or
 * listed against it - prevents attaching files to resources in another
 * workspace even if the entity id is guessed correctly.
 */
async function assertEntityInWorkspace(entityType: AttachmentEntityType, entityId: string, workspaceId: string) {
  const finders: Record<AttachmentEntityType, () => Promise<unknown>> = {
    [AttachmentEntityType.TASK]: () => taskRepository.findByIdInWorkspace(entityId, workspaceId),
    [AttachmentEntityType.MEETING]: () => meetingRepository.findByIdInWorkspace(entityId, workspaceId),
    [AttachmentEntityType.DOCUMENT]: () => documentRepository.findByIdInWorkspace(entityId, workspaceId),
  };
  const entity = await finders[entityType]();
  if (!entity) throw ApiError.notFound(`${entityType.toLowerCase()} not found in this workspace`);
  return entity;
}

export async function uploadAttachment(
  workspaceId: string,
  uploadedBy: string,
  entityType: AttachmentEntityType,
  entityId: string,
  file: FileToStore
) {
  await assertEntityInWorkspace(entityType, entityId, workspaceId);

  const stored = await storageDriver.save(file, `${entityType.toLowerCase()}/${entityId}`);

  const attachment = await attachmentRepository.create({
    workspaceId,
    entityType,
    entityId,
    uploadedBy,
    fileName: file.originalName,
    mimeType: file.mimeType,
    sizeBytes: file.buffer.length,
    storageDriver: stored.storageDriver,
    url: stored.url,
    storageKey: stored.storageKey,
  });

  return attachment;
}

export async function listAttachments(entityType: AttachmentEntityType, entityId: string, workspaceId: string) {
  await assertEntityInWorkspace(entityType, entityId, workspaceId);
  return attachmentRepository.listByEntity(entityType, entityId);
}

export async function deleteAttachment(attachmentId: string, workspaceId: string, userId: string, isPrivileged: boolean) {
  const attachment = await attachmentRepository.findByIdInWorkspace(attachmentId, workspaceId);
  if (!attachment) throw ApiError.notFound('Attachment not found');
  if (attachment.uploadedBy.toString() !== userId && !isPrivileged) {
    throw ApiError.forbidden('You can only delete attachments you uploaded');
  }

  await storageDriver.remove(attachment.storageKey);
  await attachmentRepository.deleteById(attachment._id.toString());
}
