import {
  ChangeEstadoReporteDto,
  CreateReporteDto,
  EstadoReporte,
  Reporte,
  ReporteAdjunto,
  ReporteColaborador,
  UpdateReporteDto,
} from '../types/reporte.types';
import { apiClient } from './client';

export const reportesApi = {
  getAll: async (params?: { actividadId?: number; pcdId?: number; estado?: EstadoReporte }): Promise<Reporte[]> => {
    const { data } = await apiClient.get('/reportes', { params });
    return data;
  },

  getColaboraciones: async (): Promise<Reporte[]> => {
    const { data } = await apiClient.get('/reportes/colaboraciones');
    return data;
  },

  getOne: async (id: number): Promise<Reporte> => {
    const { data } = await apiClient.get(`/reportes/${id}`);
    return data;
  },

  create: async (dto: CreateReporteDto): Promise<Reporte> => {
    const { data } = await apiClient.post('/reportes', dto);
    return data;
  },

  update: async (id: number, dto: UpdateReporteDto): Promise<Reporte> => {
    const { data } = await apiClient.patch(`/reportes/${id}`, dto);
    return data;
  },

  changeEstado: async (id: number, dto: ChangeEstadoReporteDto): Promise<Reporte> => {
    const { data } = await apiClient.patch(`/reportes/${id}/estado`, dto);
    return data;
  },

  remove: async (id: number): Promise<void> => {
    await apiClient.delete(`/reportes/${id}`);
  },

  
  /** Registra un enlace externo (http o https); los archivos se suben con `uploadAdjunto`. */
  addAdjunto: async (reporteId: number, filePath: string) => {
    const { data } = await apiClient.post(`/reportes/${reporteId}/adjuntos`, { filePath });
    return data;
  },

  uploadAdjunto: async (
    reporteId: number,
    file: { uri: string; name: string; type: string; file?: any },
  ): Promise<ReporteAdjunto> => {
    const form = new FormData();
    if (file.file) {
      form.append('file', file.file);
    } else {
      form.append('file', { uri: file.uri, name: file.name, type: file.type } as any);
    }
    const { data } = await apiClient.post(`/reportes/${reporteId}/adjuntos/upload`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },

  /** Enlace firmado (60 s) para abrir un adjunto. Los enlaces externos vuelven tal cual. */
  getUrlAdjunto: async (
    reporteId: number,
    adjuntoId: number,
  ): Promise<{ url: string; externo: boolean; expiraEnSegundos: number | null }> => {
    const { data } = await apiClient.get(`/reportes/${reporteId}/adjuntos/${adjuntoId}/url`);
    return data;
  },

  removeAdjunto: async (reporteId: number, adjuntoId: number): Promise<void> => {
    await apiClient.delete(`/reportes/${reporteId}/adjuntos/${adjuntoId}`);
  },

  
  getColaboradores: async (reporteId: number): Promise<ReporteColaborador[]> => {
    const { data } = await apiClient.get(`/reportes/${reporteId}/colaboradores`);
    return data;
  },

  addColaborador: async (reporteId: number, profesionalId: number) => {
    const { data } = await apiClient.post(`/reportes/${reporteId}/colaboradores`, { profesionalId });
    return data;
  },

  removeColaborador: async (reporteId: number, profesionalId: number): Promise<void> => {
    await apiClient.delete(`/reportes/${reporteId}/colaboradores/${profesionalId}`);
  },
};
