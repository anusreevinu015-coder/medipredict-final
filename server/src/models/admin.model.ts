import { pool } from '../config/database.js';
import type { AppointmentStatus } from '../types/auth.js';

export interface DashboardStats {
  totalPatients: number;
  newPatients: number;
  totalAppointments: number;
  pendingAppointments: number;
  approvedAppointments: number;
  rejectedAppointments: number;
  cancelledAppointments: number;
  completedAppointments: number;
  hospitals: number;
  doctors: number;
  feedbackCount: number;
  averageRating: number;
}

export interface TrendPoint {
  date: string;
  count: number;
}

export interface RatingCount {
  rating: number;
  count: number;
}

export interface HospitalLocationCount {
  label: string;
  city: string;
  count: number;
}

export interface PatientActivity {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
}

export interface AppointmentActivity {
  id: string;
  patientName: string;
  patientEmail: string;
  hospitalName: string;
  doctorName: string;
  appointmentDate: string;
  appointmentTime: string;
  status: AppointmentStatus;
  createdAt: Date;
}

export interface FeedbackActivity {
  id: string;
  patientName: string;
  patientEmail: string;
  hospitalName: string | null;
  rating: number;
  comment: string;
  createdAt: Date;
}

export interface DashboardData {
  stats: DashboardStats;
  trends: {
    patientRegistrations: TrendPoint[];
    appointments: TrendPoint[];
  };
  ratingDistribution: RatingCount[];
  hospitalsByLocation: HospitalLocationCount[];
  activity: {
    patients: PatientActivity[];
    appointments: AppointmentActivity[];
    feedback: FeedbackActivity[];
  };
}

interface StatsRow {
  total_patients: number;
  new_patients: number;
  total_appointments: number;
  pending_appointments: number;
  approved_appointments: number;
  rejected_appointments: number;
  cancelled_appointments: number;
  completed_appointments: number;
  hospitals: number;
  doctors: number;
  feedback_count: number;
  average_rating: number;
}

interface TrendRow {
  date: string;
  count: number;
}

interface RatingRow {
  rating: number;
  count: number;
}

interface HospitalLocationRow {
  label: string;
  city: string;
  count: number;
}

interface PatientActivityRow {
  id: string;
  name: string;
  email: string;
  created_at: Date;
}

interface AppointmentActivityRow {
  id: string;
  patient_name: string;
  patient_email: string;
  hospital_name: string;
  doctor_name: string;
  appointment_date: string;
  appointment_time: string;
  status: string;
  created_at: Date;
}

interface FeedbackActivityRow {
  id: string;
  patient_name: string;
  patient_email: string;
  hospital_name: string | null;
  rating: number;
  comment: string;
  created_at: Date;
}

const STATS_SQL = `
  SELECT
    (SELECT count(*)::int FROM users WHERE role = 'patient') AS total_patients,
    (SELECT count(*)::int FROM users WHERE role = 'patient'
       AND created_at >= now() - interval '7 days') AS new_patients,
    (SELECT count(*)::int FROM appointments) AS total_appointments,
    (SELECT count(*)::int FROM appointments WHERE status = 'pending') AS pending_appointments,
    (SELECT count(*)::int FROM appointments WHERE status = 'approved') AS approved_appointments,
    (SELECT count(*)::int FROM appointments WHERE status = 'rejected') AS rejected_appointments,
    (SELECT count(*)::int FROM appointments WHERE status = 'cancelled') AS cancelled_appointments,
    (SELECT count(*)::int FROM appointments WHERE status = 'completed') AS completed_appointments,
    (SELECT count(*)::int FROM hospitals) AS hospitals,
    (SELECT count(*)::int FROM doctors) AS doctors,
    (SELECT count(*)::int FROM feedback) AS feedback_count,
    (SELECT COALESCE(AVG(rating), 0)::float8 FROM feedback) AS average_rating
`;

const PATIENT_TREND_SQL = `
  SELECT to_char(d, 'YYYY-MM-DD') AS date, count(u.id)::int AS count
  FROM generate_series(now()::date - interval '13 days', now()::date, interval '1 day') AS d
  LEFT JOIN users u ON u.role = 'patient' AND u.created_at::date = d::date
  GROUP BY d
  ORDER BY d
`;

const APPOINTMENT_TREND_SQL = `
  SELECT to_char(d, 'YYYY-MM-DD') AS date, count(a.id)::int AS count
  FROM generate_series(now()::date - interval '13 days', now()::date, interval '1 day') AS d
  LEFT JOIN appointments a ON a.created_at::date = d::date
  GROUP BY d
  ORDER BY d
`;

const RATING_DISTRIBUTION_SQL = `
  SELECT rating, count(*)::int AS count
  FROM feedback
  GROUP BY rating
  ORDER BY rating
`;

