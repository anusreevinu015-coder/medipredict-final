import { z } from 'zod';
import type { Request, Response } from 'express';
import { asyncHandler } from '../middlewares/error.middleware.js';
import { findMedicalHistory, upsertMedicalHistory } from '../models/medical-history.model.js';

function nullableText(maxLength: number) {
  return z
    .union([z.string().trim().max(maxLength), z.literal('')])
    .transform((value) => (value === '' ? null : value.trim()));
}

const medicalHistorySchema = z.object({
  conditions: nullableText(2000),
  allergies: nullableText(2000),
  medications: nullableText(2000),
  surgeries: nullableText(2000),
  familyHistory: nullableText(2000),
  notes: nullableText(4000),
});

export const getMedicalHistory = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const history = await findMedicalHistory(req.user!.id);
  res.status(200).json({ history });
});

export const updateMedicalHistory = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const parsed = medicalHistorySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ message: parsed.error.issues[0].message });
      return;
    }

    const { conditions, allergies, medications, surgeries, familyHistory, notes } = parsed.data;

    const history = await upsertMedicalHistory({
      userId: req.user!.id,
      conditions,
      allergies,
      medications,
      surgeries,
      familyHistory,
      notes,
    });
    res.status(200).json({ history, message: 'Medical history saved successfully.' });
  },
);