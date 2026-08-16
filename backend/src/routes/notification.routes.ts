import { Router } from 'express';
import * as notificationController from '../controllers/notification.controller';
import { authenticate } from '../middlewares/authenticate';
import { validate } from '../middlewares/validate';
import { listNotificationsQuerySchema } from '../validators/notification.validator';

const router = Router();

router.use(authenticate);

router.get('/', validate({ query: listNotificationsQuerySchema }), notificationController.listNotifications);
router.patch('/read-all', notificationController.markAllRead);
router.patch('/:id/read', notificationController.markRead);

export default router;
