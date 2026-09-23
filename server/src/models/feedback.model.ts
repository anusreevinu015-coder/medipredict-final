import { pool } from '../config/database.js';
import type { Feedback } from '../types/auth.js';

interface FeedbackRow {
  id: string;
  user_id: string;
  hospital_id: string | null;
  doctor_id: string | null;
  appointment_id: string | null;
  rating: number;
  comment: string;
  created_at: Date;
  updated_at: Date;
  hospital_name: string | null;
  hospital_city: string | null;
  doctor_name: string | null;
  doctor_specialty: string | null;
  patient_name: string;
  patient_email: string;
  appointment_date: string | null;
}

const FEEDBACK_SELECT = `
  SELECT
    f.id,
    f.user_id,
    f.hospital_id,
    f.doctor_id,
    f.appointment_id,
    f.rating,
    f.comment,
    f.created_at,
    f.updated_at,
    h.name AS hospital_name,
    h.city AS hospital_city,
    doc.name AS doctor_name,
    doc.specialty AS doctor_specialty,
    u.name AS patient_name,
    u.email AS patient_email,
    a.appointment_date::text AS appointment_date
  FROM feedback f
  LEFT JOIN hospitals h ON h.id = f.hospital_id
  LEFT JOIN doctors doc ON doc.id = f.doctor_id
  LEFT JOIN appointments a ON a.id = f.appointment_id
  JOIN users u ON u.id = f.user_id
`;

function toFeedback(row: FeedbackRow): Feedback {
  return {
    id: row.id,
    userId: row.user_id,
    hospitalId: row.hospital_id,
    doctorId: row.doctor_id,
    appointmentId: row.appointment_id,
    rating: row.rating,
    comment: row.comment,
    hospital:
      row.hospital_id && row.hospital_name
        ? { id: row.hospital_id, name: row.hospital_name, city: row.hospital_city ?? '' }
        : null,
    doctor:
      row.doctor_id && row.doctor_name
        ? { id: row.doctor_id, name: row.doctor_name, specialty: row.doctor_specialty ?? '' }
        : null,
    patient: { id: row.user_id, name: row.patient_name, email: row.patient_email },
    appointmentDate: row.appointment_date,
    createdAt: row.created_at,
  };
}

export async function createFeedback(data: {
  userId: string;
  hospitalId: string | null;
  doctorId: string | null;
  appointmentId: string | null;
  rating: number;
  comment: string;
}): Promise<Feedback> {
  const insert = await pool.query<{ id: string }>(
    `INSERT INTO feedback (user_id, hospital_id, doctor_id, appointment_id, rating, comment)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id`,
    [
      data.userId,
      data.hospitalId,
      data.doctorId,
      data.appointmentId,
      data.rating,
      data.comment,
    ],
  );
  const result = await pool.query<FeedbackRow>(
    `${FEEDBACK_SELECT} WHERE f.id = $1`,
    [insert.rows[0].id],
  );
  return toFeedback(result.rows[0]);
}

export async function listFeedbackByUser(userId: string): Promise<Feedback[]> {
  const result = await pool.query<FeedbackRow>(
    `${FEEDBACK_SELECT} WHERE f.user_id = $1 ORDER BY f.created_at DESC`,
    [userId],
  );
  return result.rows.map(toFeedback);
}

export async function listAllFeedback(): Promise<Feedback[]> {
  const result = await pool.query<FeedbackRow>(
    `${FEEDBACK_SELECT} ORDER BY f.created_at DESC`,
  );
  return result.rows.map(toFeedback);
}

export async function findFeedbackById(id: string): Promise<Feedback | null> {
  const result = await pool.query<FeedbackRow>(
    `${FEEDBACK_SELECT} WHERE f.id = $1`,
    [id],
  );
  return result.rows[0] ? toFeedback(result.rows[0]) : null;
}

export async function deleteFeedback(id: string): Promise<boolean> {
  const result = await pool.query(`DELETE FROM feedback WHERE id = $1`, [id]);
  return (result.rowCount ?? 0) > 0;
}