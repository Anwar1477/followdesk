import { Router } from 'express';
import * as authController from '../controllers/auth.controller';
import { authenticate } from '../middlewares/authenticate';
import { validate } from '../middlewares/validate';
import { authRateLimiter } from '../middlewares/rateLimiter';
import {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  updateProfileSchema,
  changePasswordSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from '../validators/auth.validator';

const router = Router();

router.post('/register', authRateLimiter, validate({ body: registerSchema }), authController.register);
router.post('/login', authRateLimiter, validate({ body: loginSchema }), authController.login);
router.post('/refresh', authRateLimiter, validate({ body: refreshTokenSchema }), authController.refresh);
router.post('/logout', authenticate, authController.logout);
router.get('/me', authenticate, authController.me);
router.patch('/me', authenticate, validate({ body: updateProfileSchema }), authController.updateProfile);
router.post('/change-password', authenticate, validate({ body: changePasswordSchema }), authController.changePassword);
router.post('/forgot-password', authRateLimiter, validate({ body: forgotPasswordSchema }), authController.forgotPassword);
router.post('/reset-password', authRateLimiter, validate({ body: resetPasswordSchema }), authController.resetPassword);

export default router;
