import { Router } from 'express';
import * as activityController from '../controllers/activity.controller';
import { requireWorkspaceMember } from '../middlewares/requireWorkspaceMember';

const router = Router({ mergeParams: true });

router.use(requireWorkspaceMember);

router.get('/', activityController.listActivities);

export default router;
