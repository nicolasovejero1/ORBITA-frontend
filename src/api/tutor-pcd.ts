import { apiClient } from './client';

export interface TutorPcd {
  tutorId: number;
  pcdId: number;
  estado: 'ACTIVO' | 'INACTIVO';
  /** Relación de este tutor con este PCD (Madre, Padre, Tía...). */
  parentesco: string;
  tutor: { usuario: { id: number; nombre: string; apellido: string; dni: string } };
  pcd: { usuario: { id: number; nombre: string; apellido: string; dni: string } };
}

export const tutorPcdApi = {
  getAll: async (params?: { pcdId?: number; estado?: 'ACTIVO' | 'INACTIVO'; tutorId?: number }): Promise<TutorPcd[]> => {
    const { data } = await apiClient.get('/tutor-pcd', { params });
    return data;
  },

  create: async (dto: { tutorId: number; pcdId: number; parentesco: string }): Promise<TutorPcd> => {
    const { data } = await apiClient.post('/tutor-pcd', dto);
    return data;
  },

  updateStatus: async (tutorId: number, pcdId: number, estado: 'ACTIVO' | 'INACTIVO'): Promise<TutorPcd> => {
    const { data } = await apiClient.patch(`/tutor-pcd/${tutorId}/${pcdId}/status`, { estado });
    return data;
  },

  updateParentesco: async (tutorId: number, pcdId: number, parentesco: string): Promise<TutorPcd> => {
    const { data } = await apiClient.patch(`/tutor-pcd/${tutorId}/${pcdId}/parentesco`, { parentesco });
    return data;
  },

  remove: async (tutorId: number, pcdId: number): Promise<void> => {
    await apiClient.delete(`/tutor-pcd/${tutorId}/${pcdId}`);
  },
};
