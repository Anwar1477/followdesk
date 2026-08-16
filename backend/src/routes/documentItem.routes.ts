import { Router } from 'express';
import * as documentController from '../controllers/document.controller';
import * as attachmentController from '../controllers/attachment.controller';
import { authenticate } from '../middlewares/authenticate';
import { resolveWorkspaceFromParam } from '../middlewares/resolveWorkspaceFromEntity';
import { allowPermissionOrOwner } from '../middlewares/allowPermissionOrOwner';
import { validate } from '../middlewares/validate';
import { updateDocumentSchema } from '../validators/document.validator';
import { Permission } from '../constants/permissions';
import { documentRepository } from '../repositories/document.repository';
import { IDocument } from '../models/Document';
import { upload } from '../middlewares/upload';

const router = Router();

router.use(authenticate);
router.use(
  '/:documentId',
  resolveWorkspaceFromParam('documentId', (id) => documentRepository.findById(id), 'Document not found')
);

const isAuthor = (document: IDocument, userId: string) => document.authorId.toString() === userId;

router.get('/:documentId', documentController.getDocument);
router.patch(
  '/:documentId',
  allowPermissionOrOwner<IDocument>(Permission.DOCUMENT_MANAGE, isAuthor),
  validate({ body: updateDocumentSchema }),
  documentController.updateDocument
);
router.delete('/:documentId', allowPermissionOrOwner<IDocument>(Permission.DOCUMENT_MANAGE, () => false), documentController.deleteDocument);

router.get('/:documentId/attachments', attachmentController.listDocumentAttachments);
router.post('/:documentId/attachments', upload.single('file'), attachmentController.uploadDocumentAttachment);

export default router;
