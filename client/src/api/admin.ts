import { api } from './client';
import type { Appointment, AppointmentStatus, Feedback } from '../types/auth';
import type { HospitalCatalogItem, HospitalDepartment, Doctor } from '../types/hospital';
import type { AdminDashboardData, AdminPatientDetail, AdminPatientSummary } from '../types/admin';

interface ListAppointmentsResponse {
  appointments: Appointment[];
}

interface UpdateAppointmentResponse {
  appointment: Appointment;
  message: string;
}

interface ListHospitalsResponse {
  hospitals: HospitalCatalogItem[];
  cities: string[];
}

interface HospitalResponse {
  hospital: HospitalCatalogItem;
  message: string;
}

interface DepartmentResponse {
  department: HospitalDepartment;
  message: string;
}

interface DoctorResponse {
  doctor: Doctor;
  message: string;
}

interface MessageResponse {
  message: string;
}

interface ListFeedbackResponse {
  feedback: Feedback[];
}

export interface HospitalInput {
  name: string;
  city: string;
  district?: string | null;
  state: string;
  address: string;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  availability?: string | null;
}

export interface DepartmentInput {
  name: string;
  description?: string | null;
}

export interface DoctorInput {
  departmentId: string;
  name: string;
  title: string;
  specialty: string;
  experience?: number | null;
  availability?: string | null;
}

export const adminApi = {
  getDashboard: () => api.get<AdminDashboardData>('/api/admin/dashboard'),

  getPatients: () => api.get<{ patients: AdminPatientSummary[] }>('/api/admin/patients'),
  getPatientDetail: (patientId: string) =>
    api.get<AdminPatientDetail>(`/api/admin/patients/${patientId}`),

  getAppointments: () => api.get<ListAppointmentsResponse>('/api/admin/appointments'),
  updateAppointmentStatus: (appointmentId: string, status: AppointmentStatus) =>
    api.patch<UpdateAppointmentResponse>(`/api/admin/appointments/${appointmentId}/status`, {
      status,
    }),

  getFeedback: () => api.get<ListFeedbackResponse>('/api/admin/feedback'),
  deleteFeedback: (feedbackId: string) =>
    api.del<MessageResponse>(`/api/admin/feedback/${feedbackId}`),

  getHospitals: () => api.get<ListHospitalsResponse>('/api/admin/hospitals'),
  addHospital: (data: HospitalInput) => api.post<HospitalResponse>('/api/admin/hospitals', data),
  updateHospital: (hospitalId: string, data: HospitalInput) =>
    api.put<HospitalResponse>(`/api/admin/hospitals/${hospitalId}`, data),
  deleteHospital: (hospitalId: string) =>
    api.del<MessageResponse>(`/api/admin/hospitals/${hospitalId}`),

  addDepartment: (hospitalId: string, data: DepartmentInput) =>
    api.post<DepartmentResponse>(`/api/admin/hospitals/${hospitalId}/departments`, data),
  updateDepartment: (hospitalId: string, departmentId: string, data: DepartmentInput) =>
    api.put<DepartmentResponse>(`/api/admin/hospitals/${hospitalId}/departments/${departmentId}`, data),
  deleteDepartment: (hospitalId: string, departmentId: string) =>
    api.del<MessageResponse>(`/api/admin/hospitals/${hospitalId}/departments/${departmentId}`),

  addDoctor: (hospitalId: string, data: DoctorInput) =>
    api.post<DoctorResponse>(`/api/admin/hospitals/${hospitalId}/doctors`, data),
  updateDoctor: (hospitalId: string, doctorId: string, data: DoctorInput) =>
    api.put<DoctorResponse>(`/api/admin/hospitals/${hospitalId}/doctors/${doctorId}`, data),
  deleteDoctor: (hospitalId: string, doctorId: string) =>
    api.del<MessageResponse>(`/api/admin/hospitals/${hospitalId}/doctors/${doctorId}`),
};