import { CreateNotificacionDto, FiltroNotificacion, Notificacion, NotificacionesPage } from '../types/notificacion.types';
import { apiClient } from './client';

export const NOTIFICACIONES_PAGE_SIZE = 30;

export const notificacionesApi = {
  getAll: async (
    estado?: FiltroNotificacion,
    skip = 0,
    take = NOTIFICACIONES_PAGE_SIZE,
  ): Promise<NotificacionesPage> => {
    const { data } = await apiClient.get('/notificaciones', { params: { estado, skip, take } });
    return data;
  },

  countNoLeidas: async (): Promise<{ total: number }> => {
    const { data } = await apiClient.get('/notificaciones/no-leidas');
    return data;
  },

  getOne: async (id: number): Promise<Notificacion> => {
    const { data } = await apiClient.get(`/notificaciones/${id}`);
    return data;
  },

  create: async (dto: CreateNotificacionDto): Promise<Notificacion> => {
    const { data } = await apiClient.post('/notificaciones', dto);
    return data;
  },

  marcarLeida: async (id: number): Promise<Notificacion> => {
    const { data } = await apiClient.patch(`/notificaciones/${id}/leer`);
    return data;
  },

  marcarTodasLeidas: async (): Promise<{ count: number }> => {
    const { data } = await apiClient.patch('/notificaciones/leer-todas');
    return data;
  },

  remove: async (id: number): Promise<void> => {
    await apiClient.delete(`/notificaciones/${id}`);
  },

  registrarPushToken: async (token: string): Promise<void> => {
    await apiClient.post('/notificaciones/push-token', { token });
  },

  eliminarPushToken: async (): Promise<void> => {
    await apiClient.delete('/notificaciones/push-token');
  },
};
