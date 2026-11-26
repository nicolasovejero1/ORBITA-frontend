import { Actividad, ActividadInstancia, CreateActividadDto } from '../types/actividad.types';
import { apiClient } from './client';

export const actividadesApi = {
  getAll: async (
    pcdId?: number,
    opciones?: { estado?: 'PENDIENTE' | 'COMPLETADA'; orden?: 'creacion' | 'horario' },
  ): Promise<Actividad[]> => {
    const { data } = await apiClient.get('/actividades', {
      params: { ...(pcdId && { pcdId }), ...opciones },
    });
    return data;
  },

  getOne: async (id: number): Promise<Actividad> => {
    const { data } = await apiClient.get(`/actividades/${id}`);
    return data;
  },

  create: async (dto: CreateActividadDto): Promise<Actividad> => {
    const { data } = await apiClient.post('/actividades', dto);
    return data;
  },

  update: async (id: number, dto: Partial<CreateActividadDto>): Promise<Actividad> => {
    const { data } = await apiClient.put(`/actividades/${id}`, dto);
    return data;
  },

  updateEstado: async (id: number, estado: 'PENDIENTE' | 'COMPLETADA'): Promise<Actividad> => {
    const { data } = await apiClient.patch(`/actividades/${id}/estado`, { estado });
    return data;
  },

  remove: async (id: number): Promise<void> => {
    await apiClient.delete(`/actividades/${id}`);
  },

  getInstancias: async (id: number): Promise<ActividadInstancia[]> => {
    const { data } = await apiClient.get(`/actividades/${id}/instancias`);
    return data;
  },

  confirmarInstancia: async (actividadId: number, instanciaId: number): Promise<ActividadInstancia> => {
    const { data } = await apiClient.patch(`/actividades/${actividadId}/instancias/${instanciaId}/confirmar`);
    return data;
  },

  cancelarInstancia: async (
    actividadId: number,
    instanciaId: number,
    motivo?: string,
  ): Promise<ActividadInstancia> => {
    const { data } = await apiClient.patch(
      `/actividades/${actividadId}/instancias/${instanciaId}/cancelar`,
      motivo ? { motivo } : {},
    );
    return data;
  },
};
