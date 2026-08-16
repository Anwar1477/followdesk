import jwt, { SignOptions } from 'jsonwebtoken';
import { env } from '../config/env';
import { WorkspaceRole } from '../constants/enums';

export interface AccessTokenPayload {
  sub: string; // userId
  email: string;
  tokenType: 'access';
}

export interface RefreshTokenPayload {
  sub: string; // userId
  tokenVersion: number;
  tokenType: 'refresh';
}

export function signAccessToken(payload: Omit<AccessTokenPayload, 'tokenType'>): string {
  return jwt.sign({ ...payload, tokenType: 'access' }, env.jwtAccessSecret, {
    expiresIn: env.jwtAccessExpiresIn,
  } as SignOptions);
}

export function signRefreshToken(payload: Omit<RefreshTokenPayload, 'tokenType'>): string {
  return jwt.sign({ ...payload, tokenType: 'refresh' }, env.jwtRefreshSecret, {
    expiresIn: env.jwtRefreshExpiresIn,
  } as SignOptions);
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, env.jwtAccessSecret) as AccessTokenPayload;
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  return jwt.verify(token, env.jwtRefreshSecret) as RefreshTokenPayload;
}

/** Minimal shape attached to req.user by the `authenticate` middleware. */
export interface AuthenticatedUser {
  id: string;
  email: string;
}

export interface WorkspaceContext {
  workspaceId: string;
  role: WorkspaceRole;
}
