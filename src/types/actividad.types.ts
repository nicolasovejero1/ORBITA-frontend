export type TipoActividad = 'EJERCICIO' | 'MEDICAMENTO' | 'TERAPIA' | 'PERSONALIZADA';
export type FrecuenciaActividad = 'DIARIA' | 'SEMANAL' | 'MENSUAL' | 'DIAS_ESPECIFICOS';
export type EstadoActividad = 'PENDIENTE' | 'COMPLETADA';
export type EstadoInstancia = 'PENDIENTE' | 'REALIZADA' | 'CANCELADA';

export const DIAS_SEMANA = ['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO', 'DOMINGO'] as const;

export interface ActividadMedicamento {
  medicamentoId: number;
  dosis?: string;
  frecuencia?: string;
  duracionTratamiento?: string;
  indicacion?: string;
  medicoPrescriptor?: string;
  medicamento: { id: number; nombre: string; presentacion?: string };
}

export interface Actividad {
  id: number;
  titulo: string;
  descripcion: string;
  fechaInicio: string;
  fechaFin: string;
  horarioInicio?: string;
  horarioFin?: string;
  observaciones?: string;
  estado: EstadoActividad;
  tipoActividad: TipoActividad;
  frecuencia: FrecuenciaActividad;
  diasSemana?: string[];
  recordarAntesMinutos?: number | null;
  pcdId: number;
  creadoPorUserId: number;
  createdAt: string;
  pcd: { userId: number; usuario: { nombre: string; apellido: string } };
  creadoPor: { nombre: string; apellido: string };
  medicamentos?: ActividadMedicamento[];
  terapia?: { terapiaId: number; terapia: { tipo: string; descripcion: string } };
  instancias?: ActividadInstancia[];
}

export interface ActividadInstancia {
  id: number;
  actividadId: number;
  fechaProgramada: string;
  estado: EstadoInstancia;
  confirmedAt?: string;
  confirmedBy?: { nombre: string; apellido: string };
}

export interface CreateActividadDto {
  titulo: string;
  descripcion: string;
  fechaInicio: string;
  fechaFin: string;
  horarioInicio?: string;
  horarioFin?: string;
  observaciones?: string;
  tipoActividad: TipoActividad;
  frecuencia: FrecuenciaActividad;
  diasSemana?: string[];
  recordarAntesMinutos?: number | null;
  pcdId: number;
  medicamentos?: {
    medicamentoId: number;
    dosis?: string;
    frecuencia?: string;
    duracionTratamiento?: string;
    indicacion?: string;
    medicoPrescriptor?: string;
  }[];
  terapiaId?: number;
}
