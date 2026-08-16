import { Router } from 'express';
import * as decisionController from '../controllers/decision.controller';
import { authenticate } from '../middlewares/authenticate';
import { resolveWorkspaceFromParam } from '../middlewares/resolveWorkspaceFromEntity';
import { authorize } from '../middlewares/authorize';
import { validate } from '../middlewares/validate';
import { updateDecisionSchema, supersedeDecisionSchema } from '../validators/decision.validator';
import { Permission } from '../constants/permissions';
import { decisionRepository } from '../repositories/decision.repository';

const router = Router();

router.use(authenticate);
router.use(
  '/:decisionId',
  resolveWorkspaceFromParam('decisionId', (id) => decisionRepository.findById(id), 'Decision not found')
);

router.get('/:decisionId', decisionController.getDecision);
router.patch(
  '/:decisionId',
  authorize(Permission.DECISION_MANAGE),
  validate({ body: updateDecisionSchema }),
  decisionController.updateDecision
);
router.post('/:decisionId/archive', authorize(Permission.DECISION_MANAGE), decisionController.archiveDecision);
router.post(
  '/:decisionId/supersede',
  authorize(Permission.DECISION_MANAGE),
  validate({ body: supersedeDecisionSchema }),
  decisionController.supersedeDecision
);

export default router;
