import { env } from '../config/env.js';
import type { NextFunction, Request, Response } from 'express';

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  console.error('[error]', err);
  if (env.isProduction) {
    res.status(500).json({ message: 'Internal server error.' });
    return;
  }
  const message = err instanceof Error ? err.message : 'Internal server error.';
  res.status(500).json({ message });
}

export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>,
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    fn(req, res, next).catch(next);
  };
}