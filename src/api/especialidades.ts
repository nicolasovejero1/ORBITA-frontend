import { Especialidad } from '../types/usuario.types';
import { apiClient } from './client';

export const especialidadesApi = {
  getAll: async (): Promise<Especialidad[]> => {
    const { data } = await apiClient.get('/especialidades');
    return data;
  },
};
