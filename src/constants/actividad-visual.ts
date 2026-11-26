import type { Ionicons } from '@expo/vector-icons';
import type { FrecuenciaActividad, TipoActividad } from '@/types/actividad.types';

/** Ícono y colores de cada tipo de actividad, compartidos por la lista y el detalle. */
export const TIPO_VISUAL: Record<TipoActividad, { label: string; icon: keyof typeof Ionicons.glyphMap; bg: string; fg: string }> = {
  EJERCICIO: { label: 'Ejercicio', icon: 'barbell-outline', bg: '#CCFBF1', fg: '#0F766E' },
  MEDICAMENTO: { label: 'Medicamento', icon: 'medkit-outline', bg: '#FEF3C7', fg: '#B45309' },
  TERAPIA: { label: 'Terapia', icon: 'pulse-outline', bg: '#EEF2FF', fg: '#4338CA' },
  PERSONALIZADA: { label: 'Personalizada', icon: 'star-outline', bg: '#FCE7F3', fg: '#BE185D' },
};

export const FRECUENCIA_LABEL: Record<FrecuenciaActividad, string> = {
  DIARIA: 'Diaria',
  SEMANAL: 'Semanal',
  MENSUAL: 'Mensual',
  DIAS_ESPECIFICOS: 'Días específicos',
};