const HOSPITALS_BY_LOCATION_SQL = `
  SELECT COALESCE(NULLIF(district, ''), city) AS label, city, count(*)::int AS count
  FROM hospitals
  GROUP BY COALESCE(NULLIF(district, ''), city), city
  ORDER BY count DESC, label ASC
`;

const RECENT_PATIENTS_SQL = `
  SELECT id, name, email, created_at
  FROM users
  WHERE role = 'patient'
  ORDER BY created_at DESC
  LIMIT 8
`;

const RECENT_APPOINTMENTS_SQL = `
  SELECT
    a.id,
    u.name AS patient_name,
    u.email AS patient_email,
    h.name AS hospital_name,
    doc.name AS doctor_name,
    a.appointment_date::text AS appointment_date,
    to_char(a.appointment_time, 'HH24:MI') AS appointment_time,
    a.status,
    a.created_at
  FROM appointments a
  JOIN users u ON u.id = a.user_id
  JOIN hospitals h ON h.id = a.hospital_id
  JOIN doctors doc ON doc.id = a.doctor_id
  ORDER BY a.created_at DESC
  LIMIT 8
`;

const RECENT_FEEDBACK_SQL = `
  SELECT
    f.id,
    u.name AS patient_name,
    u.email AS patient_email,
    h.name AS hospital_name,
    f.rating,
    f.comment,
    f.created_at
  FROM feedback f
  JOIN users u ON u.id = f.user_id
  LEFT JOIN hospitals h ON h.id = f.hospital_id
  ORDER BY f.created_at DESC
  LIMIT 8
`;

function mapStats(row: StatsRow): DashboardStats {
  return {
    totalPatients: row.total_patients,
    newPatients: row.new_patients,
    totalAppointments: row.total_appointments,
    pendingAppointments: row.pending_appointments,
    approvedAppointments: row.approved_appointments,
    rejectedAppointments: row.rejected_appointments,
    cancelledAppointments: row.cancelled_appointments,
    completedAppointments: row.completed_appointments,
    hospitals: row.hospitals,
    doctors: row.doctors,
    feedbackCount: row.feedback_count,
    averageRating: Number(row.average_rating),
  };
}

function mapTrend(rows: TrendRow[]): TrendPoint[] {
  return rows.map((r) => ({ date: r.date, count: r.count }));
}

export async function getDashboardData(): Promise<DashboardData> {
  const [
    statsResult,
    patientTrendResult,
    appointmentTrendResult,
    ratingResult,
    locationResult,
    recentPatientsResult,
    recentAppointmentsResult,
    recentFeedbackResult,
  ] = await Promise.all([
    pool.query<StatsRow>(STATS_SQL),
    pool.query<TrendRow>(PATIENT_TREND_SQL),
    pool.query<TrendRow>(APPOINTMENT_TREND_SQL),
    pool.query<RatingRow>(RATING_DISTRIBUTION_SQL),
    pool.query<HospitalLocationRow>(HOSPITALS_BY_LOCATION_SQL),
    pool.query<PatientActivityRow>(RECENT_PATIENTS_SQL),
    pool.query<AppointmentActivityRow>(RECENT_APPOINTMENTS_SQL),
    pool.query<FeedbackActivityRow>(RECENT_FEEDBACK_SQL),
  ]);

  return {
    stats: mapStats(statsResult.rows[0]),
    trends: {
      patientRegistrations: mapTrend(patientTrendResult.rows),
      appointments: mapTrend(appointmentTrendResult.rows),
    },
    ratingDistribution: ratingResult.rows.map((r) => ({ rating: r.rating, count: r.count })),
    hospitalsByLocation: locationResult.rows.map((r) => ({
      label: r.label,
      city: r.city,
      count: r.count,
    })),
    activity: {
      patients: recentPatientsResult.rows.map((r) => ({
        id: r.id,
        name: r.name,
        email: r.email,
        createdAt: r.created_at,
      })),
      appointments: recentAppointmentsResult.rows.map((r) => ({
        id: r.id,
        patientName: r.patient_name,
        patientEmail: r.patient_email,
        hospitalName: r.hospital_name,
        doctorName: r.doctor_name,
        appointmentDate: r.appointment_date,
        appointmentTime: r.appointment_time,
        status: r.status as AppointmentStatus,
        createdAt: r.created_at,
      })),
      feedback: recentFeedbackResult.rows.map((r) => ({
        id: r.id,
        patientName: r.patient_name,
        patientEmail: r.patient_email,
        hospitalName: r.hospital_name,
        rating: r.rating,
        comment: r.comment,
        createdAt: r.created_at,
      })),
    },
  };
}