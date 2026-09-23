import { api } from './client';
import type { Feedback } from '../types/auth';

interface ListFeedbackResponse {
  feedback: Feedback[];
}

interface SubmitFeedbackResponse {
  feedback: Feedback;
  message: string;
}

export interface FeedbackInput {
  rating: number;
  comment: string;
  hospitalId?: string | null;
  appointmentId?: string | null;
}

export const feedbackApi = {
  getMyFeedback: () => api.get<ListFeedbackResponse>('/api/patient/feedback'),
  submitFeedback: (data: FeedbackInput) =>
    api.post<SubmitFeedbackResponse>('/api/patient/feedback', data),
};