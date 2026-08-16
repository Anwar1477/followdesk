import { Router } from 'express';
import * as projectController from '../controllers/project.controller';
import * as analyticsController from '../controllers/analytics.controller';
import { authenticate } from '../middlewares/authenticate';
import { resolveWorkspaceFromParam } from '../middlewares/resolveWorkspaceFromEntity';
import { authorize } from '../middlewares/authorize';
import { validate } from '../middlewares/validate';
import { updateProjectSchema } from '../validators/project.validator';
import { Permission } from '../constants/permissions';
import { projectRepository } from '../repositories/project.repository';

const router = Router();

router.use(authenticate);
router.use('/:projectId', resolveWorkspaceFromParam('projectId', (id) => projectRepository.findById(id), 'Project not found'));

router.get('/:projectId', projectController.getProject);
router.patch('/:projectId', authorize(Permission.PROJECT_MANAGE), validate({ body: updateProjectSchema }), projectController.updateProject);
router.delete('/:projectId', authorize(Permission.PROJECT_DELETE), projectController.deleteProject);

router.get('/:projectId/analytics', analyticsController.getProjectAnalytics);
router.get('/:projectId/health', analyticsController.getProjectHealth);

export default router;
