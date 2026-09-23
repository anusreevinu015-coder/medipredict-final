import type { Request, Response } from 'express';
import { asyncHandler } from '../middlewares/error.middleware.js';
import { listAllPatientsForAdmin } from '../models/admin-patient.model.js';
import { getPatientProfile } from '../models/patient.model.js';
import { findMedicalHistory } from '../models/medical-history.model.js';
import { listAppointmentsByUser } from '../models/appointment.model.js';
import { listFeedbackByUser } from '../models/feedback.model.js';
import { listReportsByUser } from '../models/report.model.js';

export const listPatients = asyncHandler(async (_req: Request, res: Response): Promise<void> => {
  const patients = await listAllPatientsForAdmin();
  res.status(200).json({ patients });
});

export const getPatientDetail = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const userId = req.params.id ?? '';

  const profile = await getPatientProfile(userId);
  if (!profile) {
    res.status(404).json({ message: 'Patient not found.' });
    return;
  }

  const [medicalHistory, appointments, feedback, reports] = await Promise.all([
    findMedicalHistory(userId),
    listAppointmentsByUser(userId),
    listFeedbackByUser(userId),
    listReportsByUser(userId),
  ]);

  res.status(200).json({
    patient: {
      profile,
      medicalHistory,
      appointments,
      feedback,
      reports,
    },
  });
});