import { z } from 'zod';
import type { Request, Response } from 'express';
import { createSession, createUser, deleteSession, findUserByEmail } from '../models/user.model.js';
import { hashPassword, toSafeUser, verifyPassword } from '../utils/users.js';
import {
  generateSessionToken,
  hashToken,
  getSessionCookieOptions,
  SESSION_COOKIE_NAME,
} from '../utils/session.js';
import { asyncHandler } from '../middlewares/error.middleware.js';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const signupSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters.').max(100),
  email: z.string().trim().toLowerCase().regex(EMAIL_REGEX, 'Please enter a valid email address.'),
  password: z.string().min(8, 'Password must be at least 8 characters.').max(128),
});

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().regex(EMAIL_REGEX, 'Please enter a valid email address.'),
  password: z.string().min(1, 'Password is required.'),
});

const SESSION_COOKIE = getSessionCookieOptions();

export const signup = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const parsed = signupSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: parsed.error.issues[0].message });
    return;
  }

  const { name, email, password } = parsed.data;

  const existing = await findUserByEmail(email);
  if (existing) {
    res.status(409).json({ message: 'An account with that email already exists.' });
    return;
  }

  const passwordHash = await hashPassword(password);
  const user = await createUser({ name, email, passwordHash, role: 'patient' });

  const session = generateSessionToken();
  await createSession({ userId: user.id, tokenHash: session.hash, expiresAt: session.expiresAt });

  res.cookie(SESSION_COOKIE_NAME, session.token, SESSION_COOKIE);
  res.status(201).json({ user: toSafeUser(user) });
});

export const login = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: parsed.error.issues[0].message });
    return;
  }

  const { email, password } = parsed.data;

  const user = await findUserByEmail(email);
  if (!user || !(await verifyPassword(password, user.password_hash))) {
    res.status(401).json({ message: 'Invalid email or password.' });
    return;
  }

  const session = generateSessionToken();
  await createSession({ userId: user.id, tokenHash: session.hash, expiresAt: session.expiresAt });

  res.cookie(SESSION_COOKIE_NAME, session.token, SESSION_COOKIE);
  res.status(200).json({ user: toSafeUser(user) });
});

export const logout = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const token = (req.cookies as Record<string, string>)?.[SESSION_COOKIE_NAME];
  if (token) {
    await deleteSession(hashToken(token)).catch(() => undefined);
  }
  res.clearCookie(SESSION_COOKIE_NAME, { ...SESSION_COOKIE, maxAge: undefined });
  res.status(200).json({ message: 'Logged out.' });
});