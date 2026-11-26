import { apiClient } from './client';

export interface MedicamentoCatalogo {
  id: number;
  nombre: string;
  presentacion?: string;
  tipo?: string;
  descripcion?: string;
}

export const medicamentosApi = {
  getAll: async (nombre?: string): Promise<MedicamentoCatalogo[]> => {
    const { data } = await apiClient.get('/medicamentos', { params: nombre ? { nombre } : {} });
    return data;
  },

  create: async (dto: Omit<MedicamentoCatalogo, 'id'>): Promise<MedicamentoCatalogo> => {
    const { data } = await apiClient.post('/medicamentos', dto);
    return data;
  },

  update: async (id: number, dto: Partial<Omit<MedicamentoCatalogo, 'id'>>): Promise<MedicamentoCatalogo> => {
    const { data } = await apiClient.put(`/medicamentos/${id}`, dto);
    return data;
  },

  remove: async (id: number): Promise<void> => {
    await apiClient.delete(`/medicamentos/${id}`);
  },
};
