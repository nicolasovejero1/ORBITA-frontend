import { Ubicacion } from '@/types/ubicacion.types';

/** Distancia (m) hasta la cual dos registros seguidos se consideran "el mismo lugar". */
export const RADIO_ESTADIA_M = 100;

/** Un tramo en el que la persona estuvo en el mismo lugar. */
export interface Estadia {
  /** Id del primer registro del tramo (clave estable para la lista). */
  id: number;
  latitud: number;
  longitud: number;
  /** Primer y último registro del tramo (ISO). */
  desde: string;
  hasta: string;
  /** Cuántos registros se juntaron. */
  registros: number;
}

/** Distancia en metros entre dos coordenadas (fórmula del haversine). */
export function distanciaMetros(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6_371_000;
  const rad = (g: number) => (g * Math.PI) / 180;
  const dLat = rad(lat2 - lat1);
  const dLon = rad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
}

/**
 * Junta los registros (de la más nueva a la más vieja, como los manda la API)
 * en tramos "estuvo en este lugar de X a Y". Un registro se suma al tramo
 * mientras esté a menos de `RADIO_ESTADIA_M` del primero del tramo. Devuelve
 * los tramos de más nuevo a más viejo.
 */
export function agruparEstadias(registros: Ubicacion[], radio = RADIO_ESTADIA_M): Estadia[] {
  const cronologicos = [...registros].sort(
    (a, b) => new Date(a.fechaHora).getTime() - new Date(b.fechaHora).getTime() || a.id - b.id,
  );
  const tramos: Estadia[] = [];
  for (const r of cronologicos) {
    const actual = tramos[tramos.length - 1];
    if (actual && distanciaMetros(actual.latitud, actual.longitud, r.latitud, r.longitud) <= radio) {
      actual.hasta = r.fechaHora;
      actual.registros += 1;
    } else {
      tramos.push({
        id: r.id, latitud: r.latitud, longitud: r.longitud,
        desde: r.fechaHora, hasta: r.fechaHora, registros: 1,
      });
    }
  }
  return tramos.reverse();
}

/** "45 min", "1 h" o "1 h 15 min" para un tramo; vacío si fue un solo registro. */
export function formatearDuracion(desde: string, hasta: string): string {
  const minutos = Math.round((new Date(hasta).getTime() - new Date(desde).getTime()) / 60_000);
  if (minutos < 1) return '';
  if (minutos < 60) return `${minutos} min`;
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}
