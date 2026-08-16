import { Router } from 'express';
import * as documentController from '../controllers/document.controller';
import { requireWorkspaceMember } from '../middlewares/requireWorkspaceMember';
import { validate } from '../middlewares/validate';
import { createDocumentSchema, listDocumentsQuerySchema, createFolderSchema } from '../validators/document.validator';

const router = Router({ mergeParams: true });

router.use(requireWorkspaceMember);

router.get('/', validate({ query: listDocumentsQuerySchema }), documentController.listDocuments);
router.post('/', validate({ body: createDocumentSchema }), documentController.createDocument);

router.get('/folders', documentController.listFolders);
router.post('/folders', validate({ body: createFolderSchema }), documentController.createFolder);

export default router;
