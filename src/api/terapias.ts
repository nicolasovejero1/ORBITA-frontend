import { apiClient } from './client';

export interface TerapiaCatalogo {
  id: number;
  tipo: string;
  descripcion: string;
  especialidad?: { id: number; nombre: string } | null;
}

export interface TerapiaDto {
  tipo: string;
  descripcion: string;
  especialidadId?: number;
}

export const terapiasApi = {
  getAll: async (): Promise<TerapiaCatalogo[]> => {
    const { data } = await apiClient.get('/terapias');
    return data;
  },

  create: async (dto: TerapiaDto): Promise<TerapiaCatalogo> => {
    const { data } = await apiClient.post('/terapias', dto);
    return data;
  },

  update: async (id: number, dto: Partial<TerapiaDto>): Promise<TerapiaCatalogo> => {
    const { data } = await apiClient.put(`/terapias/${id}`, dto);
    return data;
  },

  remove: async (id: number): Promise<void> => {
    await apiClient.delete(`/terapias/${id}`);
  },
};
