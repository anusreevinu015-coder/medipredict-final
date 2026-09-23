import { pool } from '../config/database.js';
import type { Appointment, AppointmentStatus } from '../types/auth.js';

interface AppointmentRow {
  id: string;
  user_id: string;
  hospital_id: string;
  department_id: string;
  doctor_id: string;
  appointment_date: string;
  appointment_time: string;
  reason: string | null;
  status: string;
  created_at: Date;
  updated_at: Date;
  hospital_name: string;
  hospital_city: string;
  hospital_address: string;
  hospital_phone: string | null;
  department_name: string;
  doctor_name: string;
  doctor_title: string;
  doctor_specialty: string;
  patient_name: string;
  patient_email: string;
}

const APPOINTMENT_SELECT = `
  SELECT
    a.id,
    a.user_id,
    a.hospital_id,
    a.department_id,
    a.doctor_id,
    a.appointment_date::text AS appointment_date,
    to_char(a.appointment_time, 'HH24:MI') AS appointment_time,
    a.reason,
    a.status,
    a.created_at,
    a.updated_at,
    h.name AS hospital_name,
    h.city AS hospital_city,
    h.address AS hospital_address,
    h.phone AS hospital_phone,
    d.name AS department_name,
    doc.name AS doctor_name,
    doc.title AS doctor_title,
    doc.specialty AS doctor_specialty,
    u.name AS patient_name,
    u.email AS patient_email
  FROM appointments a
  JOIN hospitals h ON h.id = a.hospital_id
  JOIN hospital_departments d ON d.id = a.department_id
  JOIN doctors doc ON doc.id = a.doctor_id
  JOIN users u ON u.id = a.user_id
`;

function toAppointment(row: AppointmentRow): Appointment {
  return {
    id: row.id,
    userId: row.user_id,
    hospitalId: row.hospital_id,
    departmentId: row.department_id,
    doctorId: row.doctor_id,
    appointmentDate: row.appointment_date,
    appointmentTime: row.appointment_time,
    reason: row.reason,
    status: row.status as AppointmentStatus,
    hospital: {
      id: row.hospital_id,
      name: row.hospital_name,
      city: row.hospital_city,
      address: row.hospital_address,
      phone: row.hospital_phone,
    },
    department: { id: row.department_id, name: row.department_name },
    doctor: {
      id: row.doctor_id,
      name: row.doctor_name,
      title: row.doctor_title,
      specialty: row.doctor_specialty,
    },
    patient: { id: row.user_id, name: row.patient_name, email: row.patient_email },
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function doctorBelongsTo(
  doctorId: string,
  hospitalId: string,
  departmentId: string,
): Promise<boolean> {
  const result = await pool.query<{ id: string }>(
    `SELECT id FROM doctors
     WHERE id = $1 AND hospital_id = $2 AND department_id = $3`,
    [doctorId, hospitalId, departmentId],
  );
  return result.rows.length > 0;
}

export async function hasDuplicateBooking(
  userId: string,
  doctorId: string,
  date: string,
  time: string,
): Promise<boolean> {
  const result = await pool.query(
    `SELECT 1 FROM appointments
     WHERE user_id = $1 AND doctor_id = $2
       AND appointment_date = $3 AND appointment_time = $4
       AND status IN ('pending', 'approved')
     LIMIT 1`,
    [userId, doctorId, date, time],
  );
  return result.rows.length > 0;
}

export async function createAppointment(data: {
  userId: string;
  hospitalId: string;
  departmentId: string;
  doctorId: string;
  appointmentDate: string;
  appointmentTime: string;
  reason: string | null;
}): Promise<Appointment> {
  const insert = await pool.query<{ id: string }>(
    `INSERT INTO appointments
       (user_id, hospital_id, department_id, doctor_id, appointment_date, appointment_time, reason)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id`,
    [
      data.userId,
      data.hospitalId,
      data.departmentId,
      data.doctorId,
      data.appointmentDate,
      data.appointmentTime,
      data.reason,
    ],
  );
  const result = await pool.query<AppointmentRow>(
    `${APPOINTMENT_SELECT} WHERE a.id = $1`,
    [insert.rows[0].id],
  );
  return toAppointment(result.rows[0]);
}

export async function listAppointmentsByUser(userId: string): Promise<Appointment[]> {
  const result = await pool.query<AppointmentRow>(
    `${APPOINTMENT_SELECT} WHERE a.user_id = $1
     ORDER BY a.appointment_date DESC, a.appointment_time DESC`,
    [userId],
  );
  return result.rows.map(toAppointment);
}

export async function listAllAppointments(): Promise<Appointment[]> {
  const result = await pool.query<AppointmentRow>(
    `${APPOINTMENT_SELECT} ORDER BY a.created_at DESC`,
  );
  return result.rows.map(toAppointment);
}

export async function findAppointmentById(id: string): Promise<Appointment | null> {
  const result = await pool.query<AppointmentRow>(
    `${APPOINTMENT_SELECT} WHERE a.id = $1`,
    [id],
  );
  return result.rows[0] ? toAppointment(result.rows[0]) : null;
}

export async function updateAppointmentStatus(
  id: string,
  status: AppointmentStatus,
): Promise<Appointment | null> {
  const update = await pool.query<{ id: string }>(
    `UPDATE appointments SET status = $2, updated_at = now() WHERE id = $1 RETURNING id`,
    [id, status],
  );
  if (update.rows.length === 0) return null;
  const result = await pool.query<AppointmentRow>(
    `${APPOINTMENT_SELECT} WHERE a.id = $1`,
    [id],
  );
  return toAppointment(result.rows[0]);
}