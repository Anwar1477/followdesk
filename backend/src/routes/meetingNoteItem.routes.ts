import { Router } from 'express';
import * as noteController from '../controllers/meetingNote.controller';
import { authenticate } from '../middlewares/authenticate';
import { resolveWorkspaceFromParam } from '../middlewares/resolveWorkspaceFromEntity';
import { validate } from '../middlewares/validate';
import {
  updateMeetingNoteSchema,
  addActionItemSchema,
  updateActionItemSchema,
  convertActionItemSchema,
} from '../validators/meetingNote.validator';
import { meetingNoteRepository } from '../repositories/meetingNote.repository';

const router = Router();

router.use(authenticate);
router.use(
  '/:noteId',
  resolveWorkspaceFromParam('noteId', (id) => meetingNoteRepository.findById(id), 'Meeting note not found')
);

router.get('/:noteId', noteController.getMeetingNote);
router.patch('/:noteId', validate({ body: updateMeetingNoteSchema }), noteController.updateMeetingNote);
router.delete('/:noteId', noteController.deleteMeetingNote);

router.post('/:noteId/action-items', validate({ body: addActionItemSchema }), noteController.addActionItem);
router.patch('/:noteId/action-items/:itemId', validate({ body: updateActionItemSchema }), noteController.updateActionItem);
router.delete('/:noteId/action-items/:itemId', noteController.deleteActionItem);
router.post(
  '/:noteId/action-items/:itemId/convert',
  validate({ body: convertActionItemSchema }),
  noteController.convertActionItem
);

export default router;
