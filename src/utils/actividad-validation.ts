import { FrecuenciaActividad, TipoActividad } from '@/types/actividad.types';

export interface CamposActividad {
  titulo: string;
  descripcion: string;
  pcdSeleccionado?: boolean;
  fechaInicio: string;
  fechaFin: string;
  horarioInicio: string;
  horarioFin: string;
  recordarActivo: boolean;
  recordarAntesMinutos: string;
  frecuencia: FrecuenciaActividad;
  diasSeleccionados: string[];
  tipo: TipoActividad;
  medicamentoSeleccionado: boolean;
  terapiaSeleccionada: boolean;
}

export type ErroresActividad = Partial<Record<
  'titulo' | 'descripcion' | 'pcd' | 'fechaInicio' | 'fechaFin' | 'horario' | 'recordar' | 'dias' | 'medicamento' | 'terapia',
  string
>>;

const FECHA_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Mismas reglas que el backend (CreateActividadDto / validarFechas), para
 * avisar en el campo antes de mandar el formulario. `pcdSeleccionado` se omite
 * al editar, porque el PCD no se puede cambiar.
 */
export function validarActividad(c: CamposActividad): ErroresActividad {
  const e: ErroresActividad = {};
  if (c.titulo.trim().length < 2) e.titulo = 'El título es obligatorio (mínimo 2 caracteres)';
  if (c.descripcion.trim().length < 2) e.descripcion = 'La descripción es obligatoria (mínimo 2 caracteres)';
  if (c.pcdSeleccionado === false) e.pcd = 'Seleccioná el PCD';
  if (!FECHA_RE.test(c.fechaInicio)) e.fechaInicio = 'Elegí la fecha de inicio';
  if (!FECHA_RE.test(c.fechaFin)) e.fechaFin = 'Elegí la fecha de fin';
  else if (FECHA_RE.test(c.fechaInicio) && c.fechaFin <= c.fechaInicio)
    e.fechaFin = 'La fecha de fin debe ser posterior a la de inicio';
  const hi = c.horarioInicio.slice(0, 5);
  const hf = c.horarioFin.slice(0, 5);
  if (hi && hf && hf <= hi) e.horario = 'El horario de fin debe ser posterior al de inicio';
  // El recordatorio se calcula desde el horario de inicio: sin horario saldría a la medianoche.
  if (c.recordarActivo) {
    if (!/^\d+$/.test(c.recordarAntesMinutos.trim())) e.recordar = 'Ingresá cuántos minutos antes avisar';
    else if (!hi) e.recordar = 'Para enviar el recordatorio elegí el horario de inicio';
  }
  if (c.frecuencia === 'DIAS_ESPECIFICOS' && c.diasSeleccionados.length === 0)
    e.dias = 'Seleccioná al menos un día';
  if (c.tipo === 'MEDICAMENTO' && !c.medicamentoSeleccionado) e.medicamento = 'Seleccioná un medicamento';
  if (c.tipo === 'TERAPIA' && !c.terapiaSeleccionada) e.terapia = 'Seleccioná una terapia';
  return e;
}

/** Día siguiente a `fecha` ("YYYY-MM-DD"), para que la fecha de fin no pueda ser anterior ni igual a la de inicio. */
export function diaSiguiente(fecha: string): string | undefined {
  if (!FECHA_RE.test(fecha)) return undefined;
  const [y, m, d] = fecha.split('-').map(Number);
  const sig = new Date(y, m - 1, d + 1);
  const mm = String(sig.getMonth() + 1).padStart(2, '0');
  const dd = String(sig.getDate()).padStart(2, '0');
  return `${sig.getFullYear()}-${mm}-${dd}`;
}
