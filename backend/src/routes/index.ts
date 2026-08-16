import { Router } from 'express';
import healthRoutes from './health.routes';
import authRoutes from './auth.routes';
import userRoutes from './user.routes';
import workspaceRoutes from './workspace.routes';
import projectItemRoutes from './projectItem.routes';
import taskItemRoutes from './taskItem.routes';
import commentRoutes from './comment.routes';
import meetingItemRoutes from './meetingItem.routes';
import meetingNoteItemRoutes from './meetingNoteItem.routes';
import decisionItemRoutes from './decisionItem.routes';
import documentItemRoutes from './documentItem.routes';
import folderItemRoutes from './folderItem.routes';
import searchRoutes from './search.routes';
import notificationRoutes from './notification.routes';
import attachmentRoutes from './attachment.routes';

const router = Router();

router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/workspaces', workspaceRoutes);
router.use('/projects', projectItemRoutes);
router.use('/tasks', taskItemRoutes);
router.use('/comments', commentRoutes);
router.use('/meetings', meetingItemRoutes);
router.use('/meeting-notes', meetingNoteItemRoutes);
router.use('/decisions', decisionItemRoutes);
router.use('/documents', documentItemRoutes);
router.use('/document-folders', folderItemRoutes);
router.use('/search', searchRoutes);
router.use('/notifications', notificationRoutes);
router.use('/attachments', attachmentRoutes);

export default router;
