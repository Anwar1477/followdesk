import { Router } from 'express';
import * as attachmentController from '../controllers/attachment.controller';
import { authenticate } from '../middlewares/authenticate';
import { resolveWorkspaceFromParam } from '../middlewares/resolveWorkspaceFromEntity';
import { attachmentRepository } from '../repositories/attachment.repository';

const router = Router();

router.use(authenticate);
router.use(
  '/:attachmentId',
  resolveWorkspaceFromParam('attachmentId', (id) => attachmentRepository.findById(id), 'Attachment not found')
);

router.delete('/:attachmentId', attachmentController.deleteAttachment);

export default router;
