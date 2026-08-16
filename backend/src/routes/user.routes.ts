import { Router } from 'express';
import * as authController from '../controllers/auth.controller';
import { authenticate } from '../middlewares/authenticate';
import { validate } from '../middlewares/validate';
import { updateProfileSchema } from '../validators/auth.validator';

const router = Router();

router.use(authenticate);

router.get('/me', authController.me);
router.patch('/me', validate({ body: updateProfileSchema }), authController.updateProfile);

export default router;
