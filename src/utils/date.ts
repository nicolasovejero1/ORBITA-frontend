/**
 * El backend manda fechas "date-only" (`fechaProgramada`, `fechaInicio`, `fechaFin`,
 * `fechaNacimiento`, siempre `YYYY-MM-DD`) separadas de los timestamps ISO completos
 * (`createdAt`, `canceledAt`, etc.). `new Date('YYYY-MM-DD')` las interpreta como
 * medianoche UTC, así que en cualquier huso horario negativo (todo el continente
 * americano) `toLocaleDateString()` puede mostrar el día anterior. Estas funciones
 * parsean/formatean el date-only en horario local para evitar ese corrimiento.
 */

export function parseFechaLocal(fecha: string): Date {
  const [y, m, d] = fecha.slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function formatFechaLocal(
  fecha: string,
  options?: Intl.DateTimeFormatOptions,
): string {
  return parseFechaLocal(fecha).toLocaleDateString('es-AR', options);
}

/** Fecha de hoy como date-only local (`YYYY-MM-DD`), sin pasar por UTC. */
export function hoyLocal(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
