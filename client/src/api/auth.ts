import { api } from './client';
import type { SafeUser } from '../types/auth';

interface MeResponse {
  user: SafeUser | null;
}

interface AuthResponse {
  user: SafeUser;
}

export const authApi = {
  me: () => api.get<MeResponse>('/api/auth/me'),

  signup: (data: { name: string; email: string; password: string }) =>
    api.post<AuthResponse>('/api/auth/signup', data),

  login: (data: { email: string; password: string }) =>
    api.post<AuthResponse>('/api/auth/login', data),

  logout: () => api.post<{ message: string }>('/api/auth/logout'),
};