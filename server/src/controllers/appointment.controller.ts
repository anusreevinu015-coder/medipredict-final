import { z } from 'zod';
import type { Request, Response } from 'express';
import { asyncHandler } from '../middlewares/error.middleware.js';
import {
  createAppointment,
  doctorBelongsTo,
  findAppointmentById,
  hasDuplicateBooking,
  listAllAppointments,
  listAppointmentsByUser,
  updateAppointmentStatus,
} from '../models/appointment.model.js';
import type { AppointmentStatus } from '../types/auth.js';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^(?:[01]\d|2[0-3]):[0-5]\d$/;

function todayString(): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function isValidDateString(value: string): boolean {
  if (!DATE_PATTERN.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

const createAppointmentSchema = z.object({
  hospitalId: z.string().regex(UUID_PATTERN, 'Please select a valid hospital.'),
  departmentId: z.string().regex(UUID_PATTERN, 'Please select a valid department.'),
  doctorId: z.string().regex(UUID_PATTERN, 'Please select a valid doctor.'),
  appointmentDate: z
    .string()
    .regex(DATE_PATTERN, 'Please choose a valid date.')
    .refine(isValidDateString, 'Please choose a valid date.'),
  appointmentTime: z
    .string()
    .regex(TIME_PATTERN, 'Please choose a valid time (HH:MM).'),
  reason: z.string().trim().max(2000, 'Reason is too long.').optional(),
});

const updateStatusSchema = z.object({
  status: z.enum(['pending', 'approved', 'rejected', 'cancelled', 'completed']),
});

export const listMyAppointments = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const appointments = await listAppointmentsByUser(req.user!.id);
  res.status(200).json({ appointments });
});

export const bookAppointment = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const parsed = createAppointmentSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: parsed.error.issues[0].message });
    return;
  }

  const data = parsed.data;
  if (data.appointmentDate < todayString()) {
    res.status(400).json({ message: 'The appointment date cannot be in the past.' });
    return;
  }

  const belongs = await doctorBelongsTo(data.doctorId, data.hospitalId, data.departmentId);
  if (!belongs) {
    res.status(400).json({
      message: 'The selected doctor is not available in the chosen hospital and department.',
    });
    return;
  }

  const duplicate = await hasDuplicateBooking(
    req.user!.id,
    data.doctorId,
    data.appointmentDate,
    data.appointmentTime,
  );
  if (duplicate) {
    res.status(409).json({
      message: 'You already have a pending or approved appointment with this doctor at that time.',
    });
    return;
  }

  const appointment = await createAppointment({
    userId: req.user!.id,
    hospitalId: data.hospitalId,
    departmentId: data.departmentId,
    doctorId: data.doctorId,
    appointmentDate: data.appointmentDate,
    appointmentTime: data.appointmentTime,
    reason: data.reason?.trim() || null,
  });

  res.status(201).json({
    appointment,
    message: 'Appointment booked successfully. An administrator will review it shortly.',
  });
});

export const listAllAppointmentsAdmin = asyncHandler(
  async (_req: Request, res: Response): Promise<void> => {
    const appointments = await listAllAppointments();
    res.status(200).json({ appointments });
  },
);

export const setAppointmentStatus = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const parsed = updateStatusSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: 'Invalid appointment status.' });
    return;
  }

  const appointment = await findAppointmentById(req.params.id ?? '');
  if (!appointment) {
    res.status(404).json({ message: 'Appointment not found.' });
    return;
  }

  const status: AppointmentStatus = parsed.data.status;
  const updated = await updateAppointmentStatus(appointment.id, status);
  if (!updated) {
    res.status(404).json({ message: 'Appointment not found.' });
    return;
  }

  res.status(200).json({
    appointment: updated,
    message: `Appointment status updated to "${status}".`,
  });
});