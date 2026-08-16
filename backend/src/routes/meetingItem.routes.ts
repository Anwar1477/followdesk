import { Router } from 'express';
import * as meetingController from '../controllers/meeting.controller';
import * as noteController from '../controllers/meetingNote.controller';
import * as attachmentController from '../controllers/attachment.controller';
import { authenticate } from '../middlewares/authenticate';
import { resolveWorkspaceFromParam } from '../middlewares/resolveWorkspaceFromEntity';
import { allowPermissionOrOwner } from '../middlewares/allowPermissionOrOwner';
import { validate } from '../middlewares/validate';
import { updateMeetingSchema, addParticipantsSchema } from '../validators/meeting.validator';
import { createMeetingNoteSchema } from '../validators/meetingNote.validator';
import { Permission } from '../constants/permissions';
import { meetingRepository } from '../repositories/meeting.repository';
import { IMeeting } from '../models/Meeting';
import { upload } from '../middlewares/upload';

const router = Router();

router.use(authenticate);
router.use('/:meetingId', resolveWorkspaceFromParam('meetingId', (id) => meetingRepository.findById(id), 'Meeting not found'));

const isOrganizer = (meeting: IMeeting, userId: string) => meeting.organizerId.toString() === userId;

router.get('/:meetingId', meetingController.getMeeting);
router.patch(
  '/:meetingId',
  allowPermissionOrOwner<IMeeting>(Permission.MEETING_MANAGE, isOrganizer),
  validate({ body: updateMeetingSchema }),
  meetingController.updateMeeting
);
router.post(
  '/:meetingId/cancel',
  allowPermissionOrOwner<IMeeting>(Permission.MEETING_MANAGE, isOrganizer),
  meetingController.cancelMeeting
);
router.delete(
  '/:meetingId',
  allowPermissionOrOwner<IMeeting>(Permission.MEETING_MANAGE, isOrganizer),
  meetingController.deleteMeeting
);
router.post(
  '/:meetingId/participants',
  allowPermissionOrOwner<IMeeting>(Permission.MEETING_MANAGE, isOrganizer),
  validate({ body: addParticipantsSchema }),
  meetingController.addParticipants
);

router.get('/:meetingId/notes', noteController.listMeetingNotes);
router.post('/:meetingId/notes', validate({ body: createMeetingNoteSchema }), noteController.createMeetingNote);

router.get('/:meetingId/attachments', attachmentController.listMeetingAttachments);
router.post('/:meetingId/attachments', upload.single('file'), attachmentController.uploadMeetingAttachment);

export default router;
