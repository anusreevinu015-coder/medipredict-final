import { z } from 'zod';
import type { Request, Response } from 'express';
import { asyncHandler } from '../middlewares/error.middleware.js';
import {
  findRecommendedHospitals,
  listHospitalCatalog,
  listHospitalLocations,
} from '../models/hospital.model.js';

const recommendationsSchema = z.object({
  specialty: z.string().trim().min(1, 'A specialty is required.').max(100, 'Specialty is too long.'),
  location: z.string().trim().min(1).max(100).optional(),
  city: z.string().trim().min(1).max(100).optional(),
});

export const getRecommendations = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const parsed = recommendationsSchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ message: parsed.error.issues[0].message });
    return;
  }

  const location = parsed.data.location ?? parsed.data.city;
  const hospitals = await findRecommendedHospitals(parsed.data.specialty, location);
  const locations = await listHospitalLocations();

  res.status(200).json({ hospitals, cities: locations });
});

const catalogSchema = z.object({
  location: z.string().trim().min(1).max(100).optional(),
  city: z.string().trim().min(1).max(100).optional(),
});

export const getHospitalCatalog = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const parsed = catalogSchema.safeParse(req.query);
  const location = parsed.success ? (parsed.data.location ?? parsed.data.city) : undefined;
  const hospitals = await listHospitalCatalog(location);
  const locations = await listHospitalLocations();
  res.status(200).json({ hospitals, cities: locations });
});