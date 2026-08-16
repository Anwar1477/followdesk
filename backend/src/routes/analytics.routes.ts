import { Router } from 'express';
import * as analyticsController from '../controllers/analytics.controller';
import { requireWorkspaceMember } from '../middlewares/requireWorkspaceMember';

const router = Router({ mergeParams: true });

router.use(requireWorkspaceMember);

// Every member can view workspace analytics; the controller trims the
// payload for MEMBER role per the permission matrix ("View Analytics:
// Admin/Manager full, Member limited") - see docs/AUTHENTICATION.md.
router.get('/', analyticsController.getWorkspaceAnalytics);

export default router;
