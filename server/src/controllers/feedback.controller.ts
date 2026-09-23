import { z } from 'zod';
import type { Request, Response } from 'express';
import { asyncHandler } from '../middlewares/error.middleware.js';
import {
  createFeedback,
  deleteFeedback,
  findFeedbackById,
  listAllFeedback,
  listFeedbackByUser,
} from '../models/feedback.model.js';
import { findAppointmentById } from '../models/appointment.model.js';
import { findHospitalById } from '../models/hospital.model.js';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const submitFeedbackSchema = z.object({
  rating: z.coerce.number().int().min(1, 'Please choose a rating.').max(5, 'Please choose a rating.'),
  comment: z
    .string()
    .trim()
    .min(1, 'Please write a short comment before submitting.')
    .max(2000, 'Feedback is too long.'),
  hospitalId: z.string().regex(UUID_PATTERN, 'Please select a valid hospital.').optional().nullable(),
  appointmentId: z
    .string()
    .regex(UUID_PATTERN, 'Please select a valid appointment.')
    .optional()
    .nullable(),
});

export const listMyFeedback = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const feedback = await listFeedbackByUser(req.user!.id);
  res.status(200).json({ feedback });
});

export const submitFeedback = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const parsed = submitFeedbackSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: parsed.error.issues[0].message });
    return;
  }

  const data = parsed.data;
  let hospitalId: string | null = data.hospitalId ?? null;
  let doctorId: string | null = null;

  if (data.appointmentId) {
    const appointment = await findAppointmentById(data.appointmentId);
    if (!appointment) {
      res.status(404).json({ message: 'Selected appointment not found.' });
      return;
    }
    if (appointment.userId !== req.user!.id) {
      res.status(403).json({ message: 'You can only leave feedback for your own appointments.' });
      return;
    }
    hospitalId = appointment.hospitalId;
    doctorId = appointment.doctorId;
  }

  if (!hospitalId) {
    res.status(400).json({
      message: 'Please select an appointment or a hospital to leave feedback for.',
    });
    return;
  }

  const hospital = await findHospitalById(hospitalId);
  if (!hospital) {
    res.status(400).json({ message: 'The selected hospital could not be found.' });
    return;
  }

  const feedback = await createFeedback({
    userId: req.user!.id,
    hospitalId,
    doctorId,
    appointmentId: data.appointmentId ?? null,
    rating: data.rating,
    comment: data.comment,
  });

  res.status(201).json({
    feedback,
    message: 'Thank you! Your feedback has been submitted.',
  });
});

export const listAllFeedbackAdmin = asyncHandler(
  async (_req: Request, res: Response): Promise<void> => {
    const feedback = await listAllFeedback();
    res.status(200).json({ feedback });
  },
);

export const removeFeedback = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const id = req.params.id ?? '';
  const existing = await findFeedbackById(id);
  if (!existing) {
    res.status(404).json({ message: 'Feedback not found.' });
    return;
  }

  const removed = await deleteFeedback(id);
  if (!removed) {
    res.status(404).json({ message: 'Feedback not found.' });
    return;
  }

  res.status(200).json({ message: 'Feedback removed.' });
});