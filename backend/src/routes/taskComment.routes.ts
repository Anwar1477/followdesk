import { Router } from 'express';
import * as commentController from '../controllers/taskComment.controller';
import { validate } from '../middlewares/validate';
import { createCommentSchema, listCommentsQuerySchema } from '../validators/taskComment.validator';

const router = Router({ mergeParams: true });

router.get('/', validate({ query: listCommentsQuerySchema }), commentController.listComments);
router.post('/', validate({ body: createCommentSchema }), commentController.createComment);

export default router;
