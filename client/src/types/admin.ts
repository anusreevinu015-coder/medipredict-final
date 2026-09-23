import type {
  Appointment,
  AppointmentStatus,
  Feedback,
  MedicalHistory,
  PatientProfile,
  Report,
} from './auth';

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
  createdAt: string;
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
  createdAt: string;
}

export interface FeedbackActivity {
  id: string;
  patientName: string;
  patientEmail: string;
  hospitalName: string | null;
  rating: number;
  comment: string;
  createdAt: string;
}

export interface AdminDashboardData {
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

export interface AdminPatientSummary {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  dateOfBirth: string | null;
  gender: 'male' | 'female' | 'other' | null;
  address: string | null;
  createdAt: string;
  appointmentCount: number;
  feedbackCount: number;
  reportCount: number;
  lastAppointmentStatus: AppointmentStatus | null;
}

export interface AdminPatientDetail {
  patient: {
    profile: PatientProfile;
    medicalHistory: MedicalHistory | null;
    appointments: Appointment[];
    feedback: Feedback[];
    reports: Report[];
  };
}