export type Role = 'patient' | 'admin';

export interface SafeUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  createdAt: Date;
}

export interface UserRow {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  role: Role;
  created_at: Date;
}

export interface SessionRow {
  id: string;
  user_id: string;
  token_hash: string;
  expires_at: Date;
  created_at: Date;
}

export interface PatientProfile {
  id: string;
  name: string;
  email: string;
  role: Role;
  createdAt: Date;
  phone: string | null;
  dateOfBirth: string | null;
  gender: 'male' | 'female' | 'other' | null;
  address: string | null;
  updatedAt: Date | null;
}

export interface MedicalHistory {
  userId: string;
  conditions: string | null;
  allergies: string | null;
  medications: string | null;
  surgeries: string | null;
  familyHistory: string | null;
  notes: string | null;
  createdAt: Date | null;
  updatedAt: Date | null;
}

export type ReportStatus = 'pending_review' | 'under_review' | 'reviewed' | 'rejected';

export type ExtractionStatus = 'none' | 'processing' | 'pending_confirmation' | 'confirmed' | 'failed';

export type ExtractionQuality = 'readable' | 'low';

export type ExtractionIndicator = 'high' | 'low' | 'abnormal' | 'normal' | null;

export interface ExtractedItem {
  id: string;
  testName: string;
  value: string;
  unit: string;
  reference: string;
  indicator: 'high' | 'low' | 'abnormal' | 'normal' | null;
}

export interface ReportExtraction {
  status: ExtractionStatus;
  quality: ExtractionQuality | null;
  text: string | null;
  items: ExtractedItem[];
  reportDate: string | null;
  diagnoses: string[];
  medicines: string[];
  notes: string | null;
}

export interface Report {
  id: string;
  userId: string;
  originalFilename: string;
  fileType: string;
  fileSize: number;
  storagePath: string;
  status: ReportStatus;
  extraction: ReportExtraction;
  createdAt: Date;
}

export type ChatRole = 'patient' | 'assistant';

export interface ChatMessage {
  id: string;
  userId: string;
  role: ChatRole;
  content: string;
  createdAt: Date;
}

export type AppointmentStatus = 'pending' | 'approved' | 'rejected' | 'cancelled' | 'completed';

export interface AppointmentReference {
  id: string;
  name: string;
}

export interface AppointmentHospital {
  id: string;
  name: string;
  city: string;
  address: string;
  phone: string | null;
}

export interface AppointmentDoctor {
  id: string;
  name: string;
  title: string;
  specialty: string;
}

export interface Appointment {
  id: string;
  userId: string;
  hospitalId: string;
  departmentId: string;
  doctorId: string;
  appointmentDate: string;
  appointmentTime: string;
  reason: string | null;
  status: AppointmentStatus;
  hospital: AppointmentHospital | null;
  department: AppointmentReference | null;
  doctor: AppointmentDoctor | null;
  patient: { id: string; name: string; email: string } | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Feedback {
  id: string;
  userId: string;
  hospitalId: string | null;
  doctorId: string | null;
  appointmentId: string | null;
  rating: number;
  comment: string;
  hospital: { id: string; name: string; city: string } | null;
  doctor: { id: string; name: string; specialty: string } | null;
  patient: { id: string; name: string; email: string } | null;
  appointmentDate: string | null;
  createdAt: Date;
}