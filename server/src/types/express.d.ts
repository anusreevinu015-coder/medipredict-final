import type { Request } from 'express';
import type { SafeUser } from './auth.js';

declare global {
  namespace Express {
    interface Request {
      user?: SafeUser;
    }
  }
}

export type { Request };