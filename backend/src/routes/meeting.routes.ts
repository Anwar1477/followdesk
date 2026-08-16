import { Router } from 'express';
import * as meetingController from '../controllers/meeting.controller';
import { requireWorkspaceMember } from '../middlewares/requireWorkspaceMember';
import { validate } from '../middlewares/validate';
import { createMeetingSchema, listMeetingsQuerySchema } from '../validators/meeting.validator';

const router = Router({ mergeParams: true });

router.use(requireWorkspaceMember);

router.get('/', validate({ query: listMeetingsQuerySchema }), meetingController.listMeetings);
router.post('/', validate({ body: createMeetingSchema }), meetingController.createMeeting);

export default router;
