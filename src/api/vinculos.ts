import { CreateVinculoDto, EstadoVinculo, Vinculo } from '../types/vinculo.types';
import { apiClient } from './client';

export const vinculosApi = {
  getAll: async (params?: { pcdId?: number; profesionalId?: number; estado?: EstadoVinculo }): Promise<Vinculo[]> => {
    const { data } = await apiClient.get('/vinculos', { params });
    return data;
  },

  create: async (dto: CreateVinculoDto): Promise<Vinculo> => {
    const { data } = await apiClient.post('/vinculos', dto);
    return data;
  },

  updateStatus: async (pcdId: number, profesionalId: number, estado: EstadoVinculo): Promise<Vinculo> => {
    const { data } = await apiClient.patch(`/vinculos/${pcdId}/${profesionalId}/status`, { estado });
    return data;
  },

  remove: async (pcdId: number, profesionalId: number): Promise<void> => {
    await apiClient.delete(`/vinculos/${pcdId}/${profesionalId}`);
  },
};
