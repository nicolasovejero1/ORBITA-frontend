import * as Location from 'expo-location';
import { Platform } from 'react-native';

const cache = new Map<string, string | null>();

const clave = (lat: number, lon: number) => `${lat.toFixed(4)},${lon.toFixed(4)}`;

/** Arma "Calle 123, Barrio" con lo que devuelva el servicio de geocodificación del teléfono. */
export function formatearDireccion(d: Location.LocationGeocodedAddress): string | null {
  const calle = [d.street, d.streetNumber].filter(Boolean).join(' ') || d.name || null;
  const zona = d.district || d.subregion || d.city || null;
  const partes = [calle, zona].filter((p, i, todas) => p && todas.indexOf(p) === i);
  return partes.length > 0 ? partes.join(', ') : null;
}

/**
 * Dirección legible de una coordenada, o `null` si no se pudo averiguar. Usa el
 * servicio del propio teléfono (no hay geocodificación en la web). Recuerda las
 * respuestas para no repetir consultas del mismo lugar.
 */
export async function direccionDe(latitud: number, longitud: number): Promise<string | null> {
  if (Platform.OS === 'web') return null;
  const k = clave(latitud, longitud);
  if (cache.has(k)) return cache.get(k) ?? null;
  try {
    const [d] = await Location.reverseGeocodeAsync({ latitude: latitud, longitude: longitud });
    const texto = d ? formatearDireccion(d) : null;
    cache.set(k, texto);
    return texto;
  } catch {
    // Sin servicio o con límite de consultas: no se guarda, se reintenta más tarde.
    return null;
  }
}
