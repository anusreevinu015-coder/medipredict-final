import { api } from './client';
import type { ChatMessage } from '../types/auth';
import type { HealthAssessment } from '../types/assistant';

interface GetMessagesResponse {
  messages: ChatMessage[];
}

interface SendMessageResponse {
  messages: ChatMessage[];
  emergency: boolean;
}

interface SendMessageInput {
  content: string;
}

interface AssessmentResponse {
  messages: ChatMessage[];
  ready: boolean;
  emergency: boolean;
  assessment: HealthAssessment | null;
  message?: string;
}

export const chatApi = {
  getMessages: () => api.get<GetMessagesResponse>('/api/chat/messages'),
  sendMessage: (data: SendMessageInput) =>
    api.post<SendMessageResponse>('/api/chat/messages', data),
  generateAssessment: () => api.post<AssessmentResponse>('/api/chat/assessment'),
};