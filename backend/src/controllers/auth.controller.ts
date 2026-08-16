import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/ApiResponse';
import { ApiError } from '../utils/ApiError';
import { env } from '../config/env';
import * as authService from '../services/auth.service';

const REFRESH_COOKIE_NAME = 'refreshToken';

const refreshCookieOptions = {
  httpOnly: true,
  secure: env.isProduction,
  sameSite: 'lax' as const,
  path: '/api/auth',
  maxAge: 30 * 24 * 60 * 60 * 1000,
};

function setRefreshCookie(res: Response, token: string) {
  res.cookie(REFRESH_COOKIE_NAME, token, refreshCookieOptions);
}

export const register = asyncHandler(async (req: Request, res: Response) => {
  const result = await authService.register(req.body);
  setRefreshCookie(res, result.refreshToken);
  sendSuccess(res, { user: result.user, accessToken: result.accessToken }, 201);
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const result = await authService.login(req.body);
  setRefreshCookie(res, result.refreshToken);
  sendSuccess(res, { user: result.user, accessToken: result.accessToken });
});

export const refresh = asyncHandler(async (req: Request, res: Response) => {
  const token = req.cookies?.[REFRESH_COOKIE_NAME] ?? req.body?.refreshToken;
  if (!token) throw ApiError.unauthorized('No refresh token provided');

  const tokens = await authService.refreshTokens(token);
  setRefreshCookie(res, tokens.refreshToken);
  sendSuccess(res, { accessToken: tokens.accessToken });
});

export const logout = asyncHandler(async (req: Request, res: Response) => {
  if (req.user) await authService.logout(req.user.id);
  res.clearCookie(REFRESH_COOKIE_NAME, { path: '/api/auth' });
  sendSuccess(res, { message: 'Logged out successfully' });
});

export const me = asyncHandler(async (req: Request, res: Response) => {
  const user = await authService.getCurrentUser(req.user!.id);
  sendSuccess(res, user);
});

export const updateProfile = asyncHandler(async (req: Request, res: Response) => {
  const user = await authService.updateProfile(req.user!.id, req.body);
  sendSuccess(res, user);
});

export const changePassword = asyncHandler(async (req: Request, res: Response) => {
  await authService.changePassword(req.user!.id, req.body.currentPassword, req.body.newPassword);
  sendSuccess(res, { message: 'Password changed successfully' });
});

export const forgotPassword = asyncHandler(async (req: Request, res: Response) => {
  const result = await authService.forgotPassword(req.body.email);
  sendSuccess(res, {
    message: 'If an account with that email exists, a password reset link has been sent.',
    ...(result.resetToken ? { resetToken: result.resetToken } : {}),
  });
});

export const resetPassword = asyncHandler(async (req: Request, res: Response) => {
  await authService.resetPassword(req.body.token, req.body.newPassword);
  sendSuccess(res, { message: 'Password reset successfully' });
});
