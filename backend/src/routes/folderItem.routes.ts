import { Router } from 'express';
import * as documentController from '../controllers/document.controller';
import { authenticate } from '../middlewares/authenticate';
import { resolveWorkspaceFromParam } from '../middlewares/resolveWorkspaceFromEntity';
import { authorize } from '../middlewares/authorize';
import { Permission } from '../constants/permissions';
import { documentFolderRepository } from '../repositories/document.repository';

const router = Router();

router.use(authenticate);
router.use(
  '/:folderId',
  resolveWorkspaceFromParam('folderId', (id) => documentFolderRepository.findById(id), 'Folder not found')
);

router.delete('/:folderId', authorize(Permission.DOCUMENT_MANAGE), documentController.deleteFolder);

export default router;
