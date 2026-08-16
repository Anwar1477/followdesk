import { Router } from 'express';
import * as taskController from '../controllers/task.controller';
import * as attachmentController from '../controllers/attachment.controller';
import { authenticate } from '../middlewares/authenticate';
import { resolveWorkspaceFromParam } from '../middlewares/resolveWorkspaceFromEntity';
import { allowPermissionOrOwner } from '../middlewares/allowPermissionOrOwner';
import { validate } from '../middlewares/validate';
import { updateTaskSchema, addDependencySchema } from '../validators/task.validator';
import { Permission } from '../constants/permissions';
import { taskRepository } from '../repositories/task.repository';
import { ITask } from '../models/Task';
import { upload } from '../middlewares/upload';
import commentRoutes from './taskComment.routes';

const router = Router();

router.use(authenticate);
router.use('/:taskId', resolveWorkspaceFromParam('taskId', (id) => taskRepository.findById(id), 'Task not found'));

const isAssignee = (task: ITask, userId: string) => task.assigneeId?.toString() === userId;

router.get('/:taskId', taskController.getTask);
router.patch(
  '/:taskId',
  allowPermissionOrOwner<ITask>(Permission.TASK_MANAGE, isAssignee),
  validate({ body: updateTaskSchema }),
  taskController.updateTask
);
router.delete('/:taskId', allowPermissionOrOwner<ITask>(Permission.TASK_MANAGE, () => false), taskController.deleteTask);

router.post(
  '/:taskId/dependencies',
  allowPermissionOrOwner<ITask>(Permission.TASK_MANAGE, isAssignee),
  validate({ body: addDependencySchema }),
  taskController.addDependency
);
router.delete(
  '/:taskId/dependencies/:dependencyId',
  allowPermissionOrOwner<ITask>(Permission.TASK_MANAGE, isAssignee),
  taskController.removeDependency
);

router.get('/:taskId/attachments', attachmentController.listTaskAttachments);
router.post('/:taskId/attachments', upload.single('file'), attachmentController.uploadTaskAttachment);

router.use('/:taskId/comments', commentRoutes);

export default router;
