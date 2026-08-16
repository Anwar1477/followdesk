import { Router } from 'express';
import * as memberController from '../controllers/member.controller';
import { requireWorkspaceMember } from '../middlewares/requireWorkspaceMember';
import { authorize } from '../middlewares/authorize';
import { validate } from '../middlewares/validate';
import { inviteMemberSchema, updateMemberRoleSchema } from '../validators/member.validator';
import { Permission } from '../constants/permissions';

const router = Router({ mergeParams: true });

router.use(requireWorkspaceMember);

router.get('/', memberController.listMembers);
router.post('/', authorize(Permission.MEMBER_MANAGE), validate({ body: inviteMemberSchema }), memberController.inviteMember);
router.patch(
  '/:userId',
  authorize(Permission.MEMBER_MANAGE),
  validate({ body: updateMemberRoleSchema }),
  memberController.updateMemberRole
);
router.delete('/:userId', authorize(Permission.MEMBER_MANAGE), memberController.removeMember);

export default router;
