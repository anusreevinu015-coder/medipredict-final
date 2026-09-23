import type { Request, Response } from 'express';
import { asyncHandler } from '../middlewares/error.middleware.js';
import { getDashboardData } from '../models/admin.model.js';

export const getDashboard = asyncHandler(async (_req: Request, res: Response): Promise<void> => {
  const dashboard = await getDashboardData();
  res.status(200).json(dashboard);
});