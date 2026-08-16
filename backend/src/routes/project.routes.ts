import { Router } from 'express';
import * as projectController from '../controllers/project.controller';
import { requireWorkspaceMember } from '../middlewares/requireWorkspaceMember';
import { authorize } from '../middlewares/authorize';
import { validate } from '../middlewares/validate';
import { createProjectSchema, listProjectsQuerySchema } from '../validators/project.validator';
import { Permission } from '../constants/permissions';

const router = Router({ mergeParams: true });

router.use(requireWorkspaceMember);

router.get('/', validate({ query: listProjectsQuerySchema }), projectController.listProjects);
router.post('/', authorize(Permission.PROJECT_CREATE), validate({ body: createProjectSchema }), projectController.createProject);

export default router;
