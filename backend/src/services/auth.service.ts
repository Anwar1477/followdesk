import { userRepository } from '../repositories/user.repository';
import { comparePassword, generateToken, hashPassword, hashToken } from '../utils/password';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/jwt';
import { ApiError } from '../utils/ApiError';
import { env } from '../config/env';
import { toPublicUser } from '../utils/sanitize';
import { logger } from '../config/logger';

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

function issueTokenPair(userId: string, email: string, tokenVersion: number): TokenPair {
  return {
    accessToken: signAccessToken({ sub: userId, email }),
    refreshToken: signRefreshToken({ sub: userId, tokenVersion }),
  };
}

export async function register(input: RegisterInput) {
  const existing = await userRepository.findByEmail(input.email);
  if (existing) throw ApiError.conflict('An account with this email already exists');

  const passwordHash = await hashPassword(input.password);
  const user = await userRepository.create({ name: input.name, email: input.email.toLowerCase(), passwordHash });

  const tokens = issueTokenPair(user._id.toString(), user.email, user.tokenVersion);
  return { user: toPublicUser(user), ...tokens };
}

export async function login(input: LoginInput) {
  const user = await userRepository.findByEmail(input.email, true);
  if (!user) throw ApiError.unauthorized('Invalid email or password');

  const valid = await comparePassword(input.password, user.passwordHash);
  if (!valid) throw ApiError.unauthorized('Invalid email or password');

  user.lastLoginAt = new Date();
  await user.save();

  const tokens = issueTokenPair(user._id.toString(), user.email, user.tokenVersion);
  return { user: toPublicUser(user), ...tokens };
}

export async function refreshTokens(refreshToken: string) {
  let payload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    throw ApiError.unauthorized('Invalid or expired refresh token');
  }
  if (payload.tokenType !== 'refresh') throw ApiError.unauthorized('Invalid token type');

  const user = await userRepository.findById(payload.sub);
  if (!user) throw ApiError.unauthorized('User no longer exists');
  if (user.tokenVersion !== payload.tokenVersion) {
    throw ApiError.unauthorized('Refresh token has been revoked, please log in again');
  }

  return issueTokenPair(user._id.toString(), user.email, user.tokenVersion);
}

/** Invalidates every outstanding refresh token for this user (all devices/sessions). */
export async function logout(userId: string) {
  await userRepository.updateById(userId, { $inc: { tokenVersion: 1 } });
}

export async function getCurrentUser(userId: string) {
  const user = await userRepository.findById(userId);
  if (!user) throw ApiError.notFound('User not found');
  return toPublicUser(user);
}

export async function updateProfile(userId: string, data: { name?: string; avatarUrl?: string }) {
  const user = await userRepository.updateById(userId, data);
  if (!user) throw ApiError.notFound('User not found');
  return toPublicUser(user);
}

export async function changePassword(userId: string, currentPassword: string, newPassword: string) {
  const user = await userRepository.findByIdWithPassword(userId);
  if (!user) throw ApiError.notFound('User not found');

  const valid = await comparePassword(currentPassword, user.passwordHash);
  if (!valid) throw ApiError.unauthorized('Current password is incorrect');

  user.passwordHash = await hashPassword(newPassword);
  user.tokenVersion += 1; // invalidate other sessions
  await user.save();
}

/**
 * Always resolves successfully regardless of whether the email exists, to
 * avoid leaking account existence. The raw token is only ever returned to
 * the caller here (never persisted) so it can be emailed to the user; in
 * this codebase, without an email provider wired up, the caller (controller)
 * currently returns it directly in development for testability - see
 * docs/AUTHENTICATION.md.
 */
export async function forgotPassword(email: string): Promise<{ resetToken?: string }> {
  const user = await userRepository.findByEmail(email);
  if (!user) return {};

  const { token, hash } = generateToken();
  user.passwordResetTokenHash = hash;
  user.passwordResetExpiresAt = new Date(Date.now() + env.passwordResetTokenTtlMinutes * 60 * 1000);
  await user.save();

  logger.info({ userId: user._id.toString() }, 'Password reset token issued');
  return { resetToken: env.isProduction ? undefined : token };
}

export async function resetPassword(token: string, newPassword: string) {
  const hash = hashToken(token);
  const user = await userRepository.findByResetTokenHash(hash);
  if (!user) throw ApiError.validation('Invalid or expired reset token');

  user.passwordHash = await hashPassword(newPassword);
  user.passwordResetTokenHash = undefined;
  user.passwordResetExpiresAt = undefined;
  user.tokenVersion += 1;
  await user.save();
}
