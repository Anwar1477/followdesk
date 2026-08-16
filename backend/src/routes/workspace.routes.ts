import { Router } from 'express';
import * as workspaceController from '../controllers/workspace.controller';
import { authenticate } from '../middlewares/authenticate';
import { requireWorkspaceMember } from '../middlewares/requireWorkspaceMember';
import { requireRole } from '../middlewares/requireRole';
import { authorize } from '../middlewares/authorize';
import { validate } from '../middlewares/validate';
import { createWorkspaceSchema, updateWorkspaceSchema } from '../validators/workspace.validator';
import { WorkspaceRole } from '../constants/enums';
import { Permission } from '../constants/permissions';
import memberRoutes from './member.routes';
import projectRoutes from './project.routes';
import taskRoutes from './task.routes';
import meetingRoutes from './meeting.routes';
import decisionRoutes from './decision.routes';
import documentRoutes from './document.routes';
import analyticsRoutes from './analytics.routes';
import activityRoutes from './activity.routes';

const router = Router();

router.use(authenticate);

router.post('/', validate({ body: createWorkspaceSchema }), workspaceController.createWorkspace);
router.get('/', workspaceController.listMyWorkspaces);

router.get('/:workspaceId', requireWorkspaceMember, workspaceController.getWorkspace);
router.patch(
  '/:workspaceId',
  requireWorkspaceMember,
  authorize(Permission.WORKSPACE_MANAGE_SETTINGS),
  validate({ body: updateWorkspaceSchema }),
  workspaceController.updateWorkspace
);
router.delete('/:workspaceId', requireWorkspaceMember, requireRole(WorkspaceRole.ADMIN), workspaceController.deleteWorkspace);

router.use('/:workspaceId/members', memberRoutes);
router.use('/:workspaceId/projects', projectRoutes);
router.use('/:workspaceId/tasks', taskRoutes);
router.use('/:workspaceId/meetings', meetingRoutes);
router.use('/:workspaceId/decisions', decisionRoutes);
router.use('/:workspaceId/documents', documentRoutes);
router.use('/:workspaceId/analytics', analyticsRoutes);
router.use('/:workspaceId/activities', activityRoutes);

export default router;
