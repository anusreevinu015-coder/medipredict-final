import crypto from 'node:crypto';
import { env } from '../config/env.js';

export const SESSION_COOKIE_NAME = 'medipredict_session';
const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export function generateSessionToken(): { token: string; hash: string; expiresAt: Date } {
  const token = crypto.randomBytes(32).toString('hex');
  return {
    token,
    hash: hashToken(token),
    expiresAt: new Date(Date.now() + SESSION_DURATION_MS),
  };
}

export function hashToken(token: string): string {
  return crypto.createHmac('sha256', env.sessionSecret).update(token).digest('hex');
}

export function getSessionCookieOptions(): {
  httpOnly: boolean;
  secure: boolean;
  sameSite: 'lax' | 'strict' | 'none';
  path: string;
  maxAge: number;
} {
  return {
    httpOnly: true,
    secure: env.isProduction,
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_DURATION_MS,
  };
}