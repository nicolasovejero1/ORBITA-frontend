import { CreateUbicacionDto, Ubicacion, UbicacionCompartida } from '../types/ubicacion.types';
import { apiClient } from './client';


export function normalizarUbicacion(raw: any): Ubicacion {
  return {
    ...raw,
    latitud: Number(raw.latitud),
    longitud: Number(raw.longitud),
    precision: raw.precision != null ? Number(raw.precision) : undefined,
  };
}

export const ubicacionesApi = {
  registrar: async (dto: CreateUbicacionDto): Promise<Ubicacion> => {
    const { data } = await apiClient.post('/ubicaciones', dto);
    return normalizarUbicacion(data);
  },

  getUltima: async (pcdId: number): Promise<Ubicacion | null> => {
    try {
      const { data } = await apiClient.get(`/ubicaciones/pcd/${pcdId}/ultima`);
      return normalizarUbicacion(data);
    } catch (err: any) {
      if (err.response?.status === 404) return null;
      throw err;
    }
  },

  /**
   * De la más nueva a la más vieja. `desde`/`hasta` son fechas ISO; para la
   * página siguiente, `antes` es el id de la última ubicación recibida.
   */
  getHistorial: async (
    pcdId: number,
    params?: { desde?: string; hasta?: string; limite?: number; antes?: number },
  ): Promise<Ubicacion[]> => {
    const { data } = await apiClient.get(`/ubicaciones/pcd/${pcdId}/historial`, { params });
    return (data ?? []).map(normalizarUbicacion);
  },

  getCompartidos: async (): Promise<UbicacionCompartida[]> => {
    const { data } = await apiClient.get('/ubicaciones/compartidos');
    return data;
  },

  compartir: async (usuarioId: number): Promise<UbicacionCompartida> => {
    const { data } = await apiClient.post('/ubicaciones/compartidos', { usuarioId });
    return data;
  },

  revocar: async (usuarioId: number): Promise<void> => {
    await apiClient.delete(`/ubicaciones/compartidos/${usuarioId}`);
  },
};
