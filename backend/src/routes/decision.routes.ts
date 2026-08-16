import { Router } from 'express';
import * as decisionController from '../controllers/decision.controller';
import { requireWorkspaceMember } from '../middlewares/requireWorkspaceMember';
import { authorize } from '../middlewares/authorize';
import { validate } from '../middlewares/validate';
import { createDecisionSchema, listDecisionsQuerySchema } from '../validators/decision.validator';
import { Permission } from '../constants/permissions';

const router = Router({ mergeParams: true });

router.use(requireWorkspaceMember);

router.get('/', validate({ query: listDecisionsQuerySchema }), decisionController.listDecisions);
router.post('/', authorize(Permission.DECISION_CREATE), validate({ body: createDecisionSchema }), decisionController.createDecision);

export default router;
