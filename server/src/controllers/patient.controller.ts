import { z } from 'zod';
import type { Request, Response } from 'express';
import { asyncHandler } from '../middlewares/error.middleware.js';
import { getPatientProfile, updatePatientProfile } from '../models/patient.model.js';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

function nullableText(maxLength: number, regex?: RegExp, message?: string) {
  const stringInput =
    regex === undefined
      ? z.string().trim().max(maxLength)
      : z.string().trim().max(maxLength).regex(regex, message);
  return z.union([stringInput, z.literal('')]).transform((value) => (value === '' ? null : value.trim()));
}

const profileSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters.').max(100),
  email: z.string().trim().toLowerCase().regex(EMAIL_REGEX, 'Please enter a valid email address.'),
  phone: nullableText(30),
  dateOfBirth: nullableText(10, DATE_REGEX, 'Please enter a valid date of birth.'),
  gender: z
    .enum(['male', 'female', 'other'])
    .or(z.literal(''))
    .transform((value) => (value === '' ? null : value)),
  address: nullableText(300),
});

export const getProfile = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const profile = await getPatientProfile(req.user!.id);
  if (!profile) {
    res.status(404).json({ message: 'Profile not found.' });
    return;
  }
  res.status(200).json({ profile });
});

export const updateProfile = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const parsed = profileSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: parsed.error.issues[0].message });
    return;
  }

  const { name, email, phone, dateOfBirth, gender, address } = parsed.data;

  try {
    const profile = await updatePatientProfile({
      userId: req.user!.id,
      name,
      email,
      phone,
      dateOfBirth,
      gender,
      address,
    });
    res.status(200).json({ profile, message: 'Profile updated successfully.' });
  } catch (err) {
    if ((err as { code?: string }).code === '23505') {
      res.status(409).json({ message: 'That email is already in use by another account.' });
      return;
    }
    throw err;
  }
});