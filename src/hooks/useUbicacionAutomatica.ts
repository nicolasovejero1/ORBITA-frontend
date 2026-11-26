import * as Location from 'expo-location';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import { ubicacionesApi } from '@/api/ubicaciones';
import { useAuthStore } from '@/store/auth.store';
import {
  detenerUbicacionAutomatica,
  enviarUbicacion,
  estadoPermisos,
  INTERVALO_MS,
  iniciarUbicacionAutomatica,
  ubicacionPausada,
} from '@/tasks/ubicacion-automatica';

/**
 * Mantiene el envío automático de la ubicación del PCD: corre mientras haya
 * una sesión de PCD que comparta su ubicación con alguien. Sin permiso "todo
 * el tiempo", la manda solo con la app abierta. No pide permisos: eso se hace
 * desde la pantalla Ubicación, donde se explica para qué son.
 */
export function useUbicacionAutomatica() {
  const user = useAuthStore((s) => s.user);
  const esPcd = user?.tipoUsuario === 'PCD';
  const userId = user?.id;

  useEffect(() => {
    if (Platform.OS === 'web') return;
    if (!esPcd) {
      void detenerUbicacionAutomatica();
      return;
    }
    let cancelado = false;
    let watcher: Location.LocationSubscription | null = null;

    (async () => {
      try {
        // En pausa, el PCD eligió no enviar nada aunque tenga gente en la lista.
        if (userId !== undefined && (await ubicacionPausada(userId))) {
          await detenerUbicacionAutomatica();
          return;
        }
        const compartidos = await ubicacionesApi.getCompartidos();
        if (cancelado) return;
        // Si no la comparte con nadie, nadie la va a ver: no se manda.
        if (compartidos.length === 0) {
          await detenerUbicacionAutomatica();
          return;
        }
        if (await iniciarUbicacionAutomatica()) return;
        if ((await estadoPermisos()) === 'sin-permiso-fondo' && !cancelado) {
          watcher = await Location.watchPositionAsync(
            { accuracy: Location.Accuracy.Balanced, timeInterval: INTERVALO_MS, distanceInterval: 0 },
            (pos) => { void enviarUbicacion(pos).catch(() => {}); },
          );
        }
      } catch {
        // Sin conexión: se vuelve a intentar en el próximo inicio de sesión o al compartir.
      }
    })();

    return () => {
      cancelado = true;
      watcher?.remove();
    };
  }, [esPcd, userId]);
}
