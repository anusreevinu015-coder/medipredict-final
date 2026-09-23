import { api, ApiError } from './client';
import type {
  ExtractionQuality,
  ExtractedItem,
  MedicalHistory,
  PatientProfile,
  Report,
} from '../types/auth';

interface ProfileResponse {
  profile: PatientProfile;
}

interface UpdateProfileResponse extends ProfileResponse {
  message: string;
}

export interface ProfileUpdateInput {
  name: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  gender: string;
  address: string;
}

interface MedicalHistoryResponse {
  history: MedicalHistory | null;
}

interface UpdateMedicalHistoryResponse {
  history: MedicalHistory;
  message: string;
}

export interface MedicalHistoryInput {
  conditions: string;
  allergies: string;
  medications: string;
  surgeries: string;
  familyHistory: string;
  notes: string;
}

interface ListReportsResponse {
  reports: Report[];
}

interface UploadReportResponse {
  report: Report;
  message: string;
}

interface ReportExtractionResponse {
  report: Report;
  message: string;
}

export interface ExtractionSaveInput {
  items: ExtractedItem[];
  reportDate: string | null;
  diagnoses: string[];
  medicines: string[];
  quality: ExtractionQuality | null;
  notes: string | null;
}

export const patientApi = {
  getProfile: () => api.get<ProfileResponse>('/api/patient/profile'),
  updateProfile: (data: ProfileUpdateInput) =>
    api.put<UpdateProfileResponse>('/api/patient/profile', data),
  getMedicalHistory: () => api.get<MedicalHistoryResponse>('/api/patient/medical-history'),
  updateMedicalHistory: (data: MedicalHistoryInput) =>
    api.put<UpdateMedicalHistoryResponse>('/api/patient/medical-history', data),
  getReports: () => api.get<ListReportsResponse>('/api/patient/reports'),
  uploadReport: (file: File, onProgress?: (percent: number) => void) =>
    new Promise<UploadReportResponse>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', '/api/patient/reports');
      xhr.withCredentials = true;
      xhr.responseType = 'json';
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable && onProgress) {
          onProgress(Math.round((event.loaded / event.total) * 100));
        }
      };
      xhr.onload = () => {
        const body = xhr.response as UploadReportResponse | { message?: string } | null;
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(body as UploadReportResponse);
          return;
        }
        reject(new ApiError((body as { message?: string } | null)?.message ?? 'Upload failed.', xhr.status));
      };
      xhr.onerror = () => reject(new ApiError('Upload failed. Please try again.', 0));
      const formData = new FormData();
      formData.append('file', file);
      xhr.send(formData);
    }),
  reportFileUrl: (reportId: string) => `/api/patient/reports/${reportId}/file`,
  saveExtraction: (reportId: string, data: ExtractionSaveInput) =>
    api.put<ReportExtractionResponse>(`/api/patient/reports/${reportId}/extraction`, data),
  confirmExtraction: (reportId: string) =>
    api.post<ReportExtractionResponse>(`/api/patient/reports/${reportId}/confirm`),
};