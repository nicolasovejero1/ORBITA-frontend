import { TipoUsuario } from '@/types/auth.types';

/**
 * Cómo se llama en la app a los PCD vinculados, según quién mira: para el
 * Tutor son "personas a cargo" y para el Profesional, "pacientes". En el
 * menú inferior va la versión corta, sin abreviaturas, para que entre en la
 * pestaña y se entienda (también con lector de pantalla).
 */
export function nombresPersonasACargo(tipo?: TipoUsuario | string) {
  return tipo === 'TUTOR'
    ? {
        titulo: 'Personas a cargo',
        pestania: 'A cargo',
        detalle: 'Persona a cargo',
        vacio: 'Sin personas a cargo',
        activos: 'Personas a cargo',
      }
    : {
        titulo: 'Mis pacientes',
        pestania: 'Pacientes',
        detalle: 'Paciente',
        vacio: 'Sin pacientes vinculados',
        activos: 'Pacientes activos',
      };
}
