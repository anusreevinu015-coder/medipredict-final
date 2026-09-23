import type { NextFunction, Request, Response } from 'express';
import { findSessionUser, findUserById } from '../models/user.model.js';
import { hashToken, SESSION_COOKIE_NAME } from '../utils/session.js';
import { toSafeUser } from '../utils/users.js';
import type { Role } from '../types/auth.js';

async function resolveSessionUser(req: Request): Promise<void> {
  const token = (req.cookies as Record<string, string>)?.[SESSION_COOKIE_NAME];
  if (!token) return;

  const tokenHash = hashToken(token);
  const user = await findSessionUser(tokenHash);
  if (!user) return;

  req.user = toSafeUser(user);
}

export async function authenticateSession(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    await resolveSessionUser(req);
    next();
  } catch (err) {
    next(err);
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ message: 'Authentication required.' });
    return;
  }
  next();
}

export function requireRole(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ message: 'Authentication required.' });
      return;
    }
    if (!roles.includes(req.user.role)) {
      res.status(403).json({ message: 'You do not have permission to access this resource.' });
      return;
    }
    next();
  };
}

export async function currentUserController(req: Request, res: Response): Promise<void> {
  try {
    await resolveSessionUser(req);
    if (!req.user) {
      res.status(200).json({ user: null });
      return;
    }
    const fresh = await findUserById(req.user.id);
    if (!fresh) {
      res.status(200).json({ user: null });
      return;
    }
    req.user = toSafeUser(fresh);
    res.status(200).json({ user: req.user });
  } catch (err) {
    res.status(500).json({ message: 'Failed to load session.' });
  }
}