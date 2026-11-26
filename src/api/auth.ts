import { LoginResponse } from '../types/auth.types';
import { apiClient } from './client';

export const authApi = {
  login: async (email: string, password: string): Promise<LoginResponse> => {
    const { data } = await apiClient.post<LoginResponse>('/auth/login', { email, password });
    return data;
  },
  /** Paso 1 de la recuperación: manda el código al email. Responde lo mismo exista o no el email. */
  forgotPassword: async (email: string): Promise<void> => {
    await apiClient.post('/auth/forgot-password', { email });
  },
  /** Paso 2: canjea el código por un token de reseteo de 10 minutos. */
  verifyOtp: async (email: string, codigo: string): Promise<string> => {
    const { data } = await apiClient.post<{ resetToken: string }>('/auth/verify-otp', { email, codigo });
    return data.resetToken;
  },
  /** Paso 3: fija la contraseña nueva y cierra todas las sesiones. */
  resetPassword: async (resetToken: string, newPassword: string): Promise<void> => {
    await apiClient.post('/auth/reset-password', { resetToken, newPassword });
  },
  logout: async (refreshToken: string): Promise<void> => {
    await apiClient.post('/auth/logout', { refreshToken });
  },
  logoutAll: async (): Promise<void> => {
    await apiClient.post('/auth/logout-all');
  },
};
