import { Router } from 'express';
import * as commentController from '../controllers/taskComment.controller';
import { authenticate } from '../middlewares/authenticate';
import { resolveWorkspaceFromParam } from '../middlewares/resolveWorkspaceFromEntity';
import { validate } from '../middlewares/validate';
import { updateCommentSchema } from '../validators/taskComment.validator';
import { taskCommentRepository } from '../repositories/taskComment.repository';

const router = Router();

router.use(authenticate);
router.use(
  '/:commentId',
  resolveWorkspaceFromParam('commentId', (id) => taskCommentRepository.findById(id), 'Comment not found')
);

router.patch('/:commentId', validate({ body: updateCommentSchema }), commentController.updateComment);
router.delete('/:commentId', commentController.deleteComment);

export default router;
