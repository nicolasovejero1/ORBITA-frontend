import { CreateUsuarioDto, UsuarioListItem } from '../types/usuario.types';
import { UpdateProfileDto, Usuario } from '../types/auth.types';
import { apiClient } from './client';

export const usuariosApi = {
  getMe: async (): Promise<Usuario> => {
    const { data } = await apiClient.get('/usuarios/me');
    return data;
  },

  updateMe: async (dto: UpdateProfileDto): Promise<Usuario> => {
    const { data } = await apiClient.patch('/usuarios/me', dto);
    return data;
  },

  getAll: async (tipo?: string): Promise<UsuarioListItem[]> => {
    const { data } = await apiClient.get('/usuarios', { params: tipo ? { tipo } : {} });
    return data;
  },

  getOne: async (id: number): Promise<UsuarioListItem> => {
    const { data } = await apiClient.get(`/usuarios/${id}`);
    return data;
  },

  create: async (dto: CreateUsuarioDto): Promise<UsuarioListItem> => {
    const { data } = await apiClient.post('/usuarios', dto);
    return data;
  },

  update: async (id: number, dto: Partial<Omit<CreateUsuarioDto, 'tipoUsuario' | 'password'>>): Promise<UsuarioListItem> => {
    const { data } = await apiClient.put(`/usuarios/${id}`, dto);
    return data;
  },

  updateStatus: async (id: number, estado: 'ACTIVO' | 'INACTIVO'): Promise<UsuarioListItem> => {
    const { data } = await apiClient.patch(`/usuarios/${id}/status`, { estado });
    return data;
  },

  changeOwnPassword: async (currentPassword: string, newPassword: string): Promise<void> => {
    await apiClient.patch('/usuarios/me/password', { currentPassword, newPassword });
  },

  resetPassword: async (id: number, newPassword: string): Promise<void> => {
    await apiClient.patch(`/usuarios/${id}/password`, { newPassword });
  },

  remove: async (id: number): Promise<void> => {
    await apiClient.delete(`/usuarios/${id}`);
  },
};
