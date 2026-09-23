import { api } from './client';
import type { Appointment } from '../types/auth';

interface ListAppointmentsResponse {
  appointments: Appointment[];
}

interface BookAppointmentResponse {
  appointment: Appointment;
  message: string;
}

export interface BookAppointmentInput {
  hospitalId: string;
  departmentId: string;
  doctorId: string;
  appointmentDate: string;
  appointmentTime: string;
  reason?: string;
}

export const appointmentApi = {
  getAppointments: () => api.get<ListAppointmentsResponse>('/api/patient/appointments'),
  bookAppointment: (data: BookAppointmentInput) =>
    api.post<BookAppointmentResponse>('/api/patient/appointments', data),
};