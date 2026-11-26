export type EstadoNotificacion = 'PENDIENTE' | 'ENVIADA' | 'LEIDA';
export type FiltroNotificacion = 'TODAS' | 'NO_LEIDA' | 'LEIDA';

export interface Notificacion {
  id: number;
  usuarioId: number;
  tipo: string;
  mensaje: string;
  estado: EstadoNotificacion;
  leidaAt?: string;
  actividadId?: number;
  createdAt: string;
  actividad?: {
    id: number;
    titulo: string;
    tipoActividad: string;
    pcdId: number;
  };
}

export interface CreateNotificacionDto {
  usuarioId: number;
  tipo: string;
  mensaje: string;
  actividadId?: number;
}

export interface NotificacionesPage {
  items: Notificacion[];
  hasMore: boolean;
}
