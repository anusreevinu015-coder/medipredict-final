import { pool } from '../config/database.js';
import type { AppointmentStatus } from '../types/auth.js';

export interface AdminPatientSummary {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  dateOfBirth: string | null;
  gender: 'male' | 'female' | 'other' | null;
  address: string | null;
  createdAt: Date;
  appointmentCount: number;
  feedbackCount: number;
  reportCount: number;
  lastAppointmentStatus: AppointmentStatus | null;
}

interface AdminPatientSummaryRow {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  date_of_birth: string | null;
  gender: 'male' | 'female' | 'other' | null;
  address: string | null;
  created_at: Date;
  appointment_count: number;
  feedback_count: number;
  report_count: number;
  last_appointment_status: AppointmentStatus | null;
}

const LIST_PATIENTS_SQL = `
  SELECT
    u.id,
    u.name,
    u.email,
    p.phone,
    p.date_of_birth::text AS date_of_birth,
    p.gender,
    p.address,
    u.created_at,
    COUNT(DISTINCT a.id)::int AS appointment_count,
    COUNT(DISTINCT f.id)::int AS feedback_count,
    COUNT(DISTINCT r.id)::int AS report_count,
    la.status AS last_appointment_status
  FROM users u
  LEFT JOIN patient_profiles p ON p.user_id = u.id
  LEFT JOIN appointments a ON a.user_id = u.id
  LEFT JOIN feedback f ON f.user_id = u.id
  LEFT JOIN reports r ON r.user_id = u.id
  LEFT JOIN LATERAL (
    SELECT status
    FROM appointments
    WHERE user_id = u.id
    ORDER BY created_at DESC
    LIMIT 1
  ) la ON true
  WHERE u.role = 'patient'
  GROUP BY u.id, u.name, u.email, p.phone, p.date_of_birth, p.gender, p.address,
           u.created_at, la.status
  ORDER BY u.created_at DESC
`;

export async function listAllPatientsForAdmin(): Promise<AdminPatientSummary[]> {
  const result = await pool.query<AdminPatientSummaryRow>(LIST_PATIENTS_SQL);
  return result.rows.map((row) => ({
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    dateOfBirth: row.date_of_birth,
    gender: row.gender,
    address: row.address,
    createdAt: row.created_at,
    appointmentCount: row.appointment_count,
    feedbackCount: row.feedback_count,
    reportCount: row.report_count,
    lastAppointmentStatus: row.last_appointment_status,
  }));
}