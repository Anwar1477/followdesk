import { Router } from 'express';
import * as taskController from '../controllers/task.controller';
import { requireWorkspaceMember } from '../middlewares/requireWorkspaceMember';
import { validate } from '../middlewares/validate';
import { createTaskSchema, listTasksQuerySchema } from '../validators/task.validator';

const router = Router({ mergeParams: true });

router.use(requireWorkspaceMember);

router.get('/', validate({ query: listTasksQuerySchema }), taskController.listTasks);
router.post('/', validate({ body: createTaskSchema }), taskController.createTask);

export default router;
