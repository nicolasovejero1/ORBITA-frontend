export type EstadoReporte = 'EN_CURSO' | 'FINALIZADO';
export type TipoReporte = 'DE_ACTIVIDAD' | 'MENSUAL' | 'FINAL';
export type TipoAdjunto = 'PDF' | 'IMAGEN' | 'URL';

export interface ReporteAdjunto {
  id: number;
  tipoArchivo: TipoAdjunto;
  filePath: string;
}

export interface ReporteColaborador {
  profesionalId: number;
  reporteId: number;
  fechaAcceso: string;
  profesional: {
    usuario: { id: number; nombre: string; apellido: string };
  };
}

export interface Reporte {
  id: number;
  profesionalId: number;
  actividadId: number;
  instanciaId?: number;
  titulo: string;
  descripcionDetallada?: string;
  tipo: TipoReporte;
  estado: EstadoReporte;
  visibilidadTutor: boolean;
  createdAt: string;
  updatedAt: string;
  profesional: {
    usuario: { id: number; nombre: string; apellido: string };
  };
  actividad: {
    id: number;
    titulo: string;
    tipoActividad: string;
    pcdId: number;
  };
  instancia?: { id: number; fechaProgramada: string };
  adjuntos: ReporteAdjunto[];
  colaboradores: ReporteColaborador[];
}

export interface CreateReporteDto {
  actividadId: number;
  instanciaId?: number;
  titulo: string;
  descripcionDetallada?: string;
  tipo: TipoReporte;
}

export interface UpdateReporteDto {
  titulo?: string;
  descripcionDetallada?: string;
}

export interface ChangeEstadoReporteDto {
  estado: EstadoReporte;
  visibilidadTutor?: boolean;
}
